import { useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCoverageStatus, type CoverageFileEntry } from "@/types/coverage";

const STATUS_CLASS: Record<ReturnType<typeof getCoverageStatus>, string> = {
  good: "text-success",
  warning: "text-warning",
  poor: "text-destructive",
};

const Pct = ({ value }: { value: number }) => (
  <span className={cn("tabular-nums", STATUS_CLASS[getCoverageStatus(value)])}>
    {value.toFixed(1)}%
  </span>
);

interface CoverageTableProps {
  files: CoverageFileEntry[];
}

export const CoverageTable = ({ files }: CoverageTableProps) => {
  const sorted = useMemo(
    () => [...files].sort((a, b) => a.statements.pct - b.statements.pct),
    [files],
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-right">Statements</TableHead>
                <TableHead className="text-right">Branches</TableHead>
                <TableHead className="text-right">Functions</TableHead>
                <TableHead className="text-right">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((file) => (
                <TableRow key={file.path}>
                  <TableCell className="font-mono text-xs">{file.path}</TableCell>
                  <TableCell className="text-right"><Pct value={file.statements.pct} /></TableCell>
                  <TableCell className="text-right"><Pct value={file.branches.pct} /></TableCell>
                  <TableCell className="text-right"><Pct value={file.functions.pct} /></TableCell>
                  <TableCell className="text-right"><Pct value={file.lines.pct} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
