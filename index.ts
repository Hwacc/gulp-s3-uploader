import type { ClientConfig, ExpandPluginConfig } from './types'
import {
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3'
import { MetadataBearer } from '@aws-sdk/types'
import { ProxyAgent } from 'proxy-agent'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import hasha from 'hasha'
import fancyLog from 'fancy-log'
import colors from 'ansi-colors'
import pkg from 'lodash'
import mime from 'mime'
import path from 'node:path'
import es from 'event-stream'
import PluginError from 'plugin-error'
import { BufferFile } from 'vinyl'

const { each, isEmpty, isFunction, isNil } = pkg

export default function gulpS3Uploader(
  this: any,
  s3ClientConfig: Partial<S3ClientConfig> & ClientConfig = {}
) {
  const clientConfig = { ...s3ClientConfig }

  if (!clientConfig.region) clientConfig.region = 'us-east-1'

  const _accessKeyId = clientConfig.accessKeyId || clientConfig.key
  const _secretAccessKey = clientConfig.secretAccessKey || clientConfig.secret
  if (_accessKeyId && _secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: _accessKeyId,
      secretAccessKey: _secretAccessKey,
    }
  }

  if (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.https_proxy
  ) {
    const agent = new ProxyAgent()
    clientConfig.requestHandler = new NodeHttpHandler({
      httpAgent: agent,
      httpsAgent: agent,
    })
  }

  const client = new S3Client(clientConfig as S3ClientConfig)

  return (configs: ExpandPluginConfig = {}) => {
    const pName = 'gulp-s3-uploader'
    const mapStream = async (
      file: BufferFile,
      callback: (err?: any, newData?: BufferFile | null) => void
    ) => {
      if (file.isNull()) return callback()

      const confs = { ...configs } // fix: new obj of configs

      let keyname = file.relative
      if (confs.keyTransform) {
        keyname = confs.keyTransform(keyname)
      } else {
        // build name
        keyname = path.join(
          path.dirname(keyname),
          path.basename(keyname, path.extname(keyname)) + path.extname(keyname)
        )
      }
      keyname = keyname.replace(/\\/g, '/')

      // fix confs parmas by keyname in runtime
      if (!isNil(confs.maps)) {
        each(confs.maps, function (mapRoutine, param_name) {
          if (isFunction(mapRoutine)) {
            confs[param_name] = mapRoutine(keyname)
          }
        })
      }

      let mimeType = mime.getType(keyname) || ''
      if (confs.charset) {
        mimeType += ';charset=' + confs.charset
      }

      let headerRes = {} as MetadataBearer & { ETag: string }
      try {
        headerRes = (await client.send(
          new HeadObjectCommand({ Bucket: confs.Bucket, Key: keyname })
        )) as MetadataBearer & { ETag: string }
      } catch (error: any) {
        if (
          error.$metadata &&
          !(
            error.$metadata.httpStatusCode === 404 ||
            error.$metadata.httpStatusCode === 403
          )
        ) {
          return callback(new PluginError(pName, error, { showStack: true }))
        }
      }

      const serverHash = headerRes.ETag || ''
      let localHash = await hasha.async(file.contents, {
        algorithm: confs.etagHash || 'md5',
      })
      localHash = `"${localHash}"`

      if (serverHash && serverHash === localHash) {
        // no change
        fancyLog(colors.gray('No Change ..... '), keyname)
        isFunction(confs.onNoChange) && confs.onNoChange.call(this, keyname)
        return callback(null, file)
      } else {
        if (mimeType) {
          confs.ContentType = confs.ContentType || mimeType
        }

        if (
          (confs.uploadNewFilesOnly && isEmpty(headerRes)) ||
          !confs.uploadNewFilesOnly
        ) {
          if (file.stat) {
            confs.ContentLength = file.stat?.size || confs.ContentLength
          }

          fancyLog(colors.cyan('Uploading ..... '), keyname)

          let putRes = {} as MetadataBearer & { ETag: string }
          try {
            putRes = (await client.send(
              new PutObjectCommand({
                ...confs,
                Key: keyname,
                Body: file.contents,
              } as PutObjectCommandInput)
            )) as MetadataBearer & { ETag: string }
          } catch (error: any) {
            return callback(
              new PluginError(pName, error, {
                showStack: true,
              })
            )
          }

          if (!isEmpty(headerRes)) {
            if (serverHash !== putRes.ETag) {
              fancyLog(colors.yellow('Updated ....... '), keyname)
              isFunction(confs.onChange) && confs.onChange.call(this, keyname)
            } else {
              fancyLog(colors.gray('No Change ..... '), keyname)
              isFunction(confs.onNoChange) &&
                confs.onNoChange.call(this, keyname)
            }
          } else {
            fancyLog(colors.green('Uploaded! ..... '), keyname)
            isFunction(confs.onNew) && confs.onNew.call(this, keyname)
          }
          return callback(null, file)
        } else {
          fancyLog(
            colors.gray('Skipping Upload of Existing File ..... '),
            keyname
          )
          return callback(null, file)
        }
      }
    }

    return es.map(mapStream)
  }
}
