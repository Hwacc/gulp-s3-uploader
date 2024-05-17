import { gulpPlugin } from 'gulp-plugin-extras';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ProxyAgent } from 'proxy-agent';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { hash } from 'hasha';
import fancyLog from 'fancy-log';
import colors from 'ansi-colors';
import pkg from 'lodash';
import mime from 'mime';
import path from 'node:path';

const { each, isEmpty, isFunction, isNil } = pkg;
function gulpS3Uploader(s3ClientConfig = {}) {
    const clientConfig = { ...s3ClientConfig };
    if (!clientConfig.region)
        clientConfig.region = 'us-east-1';
    if (clientConfig.key && clientConfig.secret) {
        clientConfig.credentials = {
            accessKeyId: clientConfig.key,
            secretAccessKey: clientConfig.secret,
        };
    }
    if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
        const agent = new ProxyAgent();
        clientConfig.requestHandler = new NodeHttpHandler({
            httpAgent: agent,
            httpsAgent: agent,
        });
    }
    const client = new S3Client(clientConfig);
    return (configs = {}) => {
        return gulpPlugin('gulp-s3-uploader', async (file) => {
            if (file.isNull())
                return file;
            let keyname = file.relative;
            if (configs.keyTransform) {
                keyname = configs.keyTransform(keyname);
            }
            else {
                // build name
                keyname = path.join(path.dirname(keyname), path.basename(keyname, path.extname(keyname)) + path.extname(keyname));
            }
            keyname = keyname.replace(/\\/g, '/');
            // fix configs parmas by keyname in runtime
            if (!isNil(configs.maps)) {
                each(configs.maps, function (mapRoutine, param_name) {
                    if (isFunction(mapRoutine)) {
                        configs[param_name] = mapRoutine(keyname);
                    }
                });
            }
            let mimeType = mime.getType(keyname) || '';
            if (configs.charset) {
                mimeType += ';charset=' + configs.charset;
            }
            let headerRes = {};
            try {
                headerRes = (await client.send(new HeadObjectCommand({ Bucket: configs.Bucket, Key: keyname })));
            }
            catch (error) {
                if (error.$metadata &&
                    !(error.$metadata.httpStatusCode === 404 || error.$metadata.httpStatusCode === 403)) {
                    throw new Error('S3 headObject Error');
                }
            }
            const serverHash = headerRes.ETag || '';
            let localHash = await hash(file.contents, { algorithm: configs.etagHash || 'md5' });
            localHash = `"${localHash}"`;
            if (serverHash && serverHash === localHash) {
                // no change
                fancyLog(colors.gray('No Change ..... '), keyname);
                isFunction(configs.onNoChange) && configs.onNoChange.call(this, keyname);
                return file;
            }
            else {
                if (mimeType) {
                    configs.ContentType = configs.ContentType || mimeType;
                }
                if ((configs.uploadNewFilesOnly && isEmpty(headerRes)) || !configs.uploadNewFilesOnly) {
                    if (file.stat) {
                        configs.ContentLength = file.stat?.size || configs.ContentLength;
                    }
                    fancyLog(colors.cyan('Uploading ..... '), keyname);
                    const putRes = (await client.send(new PutObjectCommand({
                        ...configs,
                        Key: keyname,
                        Body: file.contents,
                    })));
                    if (serverHash !== putRes.ETag) {
                        fancyLog(colors.yellow('Updated ....... '), keyname);
                        isFunction(configs.onChange) && configs.onChange.call(this, keyname);
                    }
                    else {
                        fancyLog(colors.gray('No Change ..... '), keyname);
                        isFunction(configs.onNoChange) && configs.onNoChange.call(this, keyname);
                    }
                }
                else {
                    fancyLog(colors.green('Uploaded! ..... '), keyname);
                    isFunction(configs.onNew) && configs.onNew.call(this, keyname);
                    return file;
                }
            }
            return file;
        });
    };
}

export { gulpS3Uploader as default };
