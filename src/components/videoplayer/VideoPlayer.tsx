import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

export function VideoPlayer({ src, poster, autoPlay, muted: initialMuted = false, controls = true, onPlay, onPause, onEnded, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay || false);
  const [muted, setMuted] = useState(initialMuted);
  const [progress, setProgress] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const toggle = () => {
    if (videoRef.current) {
      playing ? videoRef.current.pause() : videoRef.current.play();
      setPlaying(!playing);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateProgress = () => setProgress((video.currentTime / video.duration) * 100);
    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-black group', className)}>
      <video ref={videoRef} src={src} poster={poster} autoPlay={autoPlay} muted={muted}
        onPlay={() => { setPlaying(true); onPlay?.(); }}
        onPause={() => { setPlaying(false); onPause?.(); }}
        onEnded={onEnded}
        className="w-full h-full object-contain" />
      {controls && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-1 bg-white/30 rounded mb-2 cursor-pointer" onClick={e => {
            if (videoRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
            }
          }}><div className="h-full bg-primary rounded" style={{ width: `${progress}%` }} /></div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white" onClick={toggle}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="sm" className="text-white" onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => setFullscreen(!fullscreen)}>{fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
