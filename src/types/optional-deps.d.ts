/**
 * Type declarations for optional dependencies
 * These packages are dynamically imported and may not be installed
 */

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class DeleteObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class ListObjectsV2Command {
    constructor(input: Record<string, unknown>);
  }
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(
    client: unknown,
    command: unknown,
    options?: Record<string, unknown>
  ): Promise<string>;
}

declare module '@aws-sdk/client-rekognition' {
  export class RekognitionClient {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class DetectFacesCommand {
    constructor(input: Record<string, unknown>);
  }
  export class DetectLabelsCommand {
    constructor(input: Record<string, unknown>);
  }
  export class SearchFacesByImageCommand {
    constructor(input: Record<string, unknown>);
  }
}

declare module '@aws-sdk/client-kinesis-video' {
  export class KinesisVideoClient {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class CreateStreamCommand {
    constructor(input: Record<string, unknown>);
  }
  export class GetDataEndpointCommand {
    constructor(input: Record<string, unknown>);
  }
}

declare module '@azure/storage-blob' {
  export class BlobServiceClient {
    constructor(url: string, credential: unknown);
    getContainerClient(name: string): unknown;
  }
  export class StorageSharedKeyCredential {
    constructor(accountName: string, accountKey: string);
  }
  export function generateBlobSASQueryParameters(
    options: Record<string, unknown>,
    credential: unknown
  ): { toString(): string };
  export class BlobSASPermissions {
    static parse(permissions: string): unknown;
  }
}

declare module '@ffmpeg/ffmpeg' {
  export class FFmpeg {
    on(event: string, callback: (data: Record<string, unknown>) => void): void;
    load(config: Record<string, unknown>): Promise<void>;
    writeFile(name: string, data: unknown): Promise<void>;
    readFile(name: string): Promise<Uint8Array>;
    deleteFile(name: string): Promise<void>;
    exec(args: string[]): Promise<void>;
    terminate(): void;
  }
}

declare module '@ffmpeg/util' {
  export function fetchFile(file: File | Blob | string): Promise<Uint8Array>;
  export function toBlobURL(url: string, mimeType: string): Promise<string>;
}

declare module 'firebase/app' {
  export function initializeApp(config: Record<string, unknown>): unknown;
  export function getApps(): unknown[];
  export function getApp(): unknown;
}

declare module 'firebase/messaging' {
  export function getMessaging(app: unknown): unknown;
  export function getToken(messaging: unknown, options?: Record<string, unknown>): Promise<string>;
  export function onMessage(
    messaging: unknown,
    callback: (payload: Record<string, unknown>) => void
  ): () => void;
  export function isSupported(): Promise<boolean>;
}
