import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiEffectProps { active: boolean; duration?: number; className?: string; }

export function ConfettiEffect({ active, duration = 3000, className }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if (active) {
      const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'];
      const newParticles = Array.from({ length: 100 }, (_, i) => ({
        id: i, x: Math.random() * 100, color: colors[Math.floor(Math.random() * colors.length)], delay: Math.random() * 500
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), duration);
    }
  }, [active, duration]);

  if (particles.length === 0) return null;

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50 overflow-hidden', className)}>
      {particles.map(p => (
        <div key={p.id} className="absolute w-2 h-2 animate-bounce" style={{
          left: `${p.x}%`, backgroundColor: p.color, animationDelay: `${p.delay}ms`,
          animation: `fall ${duration}ms linear forwards`, top: '-10px'
        }} />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}

export default ConfettiEffect;
