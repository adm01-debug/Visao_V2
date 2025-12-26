/**
 * Jaeger Tracing
 */
export interface Span { traceId: string; spanId: string; operationName: string; startTime: number; duration: number; tags: Record<string, any>; }
export class JaegerClient {
  private spans: Span[] = [];
  startSpan(operationName: string, tags?: Record<string, any>): Span {
    return { traceId: crypto.randomUUID(), spanId: crypto.randomUUID(), operationName, startTime: Date.now(), duration: 0, tags: tags || {} };
  }
  finishSpan(span: Span): void { span.duration = Date.now() - span.startTime; this.spans.push(span); }
  getTraces(): Span[] { return this.spans; }
}
export const jaeger = new JaegerClient();
