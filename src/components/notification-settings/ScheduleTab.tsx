import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Clock } from 'lucide-react';
import type { NotificationConfig } from './types';
import { DAYS_OF_WEEK } from './types';

interface ScheduleTabProps {
  config: NotificationConfig;
  onUpdate: (partial: Partial<NotificationConfig>) => void;
  onToggleDay: (day: number) => void;
}

export function ScheduleTab({ config, onUpdate, onToggleDay }: ScheduleTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Agendamento
        </CardTitle>
        <CardDescription>Configure horários específicos para receber notificações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Ativar Agendamento</p>
            <p className="text-sm text-muted-foreground">
              Receber notificações apenas em horários específicos
            </p>
          </div>
          <Switch
            checked={config.schedule_enabled}
            onCheckedChange={(schedule_enabled) => onUpdate({ schedule_enabled })}
          />
        </div>

        {config.schedule_enabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de Início</Label>
                <Input
                  type="time"
                  value={config.schedule_start_time ?? '08:00'}
                  onChange={(e) => onUpdate({ schedule_start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário de Fim</Label>
                <Input
                  type="time"
                  value={config.schedule_end_time ?? '22:00'}
                  onChange={(e) => onUpdate({ schedule_end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => onToggleDay(day.value)}
                    className={`w-12 h-12 rounded-lg font-medium transition-all ${
                      config.schedule_days?.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="space-y-4">
          <div>
            <Label>Intervalo entre Notificações (minutos)</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Tempo mínimo entre notificações para evitar spam
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.cooldown_minutes]}
              onValueChange={([value]) =>
                onUpdate({ cooldown_minutes: value ?? config.cooldown_minutes })
              }
              min={1}
              max={60}
              step={1}
              className="flex-1"
            />
            <span className="w-16 text-center font-medium">{config.cooldown_minutes} min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
