import React from 'react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Monitor, MessageCircle, Users, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCallControlsProps { muted?: boolean; videoOff?: boolean; onToggleMute?: () => void; onToggleVideo?: () => void; onEndCall?: () => void; onShareScreen?: () => void; onChat?: () => void; onParticipants?: () => void; className?: string; }

export function VideoCallControls({ muted, videoOff, onToggleMute, onToggleVideo, onEndCall, onShareScreen, onChat, onParticipants, className }: VideoCallControlsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-4 p-4 bg-zinc-900 rounded-xl', className)}>
      <Button variant={muted ? 'destructive' : 'secondary'} size="icon" onClick={onToggleMute}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
      <Button variant={videoOff ? 'destructive' : 'secondary'} size="icon" onClick={onToggleVideo}>{videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</Button>
      <Button variant="secondary" size="icon" onClick={onShareScreen}><Monitor className="h-5 w-5" /></Button>
      <Button variant="secondary" size="icon" onClick={onChat}><MessageCircle className="h-5 w-5" /></Button>
      <Button variant="secondary" size="icon" onClick={onParticipants}><Users className="h-5 w-5" /></Button>
      <Button variant="destructive" size="icon" onClick={onEndCall}><PhoneOff className="h-5 w-5" /></Button>
    </div>
  );
}

export default VideoCallControls;
