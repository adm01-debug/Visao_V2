/**
 * AWS Integration Service
 * Core AWS services wrapper
 */

export interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface S3UploadOptions {
  bucket: string;
  key: string;
  body: Blob | Buffer | string;
  contentType?: string;
  acl?: 'private' | 'public-read' | 'public-read-write';
  metadata?: Record<string, string>;
  expiresIn?: number;
}

export interface S3GetSignedUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number;
  operation?: 'getObject' | 'putObject';
}

export interface RekognitionFaceMatch {
  similarity: number;
  face: {
    faceId: string;
    boundingBox: { width: number; height: number; left: number; top: number };
    confidence: number;
  };
}

export interface RekognitionLabel {
  name: string;
  confidence: number;
  instances?: Array<{
    boundingBox: { width: number; height: number; left: number; top: number };
    confidence: number;
  }>;
}

export interface KinesisVideoStream {
  streamName: string;
  streamARN: string;
  dataEndpoint?: string;
}

class AwsService {
  private config: AwsConfig | null = null;
  private s3Client: unknown = null;
  private rekognitionClient: unknown = null;
  private kinesisVideoClient: unknown = null;

  /**
   * Initialize AWS
   */
  async initialize(config: AwsConfig): Promise<void> {
    this.config = config;
      }

  /**
   * Get S3 client
   */
  private async getS3Client(): Promise<unknown> {
    if (this.s3Client) return this.s3Client;
    
    if (!this.config) {
      throw new Error('AWS not initialized');
    }

    const { S3Client } = await import('@aws-sdk/client-s3');
    
    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });

    return this.s3Client;
  }

  /**
   * Upload file to S3
   */
  async s3Upload(options: S3UploadOptions): Promise<{ url: string; key: string }> {
    const client = await this.getS3Client();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      ACL: options.acl,
      Metadata: options.metadata,
    });

    await (client as { send: (cmd: unknown) => Promise<void> }).send(command);

    const url = `https://${options.bucket}.s3.${this.config!.region}.amazonaws.com/${options.key}`;
    
    return { url, key: options.key };
  }

  /**
   * Download file from S3
   */
  async s3Download(bucket: string, key: string): Promise<Blob> {
    const client = await this.getS3Client();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ Body: { transformToByteArray: () => Promise<Uint8Array> } }> }).send(command);
    const bytes = await response.Body.transformToByteArray();
    
    return new Blob([bytes]);
  }

  /**
   * Delete file from S3
   */
  async s3Delete(bucket: string, key: string): Promise<boolean> {
    const client = await this.getS3Client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await (client as { send: (cmd: unknown) => Promise<void> }).send(command);
    return true;
  }

  /**
   * Generate presigned URL
   */
  async s3GetSignedUrl(options: S3GetSignedUrlOptions): Promise<string> {
    const client = await this.getS3Client();
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const Command = options.operation === 'putObject' ? PutObjectCommand : GetObjectCommand;
    
    const command = new Command({
      Bucket: options.bucket,
      Key: options.key,
    });

    const url = await getSignedUrl(client as never, command as never, {
      expiresIn: options.expiresIn || 3600,
    });

    return url;
  }

  /**
   * List S3 objects
   */
  async s3List(bucket: string, prefix?: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const client = await this.getS3Client();
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ Contents?: Array<{ Key: string; Size: number; LastModified: Date }> }> }).send(command);
    
    return (response.Contents || []).map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
  }

  /**
   * Get Rekognition client
   */
  private async getRekognitionClient(): Promise<unknown> {
    if (this.rekognitionClient) return this.rekognitionClient;
    
    if (!this.config) {
      throw new Error('AWS not initialized');
    }

    const { RekognitionClient } = await import('@aws-sdk/client-rekognition');
    
    this.rekognitionClient = new RekognitionClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });

    return this.rekognitionClient;
  }

  /**
   * Detect faces in image
   */
  async detectFaces(imageBytes: Uint8Array): Promise<Array<{ boundingBox: object; confidence: number; emotions?: object[] }>> {
    const client = await this.getRekognitionClient();
    const { DetectFacesCommand } = await import('@aws-sdk/client-rekognition');

    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ['ALL'],
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ FaceDetails?: unknown[] }> }).send(command);
    
    return (response.FaceDetails || []).map((face: unknown) => {
      const f = face as { BoundingBox: object; Confidence: number; Emotions?: object[] };
      return {
        boundingBox: f.BoundingBox,
        confidence: f.Confidence,
        emotions: f.Emotions,
      };
    });
  }

  /**
   * Detect labels in image
   */
  async detectLabels(imageBytes: Uint8Array, maxLabels = 10): Promise<RekognitionLabel[]> {
    const client = await this.getRekognitionClient();
    const { DetectLabelsCommand } = await import('@aws-sdk/client-rekognition');

    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: maxLabels,
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ Labels?: unknown[] }> }).send(command);
    
    return (response.Labels || []).map((label: unknown) => {
      const l = label as { Name: string; Confidence: number; Instances?: unknown[] };
      return {
        name: l.Name,
        confidence: l.Confidence,
        instances: l.Instances?.map((i: unknown) => {
          const inst = i as { BoundingBox: object; Confidence: number };
          return {
            boundingBox: inst.BoundingBox as { width: number; height: number; left: number; top: number },
            confidence: inst.Confidence,
          };
        }),
      };
    });
  }

  /**
   * Search faces by image
   */
  async searchFacesByImage(
    collectionId: string,
    imageBytes: Uint8Array,
    threshold = 80
  ): Promise<RekognitionFaceMatch[]> {
    const client = await this.getRekognitionClient();
    const { SearchFacesByImageCommand } = await import('@aws-sdk/client-rekognition');

    const command = new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBytes },
      FaceMatchThreshold: threshold,
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ FaceMatches?: unknown[] }> }).send(command);
    
    return (response.FaceMatches || []).map((match: unknown) => {
      const m = match as { Similarity: number; Face: { FaceId: string; BoundingBox: object; Confidence: number } };
      return {
        similarity: m.Similarity,
        face: {
          faceId: m.Face.FaceId,
          boundingBox: m.Face.BoundingBox as { width: number; height: number; left: number; top: number },
          confidence: m.Face.Confidence,
        },
      };
    });
  }

  /**
   * Get Kinesis Video client
   */
  private async getKinesisVideoClient(): Promise<unknown> {
    if (this.kinesisVideoClient) return this.kinesisVideoClient;
    
    if (!this.config) {
      throw new Error('AWS not initialized');
    }

    const { KinesisVideoClient } = await import('@aws-sdk/client-kinesis-video');
    
    this.kinesisVideoClient = new KinesisVideoClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });

    return this.kinesisVideoClient;
  }

  /**
   * Create Kinesis Video stream
   */
  async createVideoStream(streamName: string): Promise<KinesisVideoStream> {
    const client = await this.getKinesisVideoClient();
    const { CreateStreamCommand } = await import('@aws-sdk/client-kinesis-video');

    const command = new CreateStreamCommand({
      StreamName: streamName,
      DataRetentionInHours: 24,
      MediaType: 'video/h264',
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ StreamARN: string }> }).send(command);
    
    return {
      streamName,
      streamARN: response.StreamARN,
    };
  }

  /**
   * Get Kinesis Video stream endpoint
   */
  async getVideoStreamEndpoint(streamName: string, apiName: 'GET_MEDIA' | 'PUT_MEDIA' | 'GET_HLS_STREAMING_SESSION_URL'): Promise<string> {
    const client = await this.getKinesisVideoClient();
    const { GetDataEndpointCommand } = await import('@aws-sdk/client-kinesis-video');

    const command = new GetDataEndpointCommand({
      StreamName: streamName,
      APIName: apiName,
    });

    const response = await (client as { send: (cmd: unknown) => Promise<{ DataEndpoint: string }> }).send(command);
    return response.DataEndpoint;
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Get current region
   */
  get region(): string | null {
    return this.config?.region || null;
  }
}

// Singleton instance
export const awsService = new AwsService();

export default AwsService;
