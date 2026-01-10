/**
 * GStreamer Integration Service
 * WebSocket-based interface for GStreamer pipelines on the server
 */

export interface GStreamerPipelineConfig {
  name: string;
  source: PipelineSource;
  elements: PipelineElement[];
  sink: PipelineSink;
}

export interface PipelineSource {
  type: 'rtsp' | 'http' | 'file' | 'v4l2' | 'test';
  uri?: string;
  device?: string;
  pattern?: 'smpte' | 'snow' | 'ball';
}

export interface PipelineElement {
  type: string;
  properties?: Record<string, unknown>;
}

export interface PipelineSink {
  type: 'webrtc' | 'hls' | 'rtmp' | 'file' | 'display';
  uri?: string;
  path?: string;
}

export interface PipelineStatus {
  id: string;
  name: string;
  state: 'null' | 'ready' | 'paused' | 'playing' | 'error';
  position?: number;
  duration?: number;
  bitrate?: number;
  fps?: number;
  error?: string;
}

export interface GStreamerMessage {
  type: 'pipeline_status' | 'eos' | 'error' | 'warning' | 'info' | 'stream_start' | 'element_stats';
  pipelineId: string;
  data: unknown;
  timestamp: number;
}

type MessageHandler = (message: GStreamerMessage) => void;

class GStreamerService {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private pipelines: Map<string, PipelineStatus> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  /**
   * Connect to GStreamer WebSocket server
   */
  async connect(serverUrl: string): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkConnection);
            resolve(this.ws?.readyState === WebSocket.OPEN);
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    this.serverUrl = serverUrl;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
                    this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve(true);
        };

        this.ws.onclose = () => {
                    this.isConnecting = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
                    this.isConnecting = false;
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as GStreamerMessage;
            this.handleMessage(message);
          } catch (error) {
                      }
        };
      } catch (error) {
                this.isConnecting = false;
        resolve(false);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    `);
    
    setTimeout(() => {
      if (this.serverUrl) {
        this.connect(this.serverUrl);
      }
    }, delay);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: GStreamerMessage): void {
    // Update pipeline status
    if (message.type === 'pipeline_status') {
      const status = message.data as PipelineStatus;
      this.pipelines.set(message.pipelineId, status);
    }

    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
              }
    });
  }

  /**
   * Send command to server
   */
  private send(command: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
    }

    this.ws.send(JSON.stringify(command));
    return true;
  }

  /**
   * Create a new pipeline
   */
  createPipeline(config: GStreamerPipelineConfig): string | null {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const success = this.send({
      action: 'create_pipeline',
      pipelineId,
      config,
    });

    if (success) {
      this.pipelines.set(pipelineId, {
        id: pipelineId,
        name: config.name,
        state: 'null',
      });
      return pipelineId;
    }

    return null;
  }

  /**
   * Start a pipeline
   */
  startPipeline(pipelineId: string): boolean {
    return this.send({
      action: 'set_state',
      pipelineId,
      state: 'playing',
    });
  }

  /**
   * Pause a pipeline
   */
  pausePipeline(pipelineId: string): boolean {
    return this.send({
      action: 'set_state',
      pipelineId,
      state: 'paused',
    });
  }

  /**
   * Stop a pipeline
   */
  stopPipeline(pipelineId: string): boolean {
    return this.send({
      action: 'set_state',
      pipelineId,
      state: 'null',
    });
  }

  /**
   * Destroy a pipeline
   */
  destroyPipeline(pipelineId: string): boolean {
    const success = this.send({
      action: 'destroy_pipeline',
      pipelineId,
    });

    if (success) {
      this.pipelines.delete(pipelineId);
    }

    return success;
  }

  /**
   * Seek to position
   */
  seek(pipelineId: string, positionMs: number): boolean {
    return this.send({
      action: 'seek',
      pipelineId,
      position: positionMs,
    });
  }

  /**
   * Set pipeline element property
   */
  setElementProperty(
    pipelineId: string,
    elementName: string,
    property: string,
    value: unknown
  ): boolean {
    return this.send({
      action: 'set_property',
      pipelineId,
      element: elementName,
      property,
      value,
    });
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(pipelineId: string): PipelineStatus | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Get all pipeline statuses
   */
  getAllPipelines(): PipelineStatus[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Create RTSP to WebRTC pipeline
   */
  createRtspToWebRtc(name: string, rtspUri: string): string | null {
    return this.createPipeline({
      name,
      source: {
        type: 'rtsp',
        uri: rtspUri,
      },
      elements: [
        { type: 'rtph264depay' },
        { type: 'h264parse' },
        { type: 'nvh264dec', properties: { gpu_id: 0 } },
        { type: 'videoconvert' },
        { type: 'x264enc', properties: { tune: 'zerolatency', bitrate: 2000 } },
        { type: 'rtph264pay', properties: { 'config-interval': 1 } },
      ],
      sink: {
        type: 'webrtc',
      },
    });
  }

  /**
   * Create RTSP to HLS pipeline
   */
  createRtspToHls(name: string, rtspUri: string, outputPath: string): string | null {
    return this.createPipeline({
      name,
      source: {
        type: 'rtsp',
        uri: rtspUri,
      },
      elements: [
        { type: 'rtph264depay' },
        { type: 'h264parse' },
        { type: 'mpegtsmux' },
      ],
      sink: {
        type: 'hls',
        path: outputPath,
      },
    });
  }

  /**
   * Create test source pipeline
   */
  createTestSource(name: string, pattern: 'smpte' | 'snow' | 'ball' = 'smpte'): string | null {
    return this.createPipeline({
      name,
      source: {
        type: 'test',
        pattern,
      },
      elements: [
        { type: 'videoconvert' },
        { type: 'x264enc', properties: { tune: 'zerolatency' } },
        { type: 'rtph264pay' },
      ],
      sink: {
        type: 'webrtc',
      },
    });
  }

  /**
   * Request pipeline statistics
   */
  requestStats(pipelineId: string): boolean {
    return this.send({
      action: 'get_stats',
      pipelineId,
    });
  }

  /**
   * Check connection status
   */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pipelines.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }
}

// Singleton instance
export const gstreamerService = new GStreamerService();

export default GStreamerService;
