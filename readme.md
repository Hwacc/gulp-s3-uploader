# gulp-s3-uploader

__Version 1.0.5__

Insprired by [gulp-s3-upload](https://github.com/clineamb/gulp-s3-upload/tree/master) use for uploading assets to Amazon S3 servers with v3 api.

## Install 

npm install gulp-s3-uploader

## Usage

Use same options as [gulp-s3-upload](https://github.com/clineamb/gulp-s3-upload/tree/master) but simplified.


```js
import gulp from 'gulp';
import s3 from 'gulp-s3-uploader';
```
or in commonjs 

```js
const gulp = require('gulp');
const s3 = require('gulp-s3-uploader');
```

create client instance:

```js
const s3Client = s3(clientConfig: ClientConfig);

type ClientConfig = Partial<S3ClientConfig> & {
  key?: string; // shot of accessKeyId
  secret?: string; // shot of secretAccessKey
  accessKeyId?: string; // your access key
  secretAccessKey?: string; // your secret key
}

```
see `S3ClientConfig` at [S3Client Configuration](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)


then use it in gulp:

```js
gulp.src('src/**/*')
  .pipe(s3Client(pluginConfig: PluginConfig))
  .pipe(...)

type PluginConfig = Partial<PutObjectCommandInput> & {
    // the chartset added to mime type, then pass to Content-Type  default: 'utf8'
    charset?: string;
    // the etag hash algorithm to hasha, default: 'md5'
    etagHash?: hasha.AlgorithmName;
    // if true, will not upload if there is no change
    uploadNewFilesOnly?: boolean;
    // this function could fix the PluginConfig params by keyname during runtime
    maps?: Record<keyof PluginConfig, (keyname: string) => string>;
    // transform each keyname before upload
    keyTransform?: (keyname: string) => string;
    // no change callback
    onNoChange?: (keyname: string) => void;
    // change callback
    onChange?: (keyname: string) => void;
    // new file callback
    onNew?: (keyname: string) => void;
} & Record<string, any>

```

see `PutObjectCommandInput` at [PutObjectCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/)


## License

MIT