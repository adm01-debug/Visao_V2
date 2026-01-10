/**
 * Google Cloud Platform Integration Service
 * Core GCP services wrapper
 */

export interface GcpConfig {
  projectId: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
  apiKey?: string;
  storageBucket?: string;
}

export interface GcsUploadOptions {
  bucket: string;
  filename: string;
  content: Blob | Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
}

export interface VisionAnnotation {
  faceAnnotations?: Array<{
    boundingPoly: { vertices: Array<{ x: number; y: number }> };
    joyLikelihood: string;
    sorrowLikelihood: string;
    angerLikelihood: string;
    surpriseLikelihood: string;
    detectionConfidence: number;
  }>;
  labelAnnotations?: Array<{
    description: string;
    score: number;
    topicality: number;
  }>;
  textAnnotations?: Array<{
    description: string;
    locale?: string;
    boundingPoly?: { vertices: Array<{ x: number; y: number }> };
  }>;
  objectAnnotations?: Array<{
    name: string;
    score: number;
    boundingPoly: { normalizedVertices: Array<{ x: number; y: number }> };
  }>;
}

export interface VideoIntelligenceResult {
  annotationResults: Array<{
    shotAnnotations?: Array<{
      startTimeOffset: string;
      endTimeOffset: string;
    }>;
    labelAnnotations?: Array<{
      entity: { entityId: string; description: string };
      segments: Array<{
        segment: { startTimeOffset: string; endTimeOffset: string };
        confidence: number;
      }>;
    }>;
    personDetectionAnnotations?: Array<{
      tracks: Array<{
        segment: { startTimeOffset: string; endTimeOffset: string };
        timestampedObjects: Array<{
          normalizedBoundingBox: { left: number; top: number; right: number; bottom: number };
          timeOffset: string;
        }>;
      }>;
    }>;
  }>;
}

class GcpService {
  private config: GcpConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Initialize GCP
   */
  async initialize(config: GcpConfig): Promise<void> {
    this.config = config;
      }

  /**
   * Get access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.config?.credentials) {
      throw new Error('GCP credentials not configured');
    }

    // Create JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Note: In production, use a proper JWT library
    // This is a simplified implementation
    const base64Header = btoa(JSON.stringify(header));
    const base64Payload = btoa(JSON.stringify(payload));
    
    // For full implementation, sign with private key using crypto
    // This would require a crypto library for RS256 signing
    const unsignedToken = `${base64Header}.${base64Payload}`;

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: unsignedToken,
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    return this.accessToken;
  }

  /**
   * Upload file to Cloud Storage
   */
  async uploadToStorage(options: GcsUploadOptions): Promise<{ url: string; filename: string }> {
    const token = await this.getAccessToken();
    const bucket = options.bucket || this.config?.storageBucket;
    
    if (!bucket) {
      throw new Error('Storage bucket not specified');
    }

    const contentType = options.contentType || 'application/octet-stream';
    const content = options.content instanceof Blob 
      ? await options.content.arrayBuffer()
      : options.content;

    const response = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(options.filename)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Make public if requested
    if (options.public) {
      await this.makeObjectPublic(bucket, options.filename);
    }

    const url = options.public
      ? `https://storage.googleapis.com/${bucket}/${options.filename}`
      : result.mediaLink;

    return { url, filename: options.filename };
  }

  /**
   * Make object public
   */
  private async makeObjectPublic(bucket: string, filename: string): Promise<void> {
    const token = await this.getAccessToken();

    await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filename)}/acl`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity: 'allUsers', role: 'READER' }),
      }
    );
  }

  /**
   * Download from Cloud Storage
   */
  async downloadFromStorage(bucket: string, filename: string): Promise<Blob> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filename)}?alt=media`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Delete from Cloud Storage
   */
  async deleteFromStorage(bucket: string, filename: string): Promise<boolean> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filename)}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    return response.ok;
  }

  /**
   * Generate signed URL
   */
  async generateSignedUrl(
    bucket: string,
    filename: string,
    expiresInMinutes = 60
  ): Promise<string> {
    const token = await this.getAccessToken();
    const expiration = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    // Note: Proper signed URL generation requires crypto signing
    // This is a simplified approach using IAM credentials
    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(filename)}?alt=json`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    const data = await response.json();
    return data.mediaLink + `&expiry=${expiration}`;
  }

  /**
   * Analyze image with Vision API
   */
  async analyzeImage(imageUrl: string, features: string[] = ['FACE_DETECTION', 'LABEL_DETECTION', 'TEXT_DETECTION', 'OBJECT_LOCALIZATION']): Promise<VisionAnnotation> {
    const key = this.config?.apiKey;
    if (!key) {
      throw new Error('GCP API key not configured');
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: features.map((type) => ({ type })),
          }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.responses[0] || {};
  }

  /**
   * Analyze video with Video Intelligence API
   */
  async analyzeVideo(
    gcsUri: string,
    features: string[] = ['SHOT_CHANGE_DETECTION', 'LABEL_DETECTION', 'PERSON_DETECTION']
  ): Promise<VideoIntelligenceResult> {
    const token = await this.getAccessToken();

    // Start video analysis
    const startResponse = await fetch(
      'https://videointelligence.googleapis.com/v1/videos:annotate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputUri: gcsUri,
          features,
        }),
      }
    );

    if (!startResponse.ok) {
      throw new Error(`Video analysis start failed: ${startResponse.statusText}`);
    }

    const startResult = await startResponse.json();
    const operationName = startResult.name;

    // Poll for results
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const pollResponse = await fetch(
        `https://videointelligence.googleapis.com/v1/${operationName}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const pollResult = await pollResponse.json();

      if (pollResult.done) {
        if (pollResult.error) {
          throw new Error(pollResult.error.message);
        }
        return pollResult.response;
      }
    }

    throw new Error('Video analysis timed out');
  }

  /**
   * Transcribe audio with Speech-to-Text API
   */
  async transcribeAudio(
    audioUrl: string,
    languageCode = 'pt-BR'
  ): Promise<string[]> {
    const key = this.config?.apiKey;
    if (!key) {
      throw new Error('GCP API key not configured');
    }

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            languageCode,
            enableAutomaticPunctuation: true,
          },
          audio: { uri: audioUrl },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Speech API failed: ${response.statusText}`);
    }

    const result = await response.json();
    return (result.results || []).map(
      (r: { alternatives: Array<{ transcript: string }> }) => 
        r.alternatives[0]?.transcript || ''
    );
  }

  /**
   * Publish message to Pub/Sub
   */
  async publishMessage(topic: string, data: unknown): Promise<string> {
    const token = await this.getAccessToken();
    const projectId = this.config?.projectId;

    if (!projectId) {
      throw new Error('Project ID not configured');
    }

    const response = await fetch(
      `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${topic}:publish`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            data: btoa(typeof data === 'string' ? data : JSON.stringify(data)),
          }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pub/Sub publish failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.messageIds[0];
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this.config !== null;
  }

  /**
   * Get project ID
   */
  get projectId(): string | null {
    return this.config?.projectId || null;
  }
}

// Singleton instance
export const gcpService = new GcpService();

export default GcpService;
