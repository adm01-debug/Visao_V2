/**
 * Confetti Effect Component
 */
import React, { useEffect, useRef } from 'react';
export const Confetti: React.FC<{ active?: boolean; duration?: number }> = ({ active = true, duration = 3000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[] = [];
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
    for (let i = 0; i < 150; i++) particles.push({ x: Math.random() * canvas.width, y: -10, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * 8 + 4 });
    let animationId: number;
    const animate = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); animationId = requestAnimationFrame(animate); };
    animate();
    const timeout = setTimeout(() => cancelAnimationFrame(animationId), duration);
    return () => { cancelAnimationFrame(animationId); clearTimeout(timeout); };
  }, [active, duration]);
  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};
export default Confetti;
