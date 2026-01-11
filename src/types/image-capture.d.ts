// ImageCapture API Type Declarations
// https://w3c.github.io/mediacapture-image/

interface PhotoCapabilities {
  redEyeReduction: 'never' | 'always' | 'controllable';
  imageHeight: MediaSettingsRange;
  imageWidth: MediaSettingsRange;
  fillLightMode: string[];
}

interface PhotoSettings {
  fillLightMode?: 'auto' | 'off' | 'flash';
  imageHeight?: number;
  imageWidth?: number;
  redEyeReduction?: boolean;
}

interface MediaSettingsRange {
  max: number;
  min: number;
  step: number;
}

declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  readonly track: MediaStreamTrack;
  takePhoto(photoSettings?: PhotoSettings): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
  getPhotoSettings(): Promise<PhotoSettings>;
  grabFrame(): Promise<ImageBitmap>;
}

interface Window {
  ImageCapture: typeof ImageCapture;
}

export { ImageCapture, PhotoCapabilities, PhotoSettings, MediaSettingsRange };
