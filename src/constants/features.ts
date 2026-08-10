export const FEATURES = {
  FACE_RECOGNITION: 'face_recognition',
  LICENSE_PLATE: 'license_plate',
  OBJECT_DETECTION: 'object_detection',
  MOTION_DETECTION: 'motion_detection',
  ANALYTICS: 'analytics',
  RECORDINGS: 'recordings',
  ALERTS: 'alerts',
  ZONES: 'zones',
} as const;

export const isFeatureEnabled = (feature: string): boolean => {
  const enabledFeatures = import.meta.env.VITE_ENABLED_FEATURES?.split(',') || [];
  return enabledFeatures.includes(feature);
};
