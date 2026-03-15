import { describe, it, expect } from "vitest";
import { Queue, createQueue } from "@/lib/queue";

describe("Queue", () => {
  it("starts empty", () => {
    const q = new Queue<number>();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it("enqueue adds items", () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.size()).toBe(2);
    expect(q.isEmpty()).toBe(false);
  });

  it("dequeue returns FIFO order", () => {
    const q = new Queue<string>();
    q.enqueue("a");
    q.enqueue("b");
    q.enqueue("c");
    expect(q.dequeue()).toBe("a");
    expect(q.dequeue()).toBe("b");
    expect(q.dequeue()).toBe("c");
    expect(q.dequeue()).toBeUndefined();
  });

  it("peek returns first without removing", () => {
    const q = new Queue<number>();
    q.enqueue(10);
    q.enqueue(20);
    expect(q.peek()).toBe(10);
    expect(q.size()).toBe(2);
  });

  it("peek returns undefined when empty", () => {
    expect(new Queue().peek()).toBeUndefined();
  });

  it("clear empties queue", () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    q.clear();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it("handles mixed types", () => {
    const q = new Queue<{ id: number }>();
    q.enqueue({ id: 1 });
    q.enqueue({ id: 2 });
    expect(q.dequeue()).toEqual({ id: 1 });
  });

  it("createQueue factory works", () => {
    const q = createQueue<number>();
    q.enqueue(42);
    expect(q.dequeue()).toBe(42);
  });

  it("stress test: 1000 items", () => {
    const q = new Queue<number>();
    for (let i = 0; i < 1000; i++) q.enqueue(i);
    expect(q.size()).toBe(1000);
    for (let i = 0; i < 1000; i++) expect(q.dequeue()).toBe(i);
    expect(q.isEmpty()).toBe(true);
  });
});
