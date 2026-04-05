/**
 * VISÃO - Goals Settings Panel
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { motion } from "framer-motion";
import { type KPIGoal } from "./goalsTypes";

interface GoalsSettingsPanelProps {
  goals: KPIGoal[];
  onToggle: (id: string) => void;
  onUpdateTarget: (id: string, value: number) => void;
}

export function GoalsSettingsPanel({ goals, onToggle, onUpdateTarget }: GoalsSettingsPanelProps) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuração de Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(g => (
              <div key={g.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{g.name}</Label>
                  <Switch checked={g.enabled} onCheckedChange={() => onToggle(g.id)} />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={g.target}
                    onChange={(e) => onUpdateTarget(g.id, Number(e.target.value))}
                    className="h-8 w-20 text-sm"
                    disabled={!g.enabled}
                  />
                  <span className="text-xs text-muted-foreground">{g.unit}</span>
                  <Badge variant="outline" className="text-[9px] ml-auto">
                    {g.direction === "higher" ? "↑ Maior melhor" : "↓ Menor melhor"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
