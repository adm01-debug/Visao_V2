import { FEATURES, isFeatureEnabled } from '@/constants/features';

export const FEATURE_CONFIG = {
  enabledByDefault: [FEATURES.ALERTS, FEATURES.RECORDINGS, FEATURES.MOTION_DETECTION],
  premiumFeatures: [FEATURES.FACE_RECOGNITION, FEATURES.LICENSE_PLATE, FEATURES.ANALYTICS],
};

export const getEnabledFeatures = (): string[] => Object.values(FEATURES).filter(isFeatureEnabled);
