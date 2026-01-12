import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps { src: string; title?: string; artist?: string; cover?: string; className?: string; }

export function AudioPlayer({ src, title, artist, cover, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', update);
    return () => audio.removeEventListener('timeupdate', update);
  }, []);

  const toggle = () => { audioRef.current && (playing ? audioRef.current.pause() : audioRef.current.play()); setPlaying(!playing); };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
  };

  return (
    <div className={cn('p-4 rounded-lg border bg-card flex items-center gap-4', className)}>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} />
      {cover && <img src={cover} alt="" className="w-16 h-16 rounded object-cover" />}
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        {artist && <p className="text-sm text-muted-foreground">{artist}</p>}
        <div className="h-1 bg-muted rounded mt-2 cursor-pointer" onClick={seek}><div className="h-full bg-primary rounded" style={{width: progress+'%'}} /></div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={toggle}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
        <Button variant="ghost" size="icon" onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
}

export default AudioPlayer;
