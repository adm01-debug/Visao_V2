type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  fn: string;
  message: string;
  timestamp: string;
  duration_ms?: number;
  data?: Record<string, unknown>;
  traceId?: string;
}

const getTraceId = () => {
  // Em ambientes Deno/Edge, não temos um ThreadLocal nativo simples,
  // mas podemos tentar extrair de headers globais se estiverem disponíveis
  // em algum contexto compartilhado, ou deixar para injeção manual.
  return undefined;
};

class Logger {
  private level: LogLevel;
  private fnName: string;

  constructor(level: LogLevel = "info", fnName = "unknown") {
    this.level = level;
    this.fnName = fnName;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      fn: this.fnName,
      message,
      timestamp: new Date().toISOString(),
      traceId: data?.traceId as string | undefined || getTraceId(),
      ...(data && { data }),
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "error": console.error(output); break;
      case "warn": console.warn(output); break;
      default: console.log(output);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void { this.log("debug", message, data); }
  info(message: string, data?: Record<string, unknown>): void { this.log("info", message, data); }
  warn(message: string, data?: Record<string, unknown>): void { this.log("warn", message, data); }
  error(message: string, data?: Record<string, unknown>): void { this.log("error", message, data); }

  /** Create a timer to measure operation duration */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      this.info(`${label} completed`, { duration_ms: Date.now() - start });
    };
  }
}

/** Create a scoped logger for a specific edge function */
export function createLogger(fnName: string): Logger {
  return new Logger(Deno.env.get("LOG_LEVEL") as LogLevel || "info", fnName);
}

export const logger = new Logger(Deno.env.get("LOG_LEVEL") as LogLevel || "info");
