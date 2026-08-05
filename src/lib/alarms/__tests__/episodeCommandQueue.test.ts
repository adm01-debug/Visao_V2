import { describe, expect, it } from 'vitest';
import {
  backoffMs,
  commandId,
  DEFAULT_QUEUE_CONFIG,
  dueCommands,
  emptyCommandQueue,
  enqueueCommands,
  markDelivered,
  markFailed,
  parseQueue,
  queueStats,
  queueStatusText,
  requeueDead,
  resolveQueueConfig,
  resumeAll,
  serializeQueue,
} from '../episodeCommandQueue';
import type { EpisodeCommand } from '../alarmEpisodeBridge';

const open = (key: string, at: number): EpisodeCommand => ({
  kind: 'open',
  seriesKey: key,
  at,
  severity: 'high',
});
const close = (key: string, at: number): EpisodeCommand => ({ kind: 'close', seriesKey: key, at });

describe('episodeCommandQueue — idempotência', () => {
  it('absorve o mesmo fato enfileirado duas vezes', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 100)], 0);
    q = enqueueCommands(q, [open('a', 100)], 50);
    expect(q.pending).toHaveLength(1);
    expect(q.pending[0].id).toBe(commandId(open('a', 100)));
  });

  it('descarta comandos malformados sem lançar', () => {
    const q = enqueueCommands(
      emptyCommandQueue(),
      [
        { kind: 'open', seriesKey: '', at: 1, severity: 'high' } as EpisodeCommand,
        { kind: 'open', seriesKey: 'a', at: Number.NaN, severity: 'high' } as EpisodeCommand,
        { kind: 'close', seriesKey: 'a', at: 10 },
      ],
      0
    );
    expect(q.pending).toHaveLength(1);
  });
});

describe('episodeCommandQueue — ordem e recuo', () => {
  it('entrega um por série, em ordem de carimbo', () => {
    const q = enqueueCommands(
      emptyCommandQueue(),
      [close('a', 200), open('a', 100), open('b', 50)],
      0
    );
    const due = dueCommands(q, 0);
    expect(due.map((d) => `${d.command.seriesKey}:${d.command.kind}`)).toEqual([
      'a:open',
      'b:open',
    ]);
  });

  it('série em recuo não bloqueia as demais', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1), open('b', 1)], 0);
    q = markFailed(q, commandId(open('a', 1)), 'retryable', 0, 'timeout');
    const due = dueCommands(q, 10);
    expect(due).toHaveLength(1);
    expect(due[0].command.seriesKey).toBe('b');
  });

  it('recuo cresce exponencialmente até o teto', () => {
    const cfg = resolveQueueConfig(null);
    expect(backoffMs(1, cfg)).toBe(cfg.baseBackoffMs);
    expect(backoffMs(4, cfg)).toBe(cfg.baseBackoffMs * 8);
    expect(backoffMs(99, cfg)).toBe(cfg.maxBackoffMs);
  });

  it('reconexão libera tudo que estava esperando', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    q = markFailed(q, commandId(open('a', 1)), 'retryable', 0, 'offline');
    expect(dueCommands(q, 1)).toHaveLength(0);
    q = resumeAll(q, 1);
    expect(dueCommands(q, 1)).toHaveLength(1);
  });
});

describe('episodeCommandQueue — falhas', () => {
  it('recusa definitiva vai direto para a carta morta', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    q = markFailed(q, commandId(open('a', 1)), 'permanent', 5, 'stale_record');
    expect(q.pending).toHaveLength(0);
    expect(q.dead[0].reason).toBe('permanent');
  });

  it('esgotar tentativas encerra a insistência', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    for (let i = 0; i < DEFAULT_QUEUE_CONFIG.maxAttempts; i += 1) {
      q = markFailed(q, commandId(open('a', 1)), 'retryable', i * 1000, 'timeout');
      q = resumeAll(q, i * 1000);
    }
    expect(q.pending).toHaveLength(0);
    expect(q.dead).toHaveLength(1);
  });

  it('carta morta pode voltar à fila zerada', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    q = markFailed(q, commandId(open('a', 1)), 'permanent', 5);
    q = requeueDead(q, commandId(open('a', 1)), 10);
    expect(q.dead).toHaveLength(0);
    expect(q.pending[0].attempts).toBe(0);
  });

  it('entrega confirmada remove o item', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    q = markDelivered(q, commandId(open('a', 1)));
    expect(q.pending).toHaveLength(0);
  });
});

describe('episodeCommandQueue — teto e persistência', () => {
  it('descarta os mais antigos e contabiliza', () => {
    const cmds = Array.from({ length: 12 }, (_, i) => open(`s${i}`, i));
    let q = emptyCommandQueue();
    cmds.forEach((c, i) => {
      q = enqueueCommands(q, [c], i, { maxPending: 5 });
    });
    expect(q.pending).toHaveLength(5);
    expect(q.dropped).toBe(7);
  });

  it('sobrevive ao F5 e ignora envelope inválido', () => {
    let q = enqueueCommands(emptyCommandQueue(), [open('a', 1), close('a', 2)], 0);
    q = markFailed(q, commandId(open('a', 1)), 'retryable', 0, 'timeout');
    const restored = parseQueue(serializeQueue(q, 100));
    expect(restored.pending).toHaveLength(2);
    expect(restored.pending[0].attempts).toBe(1);

    expect(parseQueue('{{{').pending).toHaveLength(0);
    expect(parseQueue(JSON.stringify({ version: 99, queue: q })).pending).toHaveLength(0);
  });

  it('resume o estado em português', () => {
    const q = enqueueCommands(emptyCommandQueue(), [open('a', 1)], 0);
    expect(queueStatusText(queueStats(q, 0))).toContain('1 a enviar');
    expect(queueStatusText(queueStats(emptyCommandQueue(), 0))).toContain('sincronizado');
  });
});
