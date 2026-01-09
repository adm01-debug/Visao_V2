// Queue Service - Projeto VISÃO
// Serviço de filas com tipagem forte

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  backoff?: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export type JobProcessor<T, R = void> = (job: Job<T>) => Promise<R>;

export interface QueueConfig {
  name: string;
  concurrency: number;
  defaultJobOptions?: JobOptions;
}

export interface QueueService<T = unknown> {
  add: (name: string, data: T, options?: JobOptions) => Promise<Job<T>>;
  process: <R>(processor: JobProcessor<T, R>) => void;
  getJob: (id: string) => Promise<Job<T> | null>;
  getJobs: (status?: JobStatus) => Promise<Job<T>[]>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  clean: (grace: number, status?: JobStatus) => Promise<string[]>;
}

const jobs = new Map<string, Job>();

export const createQueueService = <T>(config: QueueConfig): QueueService<T> => {
  let isPaused = false;

  const add = async (name: string, data: T, options?: JobOptions): Promise<Job<T>> => {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      name,
      data,
      status: options?.delay ? 'delayed' : 'pending',
      progress: 0,
      attempts: 0,
      maxAttempts: options?.attempts || config.defaultJobOptions?.attempts || 3,
      delay: options?.delay,
      backoff: options?.backoff,
      createdAt: new Date(),
    };
    jobs.set(job.id, job);
    return job;
  };

  const process = <R>(processor: JobProcessor<T, R>): void => {
    setInterval(async () => {
      if (isPaused) return;
      const pending = Array.from(jobs.values())
        .filter(j => j.status === 'pending')
        .slice(0, config.concurrency);
      
      for (const job of pending) {
        job.status = 'active';
        job.processedAt = new Date();
        try {
          job.result = await processor(job as Job<T>);
          job.status = 'completed';
          job.completedAt = new Date();
        } catch (err) {
          job.attempts++;
          job.error = err instanceof Error ? err.message : 'Unknown error';
          job.status = job.attempts >= job.maxAttempts ? 'failed' : 'pending';
        }
      }
    }, 1000);
  };

  const getJob = async (id: string) => (jobs.get(id) as Job<T>) || null;
  const getJobs = async (status?: JobStatus) => {
    const all = Array.from(jobs.values()) as Job<T>[];
    return status ? all.filter(j => j.status === status) : all;
  };
  const pause = async () => { isPaused = true; };
  const resume = async () => { isPaused = false; };
  const clean = async (grace: number, status?: JobStatus) => {
    const now = Date.now();
    const toRemove: string[] = [];
    jobs.forEach((job, id) => {
      if ((!status || job.status === status) && job.completedAt && now - job.completedAt.getTime() > grace) {
        toRemove.push(id);
        jobs.delete(id);
      }
    });
    return toRemove;
  };

  return { add, process, getJob, getJobs, pause, resume, clean };
};

export default createQueueService;
