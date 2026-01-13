import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Rule { id: string; condition: string; action: string; }
interface AlertRuleBuilderProps { rules?: Rule[]; onChange?: (rules: Rule[]) => void; className?: string; }

export function AlertRuleBuilder({ rules = [], onChange, className }: AlertRuleBuilderProps) {
  const addRule = () => onChange?.([...rules, { id: Date.now().toString(), condition: '', action: '' }]);
  const removeRule = (id: string) => onChange?.(rules.filter(r => r.id !== id));
  const updateRule = (id: string, field: 'condition' | 'action', value: string) => 
    onChange?.(rules.map(r => r.id === id ? { ...r, [field]: value } : r));

  return (
    <div className={cn('space-y-4', className)}>
      {rules.map(rule => (
        <div key={rule.id} className="flex gap-2 items-start p-4 rounded-lg border bg-card">
          <Bell className="h-5 w-5 text-primary mt-2" />
          <div className="flex-1 space-y-2">
            <select value={rule.condition} onChange={e => updateRule(rule.id, 'condition', e.target.value)}
              className="w-full p-2 rounded border text-sm">
              <option value="">Selecione condição...</option>
              <option value="motion">Movimento detectado</option>
              <option value="person">Pessoa detectada</option>
              <option value="vehicle">Veículo detectado</option>
              <option value="offline">Câmera offline</option>
            </select>
            <select value={rule.action} onChange={e => updateRule(rule.id, 'action', e.target.value)}
              className="w-full p-2 rounded border text-sm">
              <option value="">Selecione ação...</option>
              <option value="email">Enviar email</option>
              <option value="sms">Enviar SMS</option>
              <option value="push">Notificação push</option>
              <option value="webhook">Chamar webhook</option>
            </select>
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button onClick={addRule}><Plus className="h-4 w-4 mr-1" />Nova Regra</Button>
    </div>
  );
}

export default AlertRuleBuilder;
