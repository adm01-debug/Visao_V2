/**
 * WebRTC Integration Service
 * Handles peer-to-peer video streaming connections
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  remoteStream?: MediaStream;
  localStream?: MediaStream;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'bye';
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

class WebRTCService {
  private config: WebRTCConfig;
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private onTrackCallback?: (peerId: string, stream: MediaStream) => void;
  private onDataCallback?: (peerId: string, data: unknown) => void;
  private onConnectionStateCallback?: (peerId: string, state: RTCPeerConnectionState) => void;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      iceServers: config?.iceServers || DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: config?.iceCandidatePoolSize || 10,
    };
  }

  /**
   * Initialize local media stream
   */
  async initializeLocalStream(
    constraints: MediaStreamConstraints = { video: true, audio: true }
  ): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error);
      throw error;
    }
  }

  /**
   * Create a new peer connection
   */
  createPeerConnection(peerId: string): RTCPeerConnection {
    const connection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: this.config.iceCandidatePoolSize,
    });

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    connection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.remoteStream = remoteStream;
      }
      this.onTrackCallback?.(peerId, remoteStream);
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      this.onConnectionStateCallback?.(peerId, connection.connectionState);
      
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.closePeerConnection(peerId);
      }
    };

    // Handle ICE connection state
    connection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${peerId}:`, connection.iceConnectionState);
    };

    // Store the peer connection
    this.peers.set(peerId, {
      id: peerId,
      connection,
      localStream: this.localStream || undefined,
    });

    return connection;
  }

  /**
   * Create an offer for a peer
   */
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    const offer = await peer.connection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    
    await peer.connection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create an answer for a peer
   */
  async createAnswer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(
    peerId: string,
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    await peer.connection.setRemoteDescription(new RTCSessionDescription(description));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Get ICE candidates for a peer
   */
  onIceCandidate(peerId: string, callback: (candidate: RTCIceCandidate) => void): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.connection.onicecandidate = (event) => {
      if (event.candidate) {
        callback(event.candidate);
      }
    };
  }

  /**
   * Create a data channel
   */
  createDataChannel(peerId: string, label: string): RTCDataChannel | null {
    const peer = this.peers.get(peerId);
    if (!peer) return null;

    const dataChannel = peer.connection.createDataChannel(label, {
      ordered: true,
    });

    dataChannel.onopen = () => {
      console.log(`[WebRTC] Data channel ${label} opened for ${peerId}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onDataCallback?.(peerId, data);
      } catch {
        this.onDataCallback?.(peerId, event.data);
      }
    };

    peer.dataChannel = dataChannel;
    return dataChannel;
  }

  /**
   * Send data through data channel
   */
  sendData(peerId: string, data: unknown): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      return false;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    peer.dataChannel.send(message);
    return true;
  }

  /**
   * Close a peer connection
   */
  closePeerConnection(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.dataChannel?.close();
    peer.connection.close();
    peer.remoteStream?.getTracks().forEach((track) => track.stop());
    
    this.peers.delete(peerId);
    console.log(`[WebRTC] Closed connection to ${peerId}`);
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.peers.forEach((_, peerId) => {
      this.closePeerConnection(peerId);
    });
    
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  /**
   * Get peer connection stats
   */
  async getStats(peerId: string): Promise<RTCStatsReport | null> {
    const peer = this.peers.get(peerId);
    if (!peer) return null;

    return peer.connection.getStats();
  }

  /**
   * Event handlers
   */
  onTrack(callback: (peerId: string, stream: MediaStream) => void): void {
    this.onTrackCallback = callback;
  }

  onData(callback: (peerId: string, data: unknown) => void): void {
    this.onDataCallback = callback;
  }

  onConnectionState(callback: (peerId: string, state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(peerId: string): RTCPeerConnectionState | null {
    const peer = this.peers.get(peerId);
    return peer?.connection.connectionState || null;
  }

  /**
   * Get all peer IDs
   */
  getPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Check if peer exists
   */
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }
}

// Singleton instance
export const webrtcService = new WebRTCService();

export default WebRTCService;
