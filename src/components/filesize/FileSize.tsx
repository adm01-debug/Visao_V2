import React from 'react';

interface FileSizeProps {
  bytes: number;
  decimals?: number;
  className?: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function FileSize({ bytes, decimals = 2, className }: FileSizeProps) {
  return <span className={className}>{formatBytes(bytes, decimals)}</span>;
}

export default FileSize;
