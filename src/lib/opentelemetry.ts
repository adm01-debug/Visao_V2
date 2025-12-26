/**
 * OpenTelemetry Integration
 */
export class Tracer {
  private spans: Map<string, { name: string; startTime: number; attributes: Record<string, any> }> = new Map();
  startSpan(name: string, attributes?: Record<string, any>): string {
    const id = crypto.randomUUID();
    this.spans.set(id, { name, startTime: performance.now(), attributes: attributes || {} });
    return id;
  }
  endSpan(id: string): { name: string; duration: number; attributes: Record<string, any> } | null {
    const span = this.spans.get(id);
    if (!span) return null;
    this.spans.delete(id);
    return { name: span.name, duration: performance.now() - span.startTime, attributes: span.attributes };
  }
}
export const tracer = new Tracer();
