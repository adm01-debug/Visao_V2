/**
 * Seletor de templates de regras pré-configuradas
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldAlert, Shield, Clock, Package, HardHat, Users, AlertTriangle,
  Scan, UserX, Car, TrendingUp, BarChart, Sparkles, Check
} from 'lucide-react';
import { ruleTemplates, RuleTemplate, getCategoryLabel, getSeverityLabel } from '@/data/ruleTemplates';
import { Database } from '@/integrations/supabase/types';

type RuleCategory = Database['public']['Enums']['rule_category'];

interface RuleTemplateSelectorProps {
  onSelectTemplate: (template: RuleTemplate) => void;
}

const iconMap: Record<string, React.ElementType> = {
  ShieldAlert, Shield, Clock, Package, HardHat, Users, AlertTriangle,
  Scan, UserX, Car, TrendingUp, BarChart
};

const colorMap: Record<string, string> = {
  red: 'bg-destructive/10 text-destructive border-destructive/20',
  orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  green: 'bg-green-500/10 text-green-600 border-green-500/20',
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

const severityColorMap: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-orange-500/10 text-orange-600',
  critical: 'bg-destructive/10 text-destructive'
};

export function RuleTemplateSelector({ onSelectTemplate }: RuleTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);

  const categories: RuleCategory[] = ['security', 'safety', 'access', 'operations', 'analytics'];

  const handleSelect = (template: RuleTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      setOpen(false);
      setSelectedTemplate(null);
    }
  };

  const renderTemplateCard = (template: RuleTemplate) => {
    const IconComponent = iconMap[template.icon] || ShieldAlert;
    const isSelected = selectedTemplate?.id === template.id;

    return (
      <Card 
        key={template.id}
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
        }`}
        onClick={() => handleSelect(template)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg border ${colorMap[template.color]}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            {isSelected && (
              <div className="p-1 rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          <CardTitle className="text-base mt-2">{template.name}</CardTitle>
          <CardDescription className="text-sm line-clamp-2">
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={severityColorMap[template.severity]}>
              {getSeverityLabel(template.severity)}
            </Badge>
            {template.actions.slice(0, 2).map(action => (
              <Badge key={action} variant="secondary" className="text-xs">
                {action}
              </Badge>
            ))}
            {template.actions.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{template.actions.length - 2}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Usar Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates de Regras
          </DialogTitle>
          <DialogDescription>
            Selecione um template pré-configurado para criar sua regra rapidamente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="security" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
                {getCategoryLabel(cat)}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] mt-4 pr-4">
            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ruleTemplates
                    .filter(t => t.category === category)
                    .map(renderTemplateCard)}
                </div>
                {ruleTemplates.filter(t => t.category === category).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum template disponível nesta categoria
                  </div>
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTemplate}>
            Usar Template Selecionado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
