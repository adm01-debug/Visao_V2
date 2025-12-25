/**
 * Integrations Index
 * Central export point for all external service integrations
 */

// Video/Streaming
export { webrtcService, type PeerConnection, type SignalingMessage } from './webrtc';
export { ffmpegService, type TranscodeOptions, type ThumbnailOptions, type ClipOptions } from './ffmpeg';
export { gstreamerService, type GStreamerPipelineConfig, type PipelineStatus } from './gstreamer';

// Communication
export { whatsappService, type WhatsAppMessage, type WhatsAppResponse } from './whatsapp';
export { slackService, type SlackMessage, type SlackBlock, type SlackResponse } from './slack';
export { emailService, type EmailMessage, type EmailResponse, type EmailTemplate } from './email';
export { smsService, type SmsMessage, type SmsResponse, type SmsBulkResult } from './sms';
export { firebaseService, type PushNotification, type NotificationResponse } from './firebase';

// Cloud Providers
export { awsService, type S3UploadOptions, type RekognitionFaceMatch, type RekognitionLabel } from './aws';
export { azureService, type BlobUploadOptions, type FaceDetectionResult, type ComputerVisionResult } from './azure';
export { gcpService, type GcsUploadOptions, type VisionAnnotation, type VideoIntelligenceResult } from './gcp';

// Re-export Supabase
export * from './supabase';

// Re-export Bitrix24
export { default as bitrix24Integration } from './bitrix24Integration';

/**
 * Initialize all required integrations
 */
export async function initializeIntegrations(config: {
  whatsapp?: Parameters<typeof import('./whatsapp').whatsappService.initialize>[0];
  slack?: Parameters<typeof import('./slack').slackService.initialize>[0];
  email?: Parameters<typeof import('./email').emailService.initialize>[0];
  sms?: Parameters<typeof import('./sms').smsService.initialize>[0];
  firebase?: Parameters<typeof import('./firebase').firebaseService.initialize>[0];
  aws?: Parameters<typeof import('./aws').awsService.initialize>[0];
  azure?: Parameters<typeof import('./azure').azureService.initialize>[0];
  gcp?: Parameters<typeof import('./gcp').gcpService.initialize>[0];
}): Promise<void> {
  const { whatsappService } = await import('./whatsapp');
  const { slackService } = await import('./slack');
  const { emailService } = await import('./email');
  const { smsService } = await import('./sms');
  const { firebaseService } = await import('./firebase');
  const { awsService } = await import('./aws');
  const { azureService } = await import('./azure');
  const { gcpService } = await import('./gcp');

  const promises: Promise<unknown>[] = [];

  if (config.whatsapp) {
    whatsappService.initialize(config.whatsapp);
  }
  if (config.slack) {
    slackService.initialize(config.slack);
  }
  if (config.email) {
    emailService.initialize(config.email);
  }
  if (config.sms) {
    smsService.initialize(config.sms);
  }
  if (config.firebase) {
    promises.push(firebaseService.initialize(config.firebase));
  }
  if (config.aws) {
    promises.push(awsService.initialize(config.aws));
  }
  if (config.azure) {
    promises.push(azureService.initialize(config.azure));
  }
  if (config.gcp) {
    promises.push(gcpService.initialize(config.gcp));
  }

  await Promise.all(promises);
  console.log('[Integrations] All configured services initialized');
}

/**
 * Send notification through all configured channels
 */
export async function sendMultiChannelNotification(
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
    detailsUrl?: string;
    timestamp?: Date;
  },
  recipients: {
    whatsapp?: string[];
    slack?: boolean;
    email?: string[];
    sms?: string[];
    push?: string[];
  }
): Promise<{
  whatsapp?: { sent: number; failed: number };
  slack?: boolean;
  email?: { sent: number; failed: number };
  sms?: { sent: number; failed: number };
  push?: { sent: number; failed: number };
}> {
  const results: Awaited<ReturnType<typeof sendMultiChannelNotification>> = {};
  const timestamp = notification.timestamp || new Date();

  // WhatsApp
  if (recipients.whatsapp?.length) {
    const { whatsappService } = await import('./whatsapp');
    if (whatsappService.isInitialized) {
      let sent = 0, failed = 0;
      for (const phone of recipients.whatsapp) {
        try {
          const response = await whatsappService.sendAlertNotification(
            phone,
            notification.title,
            '',
            timestamp,
            notification.imageUrl
          );
          if (response.messages?.length) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
      results.whatsapp = { sent, failed };
    }
  }

  // Slack
  if (recipients.slack) {
    const { slackService } = await import('./slack');
    if (slackService.hasWebhook) {
      results.slack = await slackService.sendAlert(
        notification.title,
        '',
        timestamp,
        notification.imageUrl,
        notification.detailsUrl
      );
    }
  }

  // Email
  if (recipients.email?.length) {
    const { emailService } = await import('./email');
    if (emailService.isInitialized) {
      let sent = 0, failed = 0;
      for (const email of recipients.email) {
        const response = await emailService.sendAlertEmail(
          email,
          notification.title,
          '',
          timestamp,
          notification.imageUrl,
          notification.detailsUrl
        );
        if (response.success) sent++;
        else failed++;
      }
      results.email = { sent, failed };
    }
  }

  // SMS
  if (recipients.sms?.length) {
    const { smsService } = await import('./sms');
    if (smsService.isInitialized) {
      const smsResult = await smsService.sendAlert(
        recipients.sms,
        notification.title,
        '',
        timestamp
      );
      if ('results' in smsResult) {
        results.sms = { sent: smsResult.successful, failed: smsResult.failed };
      } else {
        results.sms = { sent: smsResult.success ? 1 : 0, failed: smsResult.success ? 0 : 1 };
      }
    }
  }

  // Push notifications
  if (recipients.push?.length) {
    const { firebaseService } = await import('./firebase');
    if (firebaseService.isReady) {
      const pushResult = await firebaseService.sendAlertNotification(
        recipients.push,
        notification.title,
        '',
        timestamp,
        notification.imageUrl,
        notification.detailsUrl
      );
      results.push = {
        sent: pushResult.successCount || (pushResult.success ? 1 : 0),
        failed: pushResult.failureCount || (pushResult.success ? 0 : 1),
      };
    }
  }

  return results;
}

/**
 * Upload file to configured cloud storage
 */
export async function uploadToCloudStorage(
  file: Blob | Buffer,
  filename: string,
  options: {
    provider?: 'aws' | 'azure' | 'gcp';
    bucket?: string;
    container?: string;
    public?: boolean;
    contentType?: string;
  } = {}
): Promise<{ url: string; provider: string }> {
  const provider = options.provider || 'aws';

  switch (provider) {
    case 'aws': {
      const { awsService } = await import('./aws');
      if (!awsService.isInitialized) {
        throw new Error('AWS not initialized');
      }
      const result = await awsService.s3Upload({
        bucket: options.bucket || 'visao-storage',
        key: filename,
        body: file,
        contentType: options.contentType,
        acl: options.public ? 'public-read' : 'private',
      });
      return { url: result.url, provider: 'aws' };
    }

    case 'azure': {
      const { azureService } = await import('./azure');
      if (!azureService.hasStorage) {
        throw new Error('Azure Storage not initialized');
      }
      const result = await azureService.uploadBlob({
        containerName: options.container || 'visao-storage',
        blobName: filename,
        content: file,
        contentType: options.contentType,
      });
      return { url: result.url, provider: 'azure' };
    }

    case 'gcp': {
      const { gcpService } = await import('./gcp');
      if (!gcpService.isInitialized) {
        throw new Error('GCP not initialized');
      }
      const result = await gcpService.uploadToStorage({
        bucket: options.bucket || 'visao-storage',
        filename,
        content: file,
        contentType: options.contentType,
        public: options.public,
      });
      return { url: result.url, provider: 'gcp' };
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
