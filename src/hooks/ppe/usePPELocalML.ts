/**
 * VISÃO - PPE Local ML Detection (COCO-SSD + Heuristics)
 */
import { useCallback } from 'react';
import type { DetectedObject } from '../useMLModels';
import type { PPEType, PPEItem, PPEStatus } from './types';

export function usePPELocalML() {
  const detectWithLocalML = useCallback(
    async (
      _video: HTMLVideoElement,
      personBox: { x: number; y: number; width: number; height: number },
      allObjects: DetectedObject[],
      requiredPPE: PPEType[]
    ): Promise<PPEItem[]> => {
      const items: PPEItem[] = [];
      const { x, y, width, height } = personBox;

      const regions = {
        head: { x, y, w: width, h: height * 0.2 },
        torso: { x, y: y + height * 0.2, w: width, h: height * 0.35 },
        hands: { x: x - width * 0.1, y: y + height * 0.4, w: width * 1.2, h: height * 0.25 },
        feet: { x, y: y + height * 0.85, w: width, h: height * 0.15 },
        face: { x: x + width * 0.2, y: y + height * 0.05, w: width * 0.6, h: height * 0.15 },
      };

      const isInRegion = (
        obj: DetectedObject,
        region: { x: number; y: number; w: number; h: number }
      ): boolean => {
        const [ox, oy, ow, oh] = obj.bbox;
        const cx = ox + ow / 2,
          cy = oy + oh / 2;
        return (
          cx >= region.x && cx <= region.x + region.w && cy >= region.y && cy <= region.y + region.h
        );
      };

      for (const ppeType of requiredPPE) {
        let status: PPEStatus = 'unknown';
        let confidence = 0;

        switch (ppeType) {
          case 'helmet': {
            const headObjects = allObjects.filter((o) => isInRegion(o, regions.head));
            if (
              headObjects.some((o) => ['sports ball', 'bowl', 'frisbee', 'hat'].includes(o.class))
            ) {
              status = 'detected';
              confidence = 0.6;
            } else if (headObjects.length === 0) {
              status = 'missing';
              confidence = 0.5;
            }
            break;
          }
          case 'vest': {
            const torsoObjects = allObjects.filter((o) => isInRegion(o, regions.torso));
            if (torsoObjects.some((o) => ['backpack', 'handbag'].includes(o.class))) {
              status = 'detected';
              confidence = 0.5;
            } else {
              status = 'unknown';
              confidence = 0.3;
            }
            break;
          }
          case 'goggles':
          case 'mask': {
            const faceObjects = allObjects.filter((o) => isInRegion(o, regions.face));
            if (faceObjects.some((o) => ['cell phone', 'remote'].includes(o.class))) {
              status = 'detected';
              confidence = 0.4;
            } else {
              status = 'unknown';
              confidence = 0.3;
            }
            break;
          }
          case 'gloves':
            status = 'unknown';
            confidence = 0.2;
            break;
          case 'boots':
            status = 'unknown';
            confidence = 0.2;
            break;
          default:
            status = 'unknown';
            confidence = 0.1;
        }

        items.push({
          type: ppeType,
          status,
          confidence,
          detectionMethod: status === 'unknown' ? 'heuristic' : 'local-ml',
        });
      }

      return items;
    },
    []
  );

  return { detectWithLocalML };
}
