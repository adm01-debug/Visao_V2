import { describe, expect, it } from 'vitest';
import {
  attachConsumer,
  completeDelivery,
  createFrameBus,
  describeBus,
  detachConsumer,
  publishFrame,
  type FrameConsumer,
} from '../frameBus';

const T0 = 1_700_000_000_000;
const consumer = (over: Partial<FrameConsumer> = {}): FrameConsumer => ({
  id: 'c1',
  minIntervalMs: 0,
  maxFrameAgeMs: 1_000,
  ...over,
});

describe('frameBus — Onda 207', () => {
  it('F1/F4: entrega o mesmo frame a todos os consumidores ociosos', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer({ id: 'a' }));
    bus = attachConsumer(bus, consumer({ id: 'b' }));
    const out = publishFrame(bus, { frameId: 1, capturedAtMs: T0 }, T0);
    expect(out.deliveries.map((d) => d.consumerId)).toEqual(['a', 'b']);
  });

  it('F2: consumidor ocupado guarda só a pendência mais recente', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer());
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 }, T0).bus;
    bus = publishFrame(bus, { frameId: 2, capturedAtMs: T0 + 10 }, T0 + 10).bus;
    const third = publishFrame(bus, { frameId: 3, capturedAtMs: T0 + 20 }, T0 + 20);
    expect(third.drops).toEqual([{ consumerId: 'c1', frameId: 2, reason: 'superseded' }]);
    expect(third.bus.slots['c1']?.pending?.frameId).toBe(3);
  });

  it('F2: concluir libera a pendência mais recente, nunca a antiga', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer());
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 }, T0).bus;
    bus = publishFrame(bus, { frameId: 2, capturedAtMs: T0 + 10 }, T0 + 10).bus;
    bus = publishFrame(bus, { frameId: 3, capturedAtMs: T0 + 20 }, T0 + 20).bus;
    const done = completeDelivery(bus, 'c1', 1, T0 + 30);
    expect(done.deliveries).toHaveLength(1);
    expect(done.deliveries[0]?.frameId).toBe(3);
    expect(done.deliveries[0]?.fromPending).toBe(true);
  });

  it('F3: frame fora de ordem é descartado sem entrega', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer());
    bus = publishFrame(bus, { frameId: 5, capturedAtMs: T0 }, T0).bus;
    bus = completeDelivery(bus, 'c1', 5, T0 + 1).bus;
    const late = publishFrame(bus, { frameId: 4, capturedAtMs: T0 + 2 }, T0 + 2);
    expect(late.drops[0]?.reason).toBe('out_of_order');
    expect(late.deliveries).toHaveLength(0);
    expect(late.bus.droppedOutOfOrder).toBe(1);
  });

  it('F5: frame vencido não é entregue nem saindo da pendência', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer({ maxFrameAgeMs: 100 }));
    const stale = publishFrame(bus, { frameId: 1, capturedAtMs: T0 - 500 }, T0);
    expect(stale.deliveries).toHaveLength(0);
    expect(stale.drops[0]?.reason).toBe('stale');

    bus = publishFrame(stale.bus, { frameId: 2, capturedAtMs: T0 }, T0).bus;
    bus = publishFrame(bus, { frameId: 3, capturedAtMs: T0 + 5 }, T0 + 5).bus;
    const done = completeDelivery(bus, 'c1', 2, T0 + 900);
    expect(done.deliveries).toHaveLength(0);
    expect(done.drops[0]?.reason).toBe('stale');
  });

  it('F6: desligar mata a pendência e conclusão tardia vira detached', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer());
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 }, T0).bus;
    bus = detachConsumer(bus, 'c1');
    const late = completeDelivery(bus, 'c1', 1, T0 + 5);
    expect(late.drops[0]?.reason).toBe('detached');
    expect(late.deliveries).toHaveLength(0);
  });

  it('F8: consumidor sem nenhuma entrega aparece como starved, nunca idle', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer({ maxFrameAgeMs: 1 }));
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 - 100 }, T0).bus;
    const view = describeBus(bus);
    expect(view.consumers[0]?.health).toBe('starved');
    expect(view.consumers[0]?.stats.droppedStale).toBe(1);
  });

  it('piso de cadência do consumidor é respeitado', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer({ minIntervalMs: 500 }));
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 }, T0).bus;
    bus = completeDelivery(bus, 'c1', 1, T0 + 10).bus;
    const soon = publishFrame(bus, { frameId: 2, capturedAtMs: T0 + 50 }, T0 + 50);
    expect(soon.drops[0]?.reason).toBe('interval');
    const later = publishFrame(soon.bus, { frameId: 3, capturedAtMs: T0 + 600 }, T0 + 600);
    expect(later.deliveries).toHaveLength(1);
  });

  it('reinscrever preserva os contadores acumulados', () => {
    let bus = attachConsumer(createFrameBus('cam'), consumer({ maxFrameAgeMs: 1 }));
    bus = publishFrame(bus, { frameId: 1, capturedAtMs: T0 - 100 }, T0).bus;
    bus = attachConsumer(bus, consumer({ maxFrameAgeMs: 5_000 }));
    expect(bus.slots['c1']?.stats.droppedStale).toBe(1);
    expect(bus.order).toEqual(['c1']);
  });
});
