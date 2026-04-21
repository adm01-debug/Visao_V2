import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeAgoProps {
  date: Date | string;
  className?: string;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({ date, className }) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return (
    <time dateTime={d.toISOString()} className={className} title={d.toLocaleString('pt-BR')}>
      {formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}
    </time>
  );
};

export default TimeAgo;
