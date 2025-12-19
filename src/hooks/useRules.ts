import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DbRule, DbRuleInsert, DbRuleUpdate } from '@/types/rules';
import { toast } from 'sonner';

export function useRules() {
  const [rules, setRules] = useState<DbRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar regras';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (rule: DbRuleInsert) => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      setRules(prev => [data, ...prev]);
      toast.success('Regra criada com sucesso');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar regra';
      toast.error(message);
      throw err;
    }
  };

  const updateRule = async (id: string, updates: DbRuleUpdate) => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === id ? data : r));
      toast.success('Regra atualizada com sucesso');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar regra';
      toast.error(message);
      throw err;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Regra excluída com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir regra';
      toast.error(message);
      throw err;
    }
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setRules(prev => prev.map(r => r.id === id ? data : r));
      toast.success(isActive ? 'Regra ativada' : 'Regra desativada');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar status da regra';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}
