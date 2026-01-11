/**
 * useWebRTCPeer Hook
 * WebRTC peer connection management
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface PeerConnectionConfig {
  iceServers?: RTCIceServer[];
  onTrack?: (event: RTCTrackEvent) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export interface UseWebRTCPeerReturn {
  peerConnection: RTCPeerConnection | null;
  connectionState: RTCPeerConnectionState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  dataChannel: RTCDataChannel | null;
  createOffer: () => Promise<RTCSessionDescriptionInit | null>;
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>;
  setRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  addLocalStream: (stream: MediaStream) => void;
  createDataChannel: (label: string) => RTCDataChannel | null;
  sendData: (data: string | ArrayBuffer) => void;
  close: () => void;
}

const defaultIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTCPeer(config: PeerConnectionConfig = {}): UseWebRTCPeerReturn {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const initPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: config.iceServers || defaultIceServers,
    });

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      config.onConnectionStateChange?.(pc.connectionState);
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      config.onTrack?.(event);
    };

    pc.ondatachannel = (event) => {
      setDataChannel(event.channel);
      config.onDataChannel?.(event.channel);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidatesQueue.current.push(event.candidate.toJSON());
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [config]);

  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    const pc = initPeerConnection();
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
return null;
    }
  }, [initPeerConnection]);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> => {
    const pc = initPeerConnection();
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
return null;
    }
  }, [initPeerConnection]);

  const setRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
}
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
}
  }, []);

  const addLocalStream = useCallback((stream: MediaStream) => {
    const pc = initPeerConnection();
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    setLocalStream(stream);
  }, [initPeerConnection]);

  const createDataChannel = useCallback((label: string): RTCDataChannel | null => {
    const pc = initPeerConnection();
    try {
      const channel = pc.createDataChannel(label);
      setDataChannel(channel);
      return channel;
    } catch (error) {
return null;
    }
  }, [initPeerConnection]);

  const sendData = useCallback((data: string | ArrayBuffer) => {
    if (dataChannel?.readyState === 'open') {
      dataChannel.send(data as any);
    }
  }, [dataChannel]);

  const close = useCallback(() => {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    dataChannel?.close();
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setDataChannel(null);
    setConnectionState(null);
  }, [localStream, remoteStream, dataChannel]);

  useEffect(() => {
    return () => close();
  }, []);

  return {
    peerConnection: peerConnectionRef.current,
    connectionState,
    localStream,
    remoteStream,
    dataChannel,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    addLocalStream,
    createDataChannel,
    sendData,
    close,
  };
}

export default useWebRTCPeer;
