import { useState, useEffect } from 'react';
import { safeExecute } from '@/lib/safeExecute';

interface FeatureFlags {
  enablePPE: boolean;
  enableHeatmap: boolean;
  enablePlateRecognition: boolean;
  enableFaceRecognition: boolean;
  enableZones: boolean;
  enableRules: boolean;
}

const defaultFlags: FeatureFlags = {
  enablePPE: true,
  enableHeatmap: true,
  enablePlateRecognition: true,
  enableFaceRecognition: true,
  enableZones: true,
  enableRules: true,
};

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  useEffect(() => {
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      setFlags({ ...defaultFlags, ...JSON.parse(stored) });
    }
  }, []);

  return flags;
}
