import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { HashAlgorithm } from 'hasha';
export type ClientConfig = {
    key?: string;
    secret?: string;
};
export type ExpandPluginConfig = Partial<PutObjectCommandInput> & PluginConfig & Record<string, any>;
export type PluginConfig = {
    charset?: string;
    etagHash?: HashAlgorithm;
    uploadNewFilesOnly?: boolean;
    maps?: Record<keyof ExpandPluginConfig, (keyname: string) => string>;
    keyTransform?: (keyname: string) => string;
    onNoChange?: (keyname: string) => void;
    onChange?: (keyname: string) => void;
    onNew?: (keyname: string) => void;
};
