/**
 * VISÃO - Detection Sidebar
 */
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecognitionResult } from '@/hooks/useMultiCameraRecognition';

interface DetectionSidebarProps {
  results: RecognitionResult[];
  personsCache: React.MutableRefObject<
    Map<string, { name: string; listType: string; photoUrl: string | null }>
  >;
}

export function DetectionSidebar({ results, personsCache }: DetectionSidebarProps) {
  return (
    <div className="w-80 border-l bg-card hidden lg:block">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Detecções Recentes</h3>
        <p className="text-sm text-muted-foreground">{results.length} detecções</p>
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-2 space-y-2">
          {results.slice(0, 20).map((result, idx) => (
            <div
              key={`${result.cameraId}-${result.timestamp.getTime()}-${idx}`}
              className={cn(
                'p-3 rounded-lg border',
                result.isBlacklist && 'border-destructive bg-destructive/5'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  {result.personId && personsCache.current.get(result.personId)?.photoUrl ? (
                    <AvatarImage src={personsCache.current.get(result.personId)!.photoUrl!} />
                  ) : null}
                  <AvatarFallback
                    className={
                      result.isBlacklist ? 'bg-destructive text-destructive-foreground' : ''
                    }
                  >
                    {result.personName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{result.personName}</span>
                    {result.isBlacklist && (
                      <Badge variant="destructive" className="text-xs">
                        Blacklist
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{result.cameraName}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{result.timestamp.toLocaleTimeString('pt-BR')}</span>
                    {result.confidence > 0 && (
                      <span>• {(result.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                {result.isBlacklist ? (
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : result.personId ? (
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                ) : null}
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma detecção ainda</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
