import React from 'react';

interface KeyValueProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const KeyValue: React.FC<KeyValueProps> = ({ label, value, className }) => (
  <div className={`flex justify-between items-center py-2 ${className}`}>
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default KeyValue;
