/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ScheduleEditor Component
 */

import { memo, useState } from 'react';
import { Clock, Plus, Trash2, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleData {
  enabled: boolean;
  days: number[]; // 0-6, Sunday = 0
  timeSlots: TimeSlot[];
}

interface ScheduleEditorProps {
  schedule: ScheduleData;
  onChange: (schedule: ScheduleData) => void;
  className?: string;
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const fullDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function ScheduleEditorComponent({
  schedule,
  onChange,
  className
}: ScheduleEditorProps) {
  const toggleEnabled = () => {
    onChange({ ...schedule, enabled: !schedule.enabled });
  };

  const toggleDay = (day: number) => {
    const newDays = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day].sort();
    onChange({ ...schedule, days: newDays });
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      startTime: '08:00',
      endTime: '18:00',
    };
    onChange({ ...schedule, timeSlots: [...schedule.timeSlots, newSlot] });
  };

  const removeTimeSlot = (id: string) => {
    onChange({
      ...schedule,
      timeSlots: schedule.timeSlots.filter(slot => slot.id !== id),
    });
  };

  const updateTimeSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    onChange({
      ...schedule,
      timeSlots: schedule.timeSlots.map(slot =>
        slot.id === id ? { ...slot, [field]: value } : slot
      ),
    });
  };

  const selectAllDays = () => {
    onChange({ ...schedule, days: [0, 1, 2, 3, 4, 5, 6] });
  };

  const selectWeekdays = () => {
    onChange({ ...schedule, days: [1, 2, 3, 4, 5] });
  };

  const selectWeekends = () => {
    onChange({ ...schedule, days: [0, 6] });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agendamento
          </CardTitle>
          <Switch checked={schedule.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-6", !schedule.enabled && "opacity-50 pointer-events-none")}>
        {/* Days Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Dias da Semana</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllDays}>Todos</Button>
              <Button variant="ghost" size="sm" onClick={selectWeekdays}>Úteis</Button>
              <Button variant="ghost" size="sm" onClick={selectWeekends}>Fim de Semana</Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            {dayNames.map((day, index) => (
              <button
                key={index}
                onClick={() => toggleDay(index)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  schedule.days.includes(index)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                title={fullDayNames[index]}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Horários</Label>
            <Button variant="outline" size="sm" onClick={addTimeSlot} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          {schedule.timeSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum horário definido (ativo 24h)
            </p>
          ) : (
            <div className="space-y-2">
              {schedule.timeSlots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(slot.id, 'startTime', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(slot.id, 'endTime', e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeSlot(slot.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {schedule.enabled && (
          <div className="p-3 rounded-lg bg-secondary/50 text-sm">
            <p className="font-medium mb-1">Resumo:</p>
            <p className="text-muted-foreground">
              {schedule.days.length === 7
                ? 'Todos os dias'
                : schedule.days.length === 0
                ? 'Nenhum dia selecionado'
                : schedule.days.map(d => dayNames[d]).join(', ')}
              {schedule.timeSlots.length > 0
                ? `, ${schedule.timeSlots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`
                : ' (24 horas)'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const ScheduleEditor = memo(ScheduleEditorComponent);
