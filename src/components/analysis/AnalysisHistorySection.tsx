/**
 * VISÃO - Analysis History Section
 */
import { History, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HistoryItem } from './HistoryItem';
import type { AnalysisHistoryEntry } from '@/types/continuousAnalysis';

interface AnalysisHistorySectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: AnalysisHistoryEntry[];
  onExport: () => void;
  onClear: () => void;
}

export function AnalysisHistorySection({ open, onOpenChange, history, onExport, onClear }: AnalysisHistorySectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <span className="flex items-center gap-2"><History className="w-4 h-4" />Histórico ({history.length})</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {history.length > 0 ? (
          <>
            <ScrollArea className="h-48 pr-4">
              <div className="space-y-1">
                {history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)}
              </div>
            </ScrollArea>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={onExport}><Download className="w-4 h-4 mr-1" />Exportar</Button>
              <Button variant="ghost" size="sm" onClick={onClear}><Trash2 className="w-4 h-4 mr-1" />Limpar</Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma análise no histórico</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
