import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface OrgNode { id: string; name: string; role: string; avatar?: string; children?: OrgNode[]; }

interface OrgChartProps {
  data: OrgNode;
  className?: string;
}

function OrgCard({ node, isRoot }: { node: OrgNode; isRoot?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn('px-4 py-3 rounded-lg border bg-card text-center min-w-[150px]', isRoot && 'border-primary')}>
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {node.avatar ? <img src={node.avatar} alt="" className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-muted-foreground" />}
        </div>
        <p className="font-medium text-sm">{node.name}</p>
        <p className="text-xs text-muted-foreground">{node.role}</p>
      </div>
      {node.children && node.children.length > 0 && (
        <>
          <div className="w-0.5 h-6 bg-border" />
          <div className="flex gap-4">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="flex items-center">
                  {i > 0 && <div className="h-0.5 w-8 bg-border" />}
                  <div className="w-0.5 h-6 bg-border" />
                  {i < node.children!.length - 1 && <div className="h-0.5 w-8 bg-border" />}
                </div>
                <OrgCard node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgChart({ data, className }: OrgChartProps) {
  return (
    <div className={cn('overflow-auto p-4', className)}>
      <OrgCard node={data} isRoot />
    </div>
  );
}

export default OrgChart;
