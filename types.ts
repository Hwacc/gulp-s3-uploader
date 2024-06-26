import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import hasha from 'hasha';

export type ClientConfig = {
  key?: string; // shortcut of accessKeyId
  secret?: string; // shortcut of secretAccessKey
  accessKeyId?: string;
  secretAccessKey?: string;
};

export type ExpandPluginConfig = Partial<PutObjectCommandInput> &
  PluginConfig &
  Record<string, any>;

export type PluginConfig = {
  charset?: string;
  etagHash?: hasha.AlgorithmName;
  uploadNewFilesOnly?: boolean;
  maps?: Record<keyof ExpandPluginConfig, (keyname: string) => any>;
  keyTransform?: (keyname: string) => string;
  onNoChange?: (keyname: string) => void;
  onChange?: (keyname: string) => void;
  onNew?: (keyname: string) => void;
};
