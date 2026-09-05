import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateInput } from '@/lib/dateUtils';

interface TimeAgoProps {
  date: Date | string;
  className?: string;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ date, className }) => {
  const d = parseDateInput(date);
  return (
    <time dateTime={d.toISOString()} className={className} title={d.toLocaleString('pt-BR')}>
      {formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}
    </time>
  );
};

export default TimeAgo;
