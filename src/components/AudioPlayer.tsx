/**
 * Audio Player Component
 * Custom audio player with waveform visualization
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Download } from 'lucide-react';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  src: string;
  duration?: number;
  cover?: string;
}

export interface AudioPlayerProps {
  tracks: AudioTrack[];
  autoPlay?: boolean;
  showPlaylist?: boolean;
  showWaveform?: boolean;
  showDownload?: boolean;
  onTrackChange?: (track: AudioTrack) => void;
  onEnded?: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  tracks,
  autoPlay = false,
  showPlaylist = true,
  showWaveform = false,
  showDownload = true,
  onTrackChange,
  onEnded,
  className,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isRepeat, onEnded]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    onTrackChange?.(currentTrack);
    if (autoPlay && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentIndex]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else {
      setCurrentIndex(prev => (prev === 0 ? tracks.length - 1 : prev - 1));
    }
  }, [currentTime, tracks.length]);

  const handleNext = useCallback(() => {
    if (isShuffle) {
      let next = Math.floor(Math.random() * tracks.length);
      while (next === currentIndex && tracks.length > 1) {
        next = Math.floor(Math.random() * tracks.length);
      }
      setCurrentIndex(next);
    } else {
      setCurrentIndex(prev => (prev === tracks.length - 1 ? 0 : prev + 1));
    }
  }, [isShuffle, currentIndex, tracks.length]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current) return;
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentTrack.src;
    link.download = `${currentTrack.title}.mp3`;
    link.click();
  };

  return (
    <div className={cn('audio-player bg-card border rounded-lg p-4', className)}>
      <audio ref={audioRef} src={currentTrack?.src} preload="metadata" />

      {/* Track info */}
      <div className="flex items-center gap-4 mb-4">
        {currentTrack?.cover ? (
          <img src={currentTrack.cover} alt="" className="w-16 h-16 rounded object-cover" />
        ) : (
          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
            <Volume2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{currentTrack?.title || 'Sem título'}</h4>
          <p className="text-sm text-muted-foreground truncate">{currentTrack?.artist || 'Artista desconhecido'}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-2 bg-muted rounded-full cursor-pointer group"
        >
          <div
            className="h-full bg-primary rounded-full relative transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setIsShuffle(!isShuffle)}
          className={cn('p-2 rounded hover:bg-accent', isShuffle && 'text-primary')}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button onClick={handlePrev} className="p-2 rounded hover:bg-accent">
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          onClick={togglePlay}
          className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </button>
        <button onClick={handleNext} className="p-2 rounded hover:bg-accent">
          <SkipForward className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsRepeat(!isRepeat)}
          className={cn('p-2 rounded hover:bg-accent', isRepeat && 'text-primary')}
        >
          <Repeat className="h-4 w-4" />
        </button>
      </div>

      {/* Volume and extra controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMuted(!isMuted)} className="p-1 rounded hover:bg-accent">
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={isMuted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
            className="w-20 h-1 accent-primary"
          />
        </div>
        {showDownload && (
          <button onClick={handleDownload} className="p-2 rounded hover:bg-accent" title="Baixar">
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Playlist */}
      {showPlaylist && tracks.length > 1 && (
        <div className="mt-4 border-t pt-4 max-h-40 overflow-auto">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-3',
                index === currentIndex && 'bg-accent'
              )}
            >
              <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{track.title}</p>
                {track.artist && <p className="text-xs text-muted-foreground truncate">{track.artist}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
