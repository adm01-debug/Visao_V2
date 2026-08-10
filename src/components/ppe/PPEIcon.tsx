import { PPEType } from '@/hooks/usePPEDetection';

const icons: Record<PPEType, string> = {
  helmet: '🪖',
  vest: '🦺',
  goggles: '🥽',
  mask: '😷',
  gloves: '🧤',
  boots: '👢',
  earmuffs: '🎧',
  harness: '🪢',
};

export function PPEIcon({ type, className }: { type: PPEType; className?: string }) {
  return <span className={className}>{icons[type]}</span>;
}
