/**
 * Azure Integration Service
 * Core Azure services wrapper
 */

export interface AzureConfig {
  subscriptionId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  storageAccountName?: string;
  storageAccountKey?: string;
  cognitiveServicesEndpoint?: string;
  cognitiveServicesKey?: string;
}

export interface BlobUploadOptions {
  containerName: string;
  blobName: string;
  content: Blob | Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface FaceDetectionResult {
  faceId: string;
  faceRectangle: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  faceAttributes?: {
    age?: number;
    gender?: string;
    emotion?: Record<string, number>;
    glasses?: string;
    facialHair?: Record<string, number>;
  };
}

export interface ComputerVisionResult {
  categories: Array<{ name: string; score: number }>;
  tags: Array<{ name: string; confidence: number }>;
  description: {
    tags: string[];
    captions: Array<{ text: string; confidence: number }>;
  };
  objects: Array<{
    object: string;
    confidence: number;
    rectangle: { x: number; y: number; w: number; h: number };
  }>;
}

class AzureService {
  private config: AzureConfig | null = null;
  private blobServiceClient: unknown = null;

  /**
   * Initialize Azure
   */
  async initialize(config: AzureConfig): Promise<void> {
    this.config = config;
      }

  /**
   * Get Blob Service Client
   */
  private async getBlobServiceClient(): Promise<unknown> {
    if (this.blobServiceClient) return this.blobServiceClient;
    
    if (!this.config?.storageAccountName || !this.config?.storageAccountKey) {
      throw new Error('Azure Storage not configured');
    }

    const { BlobServiceClient, StorageSharedKeyCredential } = await import('@azure/storage-blob');
    
    const credential = new StorageSharedKeyCredential(
      this.config.storageAccountName,
      this.config.storageAccountKey
    );

    this.blobServiceClient = new BlobServiceClient(
      `https://${this.config.storageAccountName}.blob.core.windows.net`,
      credential
    );

    return this.blobServiceClient;
  }

  /**
   * Upload blob
   */
  async uploadBlob(options: BlobUploadOptions): Promise<{ url: string; blobName: string }> {
    const client = await this.getBlobServiceClient() as {
      getContainerClient: (name: string) => {
        getBlockBlobClient: (name: string) => {
          upload: (data: unknown, size: number, options?: object) => Promise<void>;
        };
      };
    };
    
    const containerClient = client.getContainerClient(options.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(options.blobName);

    const content = options.content instanceof Blob 
      ? await options.content.arrayBuffer()
      : options.content;

    const size = content instanceof ArrayBuffer 
      ? content.byteLength 
      : typeof content === 'string' 
        ? content.length 
        : (content as Buffer).length;

    await blockBlobClient.upload(content, size, {
      blobHTTPHeaders: { blobContentType: options.contentType },
      metadata: options.metadata,
    });

    const url = `https://${this.config!.storageAccountName}.blob.core.windows.net/${options.containerName}/${options.blobName}`;
    
    return { url, blobName: options.blobName };
  }

  /**
   * Download blob
   */
  async downloadBlob(containerName: string, blobName: string): Promise<Blob> {
    const client = await this.getBlobServiceClient() as {
      getContainerClient: (name: string) => {
        getBlockBlobClient: (name: string) => {
          download: () => Promise<{ blobBody: Promise<Blob> }>;
        };
      };
    };
    
    const containerClient = client.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const response = await blockBlobClient.download();
    return await response.blobBody as Blob;
  }

  /**
   * Delete blob
   */
  async deleteBlob(containerName: string, blobName: string): Promise<boolean> {
    const client = await this.getBlobServiceClient() as {
      getContainerClient: (name: string) => {
        getBlockBlobClient: (name: string) => {
          delete: () => Promise<void>;
        };
      };
    };
    
    const containerClient = client.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    return true;
  }

  /**
   * Generate SAS URL
   */
  async generateSasUrl(
    containerName: string,
    blobName: string,
    expiresInMinutes = 60
  ): Promise<string> {
    if (!this.config?.storageAccountName || !this.config?.storageAccountKey) {
      throw new Error('Azure Storage not configured');
    }

    const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = 
      await import('@azure/storage-blob');

    const credential = new StorageSharedKeyCredential(
      this.config.storageAccountName,
      this.config.storageAccountKey
    );

    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    }, credential).toString();

    return `https://${this.config.storageAccountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
  }

  /**
   * List blobs
   */
  async listBlobs(containerName: string, prefix?: string): Promise<Array<{ name: string; contentLength: number; createdOn: Date }>> {
    const client = await this.getBlobServiceClient() as {
      getContainerClient: (name: string) => {
        listBlobsFlat: (options?: object) => AsyncIterable<{ name: string; properties: { contentLength: number; createdOn: Date } }>;
      };
    };
    
    const containerClient = client.getContainerClient(containerName);
    const blobs: Array<{ name: string; contentLength: number; createdOn: Date }> = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push({
        name: blob.name,
        contentLength: blob.properties.contentLength || 0,
        createdOn: blob.properties.createdOn || new Date(),
      });
    }

    return blobs;
  }

  /**
   * Detect faces using Azure Face API
   */
  async detectFaces(imageUrl: string): Promise<FaceDetectionResult[]> {
    if (!this.config?.cognitiveServicesEndpoint || !this.config?.cognitiveServicesKey) {
      throw new Error('Cognitive Services not configured');
    }

    const response = await fetch(
      `${this.config.cognitiveServicesEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceAttributes=age,gender,emotion,glasses,facialHair`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.cognitiveServicesKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      }
    );

    if (!response.ok) {
      throw new Error(`Face detection failed: ${response.statusText}`);
    }

    const faces = await response.json();
    return faces.map((face: unknown) => {
      const f = face as {
        faceId: string;
        faceRectangle: { top: number; left: number; width: number; height: number };
        faceAttributes?: object;
      };
      return {
        faceId: f.faceId,
        faceRectangle: f.faceRectangle,
        faceAttributes: f.faceAttributes,
      };
    });
  }

  /**
   * Analyze image using Azure Computer Vision
   */
  async analyzeImage(imageUrl: string): Promise<ComputerVisionResult> {
    if (!this.config?.cognitiveServicesEndpoint || !this.config?.cognitiveServicesKey) {
      throw new Error('Cognitive Services not configured');
    }

    const response = await fetch(
      `${this.config.cognitiveServicesEndpoint}/vision/v3.2/analyze?visualFeatures=Categories,Tags,Description,Objects`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.cognitiveServicesKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      }
    );

    if (!response.ok) {
      throw new Error(`Image analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * OCR - Read text from image
   */
  async readText(imageUrl: string): Promise<string[]> {
    if (!this.config?.cognitiveServicesEndpoint || !this.config?.cognitiveServicesKey) {
      throw new Error('Cognitive Services not configured');
    }

    // Start read operation
    const startResponse = await fetch(
      `${this.config.cognitiveServicesEndpoint}/vision/v3.2/read/analyze`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.cognitiveServicesKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      }
    );

    if (!startResponse.ok) {
      throw new Error(`OCR start failed: ${startResponse.statusText}`);
    }

    const operationLocation = startResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('Operation location not found');
    }

    // Poll for results
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.cognitiveServicesKey,
        },
      });

      result = await pollResponse.json();
      if (result.status === 'succeeded') break;
      if (result.status === 'failed') throw new Error('OCR failed');
    }

    const lines: string[] = [];
    result?.analyzeResult?.readResults?.forEach((page: { lines: Array<{ text: string }> }) => {
      page.lines?.forEach((line) => {
        lines.push(line.text);
      });
    });

    return lines;
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Check if storage is configured
   */
  get hasStorage(): boolean {
    return !!(this.config?.storageAccountName && this.config?.storageAccountKey);
  }

  /**
   * Check if cognitive services are configured
   */
  get hasCognitiveServices(): boolean {
    return !!(this.config?.cognitiveServicesEndpoint && this.config?.cognitiveServicesKey);
  }
}

// Singleton instance
export const azureService = new AzureService();

export default AzureService;
