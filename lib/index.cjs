'use strict';

var clientS3 = require('@aws-sdk/client-s3');
var proxyAgent = require('proxy-agent');
var nodeHttpHandler = require('@smithy/node-http-handler');
var hasha = require('hasha');
var fancyLog = require('fancy-log');
var colors = require('ansi-colors');
var pkg = require('lodash');
var mime = require('mime');
var path = require('node:path');
var es = require('event-stream');
var PluginError = require('plugin-error');

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
        const agent = new proxyAgent.ProxyAgent();
        clientConfig.requestHandler = new nodeHttpHandler.NodeHttpHandler({
            httpAgent: agent,
            httpsAgent: agent,
        });
    }
    const client = new clientS3.S3Client(clientConfig);
    return (configs = {}) => {
        const pName = 'gulp-s3-uploader';
        const mapStream = async (file, callback) => {
            if (file.isNull())
                return callback();
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
                headerRes = (await client.send(new clientS3.HeadObjectCommand({ Bucket: configs.Bucket, Key: keyname })));
            }
            catch (error) {
                if (error.$metadata &&
                    !(error.$metadata.httpStatusCode === 404 || error.$metadata.httpStatusCode === 403)) {
                    return callback(new PluginError(pName, new Error('S3 headObject Error'), { showStack: true }));
                }
            }
            const serverHash = headerRes.ETag || '';
            let localHash = await hasha.hash(file.contents, { algorithm: configs.etagHash || 'md5' });
            localHash = `"${localHash}"`;
            if (serverHash && serverHash === localHash) {
                // no change
                fancyLog(colors.gray('No Change ..... '), keyname);
                isFunction(configs.onNoChange) && configs.onNoChange.call(this, keyname);
                return callback(null, file);
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
                    let putRes = {};
                    try {
                        putRes = (await client.send(new clientS3.PutObjectCommand({
                            ...configs,
                            Key: keyname,
                            Body: file.contents,
                        })));
                    }
                    catch (error) {
                        return callback(new PluginError(pName, new Error('S3 putObject Error: ' + error), {
                            showStack: true,
                        }));
                    }
                    if (!isEmpty(headerRes)) {
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
                    }
                    return callback(null, file);
                }
                else {
                    fancyLog(colors.gray('Skipping Upload of Existing File ..... '), keyname);
                    return callback(null, file);
                }
            }
        };
        return es.map(mapStream);
    };
}

module.exports = gulpS3Uploader;
