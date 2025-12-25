/**
 * S3 Compatible Storage Integration
 * Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 */

export interface S3Config {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

class S3Service {
  private config: S3Config | null = null;

  initialize(config: S3Config): void {
    this.config = config;
    console.log('[S3] Service initialized');
  }

  private getEndpoint(): string {
    if (this.config?.endpoint) return this.config.endpoint;
    return `https://s3.${this.config?.region}.amazonaws.com`;
  }

  async upload(key: string, body: Blob | Buffer, contentType?: string): Promise<UploadResult> {
    if (!this.config) throw new Error('S3 not initialized');

    const endpoint = this.config.forcePathStyle
      ? `${this.getEndpoint()}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'x-amz-acl': 'private',
      },
      body,
    });

    if (!response.ok) throw new Error(`S3 upload failed: ${response.statusText}`);

    return {
      key,
      url: endpoint,
      etag: response.headers.get('ETag') || undefined,
    };
  }

  async download(key: string): Promise<Blob> {
    if (!this.config) throw new Error('S3 not initialized');

    const endpoint = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) throw new Error(`S3 download failed: ${response.statusText}`);
    return response.blob();
  }

  async delete(key: string): Promise<boolean> {
    if (!this.config) throw new Error('S3 not initialized');

    const endpoint = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    const response = await fetch(endpoint, { method: 'DELETE' });
    
    return response.ok;
  }

  async exists(key: string): Promise<boolean> {
    if (!this.config) throw new Error('S3 not initialized');

    const endpoint = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    const response = await fetch(endpoint, { method: 'HEAD' });
    
    return response.ok;
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop();
    return `${prefix}/${timestamp}-${random}.${ext}`;
  }

  get isInitialized(): boolean {
    return this.config !== null;
  }
}

export const s3Service = new S3Service();
export default S3Service;
