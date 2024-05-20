
import s3Uploader from './lib/index.js';
import Vinyl from 'vinyl';
import { expect } from 'chai';

describe('gulp-s3-uploader', () => {

  it('should work in generate', () => {
    const client = s3Uploader({
      key: 'key',
      secret: 'secret',
    })
    const stream = client();
    expect(stream).to.have.property('write');
  })

  it('should work in buffer mode', () => {
    const client = s3Uploader({
      key: 'S3_accessKeyId',
      secret: 'S3_secretAccessKey',
    })
    const stream = client({
      Bucket: 'Bucket',
      ACL: 'public-read',
      keyTransform: function (filename) {
        return `staging/assets/${filename}`
      },
    });
    const fakeBuffer = Buffer.from('hello world', 'utf8');
    const fakeFile = new Vinyl({
      cwd: '/',
      base: '/test/',
      path: '/test/test.txt',
      contents: fakeBuffer,
    });
    const fakeBuffer2 = Buffer.from('hello again', 'utf8');
    const fakeFile2 = new Vinyl({
      cwd: '/',
      base: '/test/',
      path: '/test/test1.txt',
      contents: fakeBuffer2,
    });
    stream.write(fakeFile);
    stream.write(fakeFile2);
    stream.end();
  });

})