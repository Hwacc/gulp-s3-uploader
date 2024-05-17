import type { ClientConfig, ExpandPluginConfig } from './types';
import { S3ClientConfig } from '@aws-sdk/client-s3';
import es from 'event-stream';
export default function gulpS3Uploader(this: any, s3ClientConfig?: Partial<S3ClientConfig> & ClientConfig): (configs?: ExpandPluginConfig) => es.MapStream;
