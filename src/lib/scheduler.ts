/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: scheduler
 * 
 * Agendamento de tarefas com suporte a cron e intervalos
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScheduledTask {
  id: string;
  name: string;
  fn: () => Promise<void> | void;
  schedule: string | number; // cron string ou intervalo em ms
  status: TaskStatus;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  lastError?: Error;
  enabled: boolean;
}

export interface SchedulerOptions {
  maxConcurrent?: number;
  defaultRetries?: number;
  onError?: (task: ScheduledTask, error: Error) => void;
}

class Scheduler {
  private tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, NodeJS.Timeout | number>();
  private running = new Set<string>();
  private options: Required<SchedulerOptions>;

  constructor(options: SchedulerOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 10,
      defaultRetries: options.defaultRetries ?? 3,
      onError: options.onError ?? console.error,
    };
  }

  /**
   * Agenda uma tarefa com intervalo em ms
   */
  schedule(
    name: string,
    fn: () => Promise<void> | void,
    intervalMs: number,
    immediate = false
  ): string {
    const id = crypto.randomUUID();
    
    const task: ScheduledTask = {
      id,
      name,
      fn,
      schedule: intervalMs,
      status: 'pending',
      runCount: 0,
      errorCount: 0,
      enabled: true,
      nextRun: new Date(Date.now() + (immediate ? 0 : intervalMs)),
    };

    this.tasks.set(id, task);
    
    if (immediate) {
      this.runTask(id);
    }

    const timer = setInterval(() => this.runTask(id), intervalMs);
    this.timers.set(id, timer);

    return id;
  }

  /**
   * Agenda tarefa com expressão cron
   */
  cron(
    name: string,
    fn: () => Promise<void> | void,
    cronExpression: string
  ): string {
    const id = crypto.randomUUID();
    const nextRun = this.getNextCronDate(cronExpression);
    
    const task: ScheduledTask = {
      id,
      name,
      fn,
      schedule: cronExpression,
      status: 'pending',
      runCount: 0,
      errorCount: 0,
      enabled: true,
      nextRun,
    };

    this.tasks.set(id, task);
    this.scheduleCronTask(id, cronExpression);

    return id;
  }

  /**
   * Agenda próxima execução cron
   */
  private scheduleCronTask(id: string, cronExpression: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    const nextRun = this.getNextCronDate(cronExpression);
    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(() => {
      this.runTask(id);
      this.scheduleCronTask(id, cronExpression);
    }, delay);

    this.timers.set(id, timer);
    task.nextRun = nextRun;
  }

  /**
   * Executa uma tarefa
   */
  private async runTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;
    if (this.running.size >= this.options.maxConcurrent) return;
    if (this.running.has(id)) return;

    this.running.add(id);
    task.status = 'running';

    try {
      await task.fn();
      task.status = 'completed';
      task.runCount++;
      task.lastRun = new Date();
    } catch (error) {
      task.status = 'failed';
      task.errorCount++;
      task.lastError = error as Error;
      this.options.onError(task, error as Error);
    } finally {
      this.running.delete(id);
    }
  }

  /**
   * Cancela uma tarefa
   */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer as number);
      clearTimeout(timer as number);
      this.timers.delete(id);
    }

    task.status = 'cancelled';
    task.enabled = false;
    return true;
  }

  /**
   * Pausa uma tarefa
   */
  pause(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = false;
    return true;
  }

  /**
   * Retoma uma tarefa
   */
  resume(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = true;
    return true;
  }

  /**
   * Executa tarefa imediatamente
   */
  async runNow(id: string): Promise<void> {
    await this.runTask(id);
  }

  /**
   * Lista todas as tarefas
   */
  list(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Obtém tarefa por ID
   */
  get(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Remove tarefa
   */
  remove(id: string): boolean {
    this.cancel(id);
    return this.tasks.delete(id);
  }

  /**
   * Cancela todas as tarefas
   */
  cancelAll(): void {
    for (const id of this.tasks.keys()) {
      this.cancel(id);
    }
  }

  /**
   * Calcula próxima data cron (simplificado)
   */
  private getNextCronDate(expression: string): Date {
    const parts = expression.split(' ');
    const now = new Date();
    const next = new Date(now);
    
    // Formato: minuto hora dia mês diaSemana
    if (parts.length >= 2) {
      const [minute, hour] = parts;
      
      if (minute !== '*') next.setMinutes(parseInt(minute));
      if (hour !== '*') next.setHours(parseInt(hour));
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  }

  /**
   * Estatísticas do scheduler
   */
  stats(): {
    total: number;
    running: number;
    pending: number;
    failed: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }
}

// Instância singleton
export const scheduler = new Scheduler();

// Funções auxiliares
export function scheduleTask(
  name: string,
  fn: () => Promise<void> | void,
  intervalMs: number,
  immediate = false
): string {
  return scheduler.schedule(name, fn, intervalMs, immediate);
}

export function scheduleCron(
  name: string,
  fn: () => Promise<void> | void,
  cronExpression: string
): string {
  return scheduler.cron(name, fn, cronExpression);
}

export function cancelTask(id: string): boolean {
  return scheduler.cancel(id);
}

export default scheduler;
