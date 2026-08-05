/**
 * VISÃO - KPI Collaborator Card
 */
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { type CollaboratorKPI, getScoreColor, getScoreBg } from './goalsTypes';

interface CollaboratorKPICardProps {
  collaborator: CollaboratorKPI;
  index: number;
}

export function CollaboratorKPICard({ collaborator: c, index }: CollaboratorKPICardProps) {
  return (
    <motion.div
      className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium text-sm">{c.personName}</p>
          <p className="text-[10px] text-muted-foreground">{c.department || 'Sem dept.'}</p>
        </div>
        <div className="text-right">
          <span className={`text-xl font-bold ${getScoreColor(c.overallScore)}`}>
            {c.overallScore}
          </span>
          <p className="text-[9px] text-muted-foreground">Score</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${getScoreBg(c.overallScore)}`}
          initial={{ width: 0 }}
          animate={{ width: `${c.overallScore}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <div className="space-y-1.5">
        {c.kpis.map((k) => (
          <div key={k.goalId} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {k.status === 'on_track' ? (
                <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
              ) : k.status === 'warning' ? (
                <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
              )}
              <span className="truncate text-muted-foreground">{k.goalName}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`font-mono font-bold ${k.status === 'on_track' ? 'text-success' : k.status === 'warning' ? 'text-warning' : 'text-destructive'}`}
              >
                {k.current}
              </span>
              <span className="text-muted-foreground">
                / {k.target}
                {k.unit}
              </span>
              {k.direction === 'higher' ? (
                <TrendingUp
                  className={`h-3 w-3 ${k.deviation <= 0 ? 'text-success' : 'text-destructive'}`}
                />
              ) : (
                <TrendingDown
                  className={`h-3 w-3 ${k.deviation <= 0 ? 'text-success' : 'text-destructive'}`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
