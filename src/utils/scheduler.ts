/**
 * Scheduler Utility
 */
type Task = { id: string; fn: () => void | Promise<void>; interval?: number; runAt?: Date; };
class Scheduler {
  private tasks = new Map<string, { task: Task; timer?: NodeJS.Timeout }>();
  schedule(task: Task): void {
    if (task.interval) {
      const timer = setInterval(() => task.fn(), task.interval);
      this.tasks.set(task.id, { task, timer });
    } else if (task.runAt) {
      const delay = task.runAt.getTime() - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => { task.fn(); this.tasks.delete(task.id); }, delay);
        this.tasks.set(task.id, { task, timer });
      }
    }
  }
  cancel(id: string): boolean {
    const entry = this.tasks.get(id);
    if (entry?.timer) { clearInterval(entry.timer); clearTimeout(entry.timer); this.tasks.delete(id); return true; }
    return false;
  }
  cancelAll(): void { this.tasks.forEach((_, id) => this.cancel(id)); }
}
export const scheduler = new Scheduler();
export default scheduler;
