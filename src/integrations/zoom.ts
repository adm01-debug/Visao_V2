// Zoom Integration - Projeto VISÃO
// Integração com Zoom com tipagem forte

export interface ZoomConfig {
  apiKey: string;
  apiSecret: string;
  webhookToken?: string;
}

export interface ZoomMeeting {
  id: string;
  uuid: string;
  hostId: string;
  topic: string;
  type: ZoomMeetingType;
  startTime: string;
  duration: number;
  timezone: string;
  joinUrl: string;
  password?: string;
  settings: ZoomMeetingSettings;
}

export type ZoomMeetingType = 1 | 2 | 3 | 8;

export interface ZoomMeetingSettings {
  hostVideo: boolean;
  participantVideo: boolean;
  joinBeforeHost: boolean;
  muteUponEntry: boolean;
  watermark: boolean;
  autoRecording: 'local' | 'cloud' | 'none';
  waitingRoom: boolean;
}

export interface ZoomParticipant {
  id: string;
  name: string;
  email?: string;
  joinTime: string;
  leaveTime?: string;
  duration?: number;
}

export interface ZoomRecording {
  id: string;
  meetingId: string;
  recordingType: 'shared_screen_with_speaker_view' | 'shared_screen' | 'active_speaker';
  fileType: 'mp4' | 'm4a' | 'timeline' | 'transcript' | 'chat';
  fileSize: number;
  playUrl: string;
  downloadUrl: string;
  recordingStart: string;
  recordingEnd: string;
}

export interface CreateMeetingParams {
  topic: string;
  type?: ZoomMeetingType;
  startTime?: string;
  duration?: number;
  timezone?: string;
  password?: string;
  settings?: Partial<ZoomMeetingSettings>;
}

export interface ZoomClient {
  createMeeting: (params: CreateMeetingParams) => Promise<ZoomMeeting>;
  getMeeting: (meetingId: string) => Promise<ZoomMeeting>;
  deleteMeeting: (meetingId: string) => Promise<void>;
  listRecordings: (meetingId: string) => Promise<ZoomRecording[]>;
  getParticipants: (meetingId: string) => Promise<ZoomParticipant[]>;
}

export const createZoomClient = (config: ZoomConfig): ZoomClient => {
  const baseUrl = 'https://api.zoom.us/v2';

  const getHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  });

  return {
    createMeeting: async (params) => {
      const response = await fetch(`${baseUrl}/users/me/meetings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          topic: params.topic,
          type: params.type || 2,
          start_time: params.startTime,
          duration: params.duration || 60,
          timezone: params.timezone || 'America/Sao_Paulo',
          password: params.password,
          settings: params.settings,
        }),
      });
      return response.json();
    },

    getMeeting: async (meetingId) => {
      const response = await fetch(`${baseUrl}/meetings/${meetingId}`, {
        headers: getHeaders(),
      });
      return response.json();
    },

    deleteMeeting: async (meetingId) => {
      await fetch(`${baseUrl}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    },

    listRecordings: async (meetingId) => {
      const response = await fetch(`${baseUrl}/meetings/${meetingId}/recordings`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      return data.recording_files || [];
    },

    getParticipants: async (meetingId) => {
      const response = await fetch(`${baseUrl}/past_meetings/${meetingId}/participants`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      return data.participants || [];
    },
  };
};

export default createZoomClient;
