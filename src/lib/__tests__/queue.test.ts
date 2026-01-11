import { describe, it, expect, vi } from 'vitest';
import { createQueue, Queue, PriorityQueue } from '../queue';

describe('queue utilities', () => {
  describe('Queue', () => {
    it('enqueues and dequeues items', () => {
      const queue = new Queue();
      queue.enqueue(1);
      queue.enqueue(2);
      expect(queue.dequeue()).toBe(1);
      expect(queue.dequeue()).toBe(2);
    });

    it('reports size correctly', () => {
      const queue = new Queue();
      queue.enqueue(1);
      queue.enqueue(2);
      expect(queue.size).toBe(2);
    });

    it('reports empty status', () => {
      const queue = new Queue();
      expect(queue.isEmpty).toBe(true);
      queue.enqueue(1);
      expect(queue.isEmpty).toBe(false);
    });

    it('peeks without removing', () => {
      const queue = new Queue();
      queue.enqueue(1);
      expect(queue.peek()).toBe(1);
      expect(queue.size).toBe(1);
    });
  });

  describe('PriorityQueue', () => {
    it('dequeues by priority', () => {
      const pq = new PriorityQueue();
      pq.enqueue('low', 3);
      pq.enqueue('high', 1);
      pq.enqueue('medium', 2);
      expect(pq.dequeue()).toBe('high');
      expect(pq.dequeue()).toBe('medium');
    });
  });
});
