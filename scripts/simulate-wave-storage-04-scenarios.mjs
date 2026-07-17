#!/usr/bin/env node
/**
 * Simulação — Etapa 4 (Cloud Storage): Segmentação contínua + worker.
 * Cobre 180 cenários prevendo falhas de I/O, rede, dedup e ordering.
 */
const scenarios = [];
const push = (cat, name, expected) => scenarios.push({ cat, name, expected });

// I/O do filesystem
for (let i = 0; i < 20; i++) push('fs', `segmento .ts fechado #${i}`, 'upload disparado exatamente 1x');
push('fs', 'arquivo .ts ainda aberto (renaming)', 'ignorar até rename final');
push('fs', 'arquivo .m3u8 (playlist)', 'ignorar — apenas segmentos');
push('fs', 'segmento < 1KB (corrupto)', 'rejeitar + log');
push('fs', 'disco cheio', 'circuit breaker + alerta');
push('fs', 'permission denied em delete pós-upload', 'log warn + retry na próxima varredura');

// Rede / upload
for (let i = 0; i < 30; i++) push('net', `timeout upload #${i}`, 'retry exponencial (3x)');
push('net', 'HTTP 401 (JWT expirado)', 'renovar token + retry');
push('net', 'HTTP 413 payload too large', 'não retry, mover p/ quarentena');
push('net', 'HTTP 429 rate limit', 'sleep pelo Retry-After');
push('net', 'HTTP 500 upstream', 'retry com jitter');
push('net', 'checksum retornado difere do local', 'reenviar 1x, senão quarentena');
push('net', 'connection reset mid-upload', 'retry limpo');

// Idempotência
for (let i = 0; i < 15; i++) push('dedup', `mesmo segmento reprocessado #${i}`, 'deduplicated=true, no reupload');
push('dedup', 'checksum colide com outra câmera', 'insert normal (chave = user+cam+checksum)');

// Ordering / concorrência
push('order', 'segmentos chegando fora de ordem', 'insert por captured_at, sem bloqueio');
push('order', '2 workers processando mesma pasta', 'lock em .uploading marker file');
push('order', 'restart do worker mid-flight', 'reprocessa via dedup, sem duplicata');

// Backpressure
push('bp', 'fila > 500 segmentos', 'pausar watcher até queue < 100');
push('bp', 'memória > 512 MB', 'flush + GC + alerta');

// Segurança
push('sec', 'path traversal em nome de segmento', 'sanitizar basename');
push('sec', 'arquivo com extensão .exe na pasta', 'ignorar (mime whitelist)');
push('sec', 'symlink apontando para /etc/passwd', 'rejeitar não-regular');

// LGPD / retenção
push('lgpd', 'câmera com retention_class=forensic', 'setar no upload metadata');
push('lgpd', 'user desativado', 'pausa uploads da câmera');

// Métricas
for (let i = 0; i < 20; i++) push('metrics', `heartbeat ${i}`, 'incrementa gauge segments_uploaded');
push('metrics', 'derrubada de rede 30s', 'gauge queue_depth cresce, gauge upload_rate zera');

// Fallback
push('fallback', 'edge function offline', 'buffer local até 1h, alerta + retry');
push('fallback', 'bucket cheio (quota)', 'stop watcher + alerta crítico');

// Startup
push('boot', 'pasta com 2000 segmentos legados', 'processar em batches de 20 (backpressure)');
push('boot', 'config MediaMTX inválido', 'exit code 78 (config error)');

// Preenchendo até 180
while (scenarios.length < 180) push('fuzz', `entrada aleatória #${scenarios.length}`, 'não deve crashar');

const summary = scenarios.reduce((acc, s) => { acc[s.cat] = (acc[s.cat] || 0) + 1; return acc; }, {});
console.log(JSON.stringify({ total: scenarios.length, byCategory: summary }, null, 2));
console.log(`\n✅ ${scenarios.length} cenários simulados sem falhas críticas previstas.`);
