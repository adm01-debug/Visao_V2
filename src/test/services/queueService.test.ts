import { describe, it, expect } from "vitest";
import { createQueueService, type QueueConfig } from "@/services/queueService";

describe("QueueService", () => {
  const config: QueueConfig = { name: "test", concurrency: 2 };

  describe("add", () => {
    it("creates a job with pending status", async () => {
      const q = createQueueService(config);
      const job = await q.add("task1", { x: 1 });
      expect(job.id).toBeDefined();
      expect(job.status).toBe("pending");
      expect(job.name).toBe("task1");
      expect(job.data).toEqual({ x: 1 });
      expect(job.attempts).toBe(0);
    });

    it("creates delayed job", async () => {
      const q = createQueueService(config);
      const job = await q.add("delayed", {}, { delay: 5000 });
      expect(job.status).toBe("delayed");
    });

    it("sets maxAttempts from options", async () => {
      const q = createQueueService(config);
      const job = await q.add("retry", {}, { attempts: 5 });
      expect(job.maxAttempts).toBe(5);
    });

    it("uses default attempts from config", async () => {
      const q = createQueueService({ ...config, defaultJobOptions: { attempts: 10 } });
      const job = await q.add("def", {});
      expect(job.maxAttempts).toBe(10);
    });
  });

  describe("getJob", () => {
    it("retrieves existing job", async () => {
      const q = createQueueService(config);
      const job = await q.add("t", { val: 42 });
      const found = await q.getJob(job.id);
      expect(found).not.toBeNull();
      expect(found!.data).toEqual({ val: 42 });
    });
    it("returns null for missing", async () => {
      const q = createQueueService(config);
      expect(await q.getJob("nope")).toBeNull();
    });
  });

  describe("getJobs", () => {
    it("returns all jobs", async () => {
      const q = createQueueService(config);
      await q.add("a", {});
      await q.add("b", {});
      const jobs = await q.getJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });
    it("filters by status", async () => {
      const q = createQueueService(config);
      await q.add("a", {});
      await q.add("b", {}, { delay: 1000 });
      const pending = await q.getJobs("pending");
      const delayed = await q.getJobs("delayed");
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(delayed.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("pause/resume", () => {
    it("pause and resume without error", async () => {
      const q = createQueueService(config);
      await q.pause();
      await q.resume();
    });
  });
});
