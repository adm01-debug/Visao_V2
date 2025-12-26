/**
 * Changelog Display
 */
import React from 'react';
import { Sparkles, Bug, Zap } from 'lucide-react';
export interface ChangelogEntry { version: string; date: string; changes: { type: 'feature' | 'fix' | 'improvement'; description: string }[]; }
export const Changelog: React.FC<{ entries: ChangelogEntry[] }> = ({ entries }) => {
  const icons = { feature: <Sparkles className="h-4 w-4 text-green-500" />, fix: <Bug className="h-4 w-4 text-red-500" />, improvement: <Zap className="h-4 w-4 text-blue-500" /> };
  return (
    <div className="space-y-6">
      {entries.map(entry => (
        <div key={entry.version}>
          <div className="flex items-center gap-3 mb-3"><span className="text-lg font-semibold">v{entry.version}</span><span className="text-sm text-muted-foreground">{entry.date}</span></div>
          <ul className="space-y-2">{entry.changes.map((c, i) => (<li key={i} className="flex items-start gap-2">{icons[c.type]}<span>{c.description}</span></li>))}</ul>
        </div>
      ))}
    </div>
  );
};
export default Changelog;
