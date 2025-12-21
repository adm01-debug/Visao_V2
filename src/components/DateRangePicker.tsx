import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onStartChange, onEndChange }) => (
  <div className="flex items-center gap-2">
    <div>
      <Label className="text-xs">De</Label>
      <Input type="date" value={startDate} onChange={e => onStartChange(e.target.value)} className="w-36" />
    </div>
    <div>
      <Label className="text-xs">Até</Label>
      <Input type="date" value={endDate} onChange={e => onEndChange(e.target.value)} className="w-36" />
    </div>
  </div>
);

export default DateRangePicker;
