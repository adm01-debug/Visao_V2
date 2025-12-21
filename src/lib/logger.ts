type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

const colors = {
  debug: '#9CA3AF',
  info: '#3B82F6',
  warn: '#F59E0B',
  error: '#EF4444',
};

function log(level: LogLevel, message: string, data?: unknown) {
  if (!isDev && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const style = `color: ${colors[level]}; font-weight: bold`;
  
  console.log(`%c[${level.toUpperCase()}] ${timestamp}`, style, message, data || '');
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
};
