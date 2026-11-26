import { paintFrameMask, type FrameMaskPlan } from './motionMaskRedaction';

/** Resolução e qualidade fixas do quadro enviado à IA (não do stream original). */
export const ANALYSIS_FRAME_MAX_WIDTH = 640;
export const ANALYSIS_FRAME_MAX_HEIGHT = 480;
export const ANALYSIS_FRAME_QUALITY = 0.7;

/**
 * Destino do quadro capturado do player:
 * - `analysis`: vai para `analyze-image`, com as máscaras de movimento redigidas;
 * - `replay`: vai para o buffer de evidência dos alertas, sempre sem redação.
 */
export type FramePurpose = 'analysis' | 'replay';

/**
 * Desenha o quadro atual do vídeo no canvas e devolve o JPEG em base64.
 * `purpose: 'analysis'` é o único caminho que pinta máscara.
 */
export function captureFrameToDataUrl(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement,
  plan: FrameMaskPlan,
  purpose: FramePurpose
): string | null {
  if (!video || video.readyState < 2) return null;
  canvas.width = Math.min(video.videoWidth, ANALYSIS_FRAME_MAX_WIDTH);
  canvas.height = Math.min(video.videoHeight, ANALYSIS_FRAME_MAX_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (purpose === 'analysis') paintFrameMask(ctx, plan, video, canvas.width, canvas.height);
  else ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', ANALYSIS_FRAME_QUALITY);
}
