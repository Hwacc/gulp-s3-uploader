
import s3Uploader from './dist/index.js';
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
      key: 'S3Key',
      secret: 'S3Secret',
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
    stream.write(fakeFile);
    stream.end();
  });

})