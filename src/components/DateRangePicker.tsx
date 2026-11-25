import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}) => (
  <div className="flex items-center gap-2">
    <div>
      <Label htmlFor="date-range-start" className="text-xs">
        De
      </Label>
      <Input
        id="date-range-start"
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        aria-label="Data inicial"
        className="w-36"
      />
    </div>
    <div>
      <Label htmlFor="date-range-end" className="text-xs">
        Até
      </Label>
      <Input
        id="date-range-end"
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        aria-label="Data final"
        className="w-36"
      />
    </div>
  </div>
);

export default DateRangePicker;
