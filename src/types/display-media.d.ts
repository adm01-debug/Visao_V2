/**
 * Display Media API Extended Type Declarations
 */

interface DisplayMediaStreamConstraints {
  video?: boolean | {
    cursor?: 'always' | 'motion' | 'never';
    displaySurface?: 'application' | 'browser' | 'monitor' | 'window';
    logicalSurface?: boolean;
    width?: ConstrainULong;
    height?: ConstrainULong;
    frameRate?: ConstrainDouble;
  };
  audio?: boolean | MediaTrackConstraints;
}

declare global {
  interface MediaDevices {
    getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream>;
  }
}

export {};
