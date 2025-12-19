import { useState } from 'react';
import { Plus, Search, Filter, Shield, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import { Rule, AlertType } from '@/types/surveillance';
import { mockRules } from '@/data/mockRules';
import { RuleCard } from './RuleCard';
import { RuleEditor } from './RuleEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const categoryTabs: { value: string; label: string; icon: typeof Shield }[] = [
  { value: 'all', label: 'Todas', icon: Filter },
  { value: 'security', label: 'Segurança', icon: Shield },
  { value: 'productivity', label: 'Produtividade', icon: TrendingUp },
  { value: 'safety', label: 'Seg. Trabalho', icon: AlertTriangle },
  { value: 'intrusion', label: 'Intrusão', icon: Lock },
];

export function RulesPanel() {
  const [rules, setRules] = useState<Rule[]>(mockRules);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || rule.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleRule = (id: string, isActive: boolean) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, isActive, updatedAt: new Date() } : rule
    ));
    toast.success(isActive ? 'Regra ativada' : 'Regra desativada');
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setIsEditorOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
    toast.success('Regra excluída com sucesso');
  };

  const handleSaveRule = (ruleData: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      setRules(prev => prev.map(rule => 
        rule.id === editingRule.id 
          ? { ...rule, ...ruleData, updatedAt: new Date() }
          : rule
      ));
      toast.success('Regra atualizada com sucesso');
    } else {
      const newRule: Rule = {
        ...ruleData,
        id: `rule-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRules(prev => [newRule, ...prev]);
      toast.success('Regra criada com sucesso');
    }
    setEditingRule(null);
  };

  const handleNewRule = () => {
    setEditingRule(null);
    setIsEditorOpen(true);
  };

  const activeRulesCount = rules.filter(r => r.isActive).length;
  const categoryStats = categoryTabs.slice(1).map(cat => ({
    ...cat,
    count: rules.filter(r => r.category === cat.value).length,
  }));

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regras de Detecção</h1>
          <p className="text-muted-foreground mt-1">
            Configure comportamentos que devem gerar alertas
          </p>
        </div>
        <Button onClick={handleNewRule} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-primary">{rules.length}</p>
          <p className="text-sm text-muted-foreground">Total de Regras</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-success">{activeRulesCount}</p>
          <p className="text-sm text-muted-foreground">Ativas</p>
        </div>
        {categoryStats.slice(0, 3).map(stat => (
          <div key={stat.value} className="glass-card p-4 text-center hidden md:block">
            <p className="text-3xl font-bold text-foreground">{stat.count}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 animate-fade-in-delay-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar regras..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="animate-fade-in-delay-1">
        <TabsList className="bg-secondary/30">
          {categoryTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredRules.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma regra encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Tente ajustar sua busca'
                  : 'Crie sua primeira regra de detecção'
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleNewRule} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Regra
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggleRule}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rule Editor Modal */}
      <RuleEditor
        rule={editingRule}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
      />
    </div>
  );
}
