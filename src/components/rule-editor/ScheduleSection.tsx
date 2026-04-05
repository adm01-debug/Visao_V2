/**
 * VISÃO - Rule Schedule Section
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { weekDays, type RuleEditorFormData } from './RuleEditorConstants';

interface ScheduleSectionProps {
  schedule: RuleEditorFormData['schedule'];
  onChange: (schedule: RuleEditorFormData['schedule']) => void;
}

export function ScheduleSection({ schedule, onChange }: ScheduleSectionProps) {
  const toggleDay = (day: number) => {
    onChange({
      ...schedule,
      days: schedule.days.includes(day)
        ? schedule.days.filter(d => d !== day)
        : [...schedule.days, day],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Agendamento</Label>
        <Switch
          checked={schedule.enabled}
          onCheckedChange={(enabled) => onChange({ ...schedule, enabled })}
        />
      </div>

      {schedule.enabled && (
        <div className="space-y-3 p-3 bg-secondary/20 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Início</Label>
              <Input
                type="time"
                value={schedule.startTime}
                onChange={e => onChange({ ...schedule, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">Fim</Label>
              <Input
                type="time"
                value={schedule.endTime}
                onChange={e => onChange({ ...schedule, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Dias da Semana</Label>
            <div className="flex gap-1">
              {weekDays.map(day => (
                <Button
                  key={day.value}
                  type="button"
                  variant={schedule.days.includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 px-1"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
