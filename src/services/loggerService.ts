type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry { level: LogLevel; message: string; data?: any; timestamp: Date; context?: string; }

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel: LogLevel = 'debug';
  private levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

  setMinLevel(level: LogLevel): void { this.minLevel = level; }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = { level, message, data, timestamp: new Date(), context };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    const style = { debug: 'color: gray', info: 'color: blue', warn: 'color: orange', error: 'color: red' };
    console[level](`%c[${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}`, style[level], data || '');
  }

  debug(message: string, data?: any, context?: string): void { this.log('debug', message, data, context); }
  info(message: string, data?: any, context?: string): void { this.log('info', message, data, context); }
  warn(message: string, data?: any, context?: string): void { this.log('warn', message, data, context); }
  error(message: string, data?: any, context?: string): void { this.log('error', message, data, context); }

  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(l => l.level === level) : [...this.logs];
  }

  clear(): void { this.logs = []; }
  
  export(): string { return JSON.stringify(this.logs, null, 2); }
}

export const loggerService = new LoggerService();
export default loggerService;
