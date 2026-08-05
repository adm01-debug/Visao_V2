/**
 * Onda 155 — leitura das respostas ONVIF de eventos (PullPoint).
 *
 * Puro e sem rede, para ser exercitado no CI com respostas reais capturadas de
 * equipamento. Espelhado byte a byte em `supabase/functions/_shared/`.
 *
 * ## Por que não usar um parser de XML
 *
 * Porque o XML que chega de câmera de campo frequentemente **não é** XML
 * válido: prefixos de namespace inventados, entidades não escapadas dentro de
 * `SimpleItem/@Value`, e fabricantes que devolvem o corpo com BOM no meio.
 * Um parser estrito derruba a ingestão inteira por causa de uma câmera ruim.
 * Extração tolerante por padrão degrada apenas o evento malformado.
 *
 * ## Decisões
 *
 *  Q1 — **Prefixo de namespace é ignorado.** `tev:`, `wsnt:`, `ns3:` ou nenhum:
 *  casamos pelo nome local. Fabricante nenhum concorda sobre prefixo.
 *
 *  Q2 — **Fault é classificado, não apenas registrado.** A diferença entre
 *  "senha errada" e "link caiu" decide entre recolher a assinatura e recuar
 *  (P3 do ciclo de vida). Errar essa classificação é a diferença entre um
 *  alerta de manutenção acionável e um laço de tentativas invisível.
 *
 *  Q3 — **Evento sem instante do equipamento é descartado.** Sem `UtcTime` não
 *  existe chave de duplicidade estável, e sem ela a reentrega vira enxurrada —
 *  que, com a Onda 154 no laço, vira acionamento repetido de relé.
 *
 *  Q4 — **Funções totais.** Entrada lixo devolve lista vazia, nunca exceção.
 */

import type { PullPointFailureKind } from './pullPointLease.ts';

/** Um evento já normalizado, pronto para virar linha em `onvif_event_deliveries`. */
export interface ParsedOnvifEvent {
  readonly topic: string;
  readonly sourceToken: string | null;
  readonly utcTime: string;
  readonly propertyOperation: 'Initialized' | 'Changed' | 'Deleted' | null;
  readonly source: Record<string, string>;
  readonly data: Record<string, string>;
}

/** Casa `<qualquerprefixo:Nome ...>...</...>` sem exigir prefixo (Q1). */
function localTagRegex(name: string, flags = 'gi'): RegExp {
  return new RegExp(
    `<(?:[A-Za-z0-9_.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[A-Za-z0-9_.-]+:)?${name}>`,
    flags
  );
}

function firstTagContent(xml: string, name: string): string | null {
  const m = localTagRegex(name, 'i').exec(xml);
  return m ? (m[1] ?? '').trim() : null;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag);
  return m ? (m[1] ?? null) : null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Extrai os `SimpleItem` de um bloco (`Source`, `Data`, `Key`). */
function simpleItems(block: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!block) return out;
  const re = /<(?:[A-Za-z0-9_.-]+:)?SimpleItem\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const tag = m[1] ?? '';
    const name = attr(tag, 'Name');
    const value = attr(tag, 'Value');
    if (name !== null) out[decodeEntities(name)] = decodeEntities(value ?? '');
  }
  return out;
}

/**
 * Endereço e prazo devolvidos por `CreatePullPointSubscription` ou `Renew`.
 *
 * `terminationTime` e `currentTime` vêm do relógio do EQUIPAMENTO. Quem chama
 * deve calcular o empréstimo pela *diferença* entre os dois (que é imune ao
 * desvio de relógio) e não pelo `terminationTime` absoluto — a armadilha que a
 * simulação da etapa 15 expôs.
 */
export interface ParsedSubscribeResponse {
  readonly address: string | null;
  readonly terminationTime: string | null;
  readonly currentTime: string | null;
}

export function parseSubscribeResponse(xml: string): ParsedSubscribeResponse {
  if (typeof xml !== 'string' || xml.length === 0) {
    return { address: null, terminationTime: null, currentTime: null };
  }
  const ref = firstTagContent(xml, 'SubscriptionReference') ?? xml;
  return {
    address: firstTagContent(ref, 'Address'),
    terminationTime: firstTagContent(xml, 'TerminationTime'),
    currentTime: firstTagContent(xml, 'CurrentTime'),
  };
}

/**
 * Empréstimo em ms, medido pela diferença entre os dois carimbos do próprio
 * equipamento. Devolve `null` quando os carimbos são inutilizáveis — o chamador
 * então cai no valor nominal, e a regra de renovação (P8) protege o resto.
 */
export function leaseFromDeviceClocks(
  currentTime: string | null,
  terminationTime: string | null
): number | null {
  if (!currentTime || !terminationTime) return null;
  const start = Date.parse(currentTime);
  const end = Date.parse(terminationTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const delta = end - start;
  return delta > 0 ? delta : null;
}

/** Eventos de uma resposta de `PullMessages`. */
export function parsePullMessages(xml: string): ParsedOnvifEvent[] {
  if (typeof xml !== 'string' || xml.length === 0) return [];
  const events: ParsedOnvifEvent[] = [];
  const re = localTagRegex('NotificationMessage');
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? '';
    const topicRaw = firstTagContent(block, 'Topic');
    if (!topicRaw) continue;
    // O tópico costuma vir com o dialeto ConcreteSet e prefixo tns1.
    const topic = decodeEntities(topicRaw.replace(/<[^>]*>/g, '').trim());
    if (topic.length === 0) continue;

    // Há DOIS elementos chamados `Message` aninhados: o envelope da notificação
    // e a mensagem em si. Só o interno carrega `UtcTime`, então escolhemos pelo
    // atributo, não pela posição — a ordem varia entre fabricantes.
    let messageAttrs: string | null = null;
    const tagRe = /<(?:[A-Za-z0-9_.-]+:)?Message\b([^>]*)>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(block)) !== null) {
      const attrs = tagMatch[1] ?? '';
      if (attr(attrs, 'UtcTime') !== null) {
        messageAttrs = attrs;
        break;
      }
    }
    const utcTime = messageAttrs ? attr(messageAttrs, 'UtcTime') : null;
    // Q3 — sem instante do equipamento não há chave estável de duplicidade.
    if (!utcTime) continue;

    const rawOp = messageAttrs ? attr(messageAttrs, 'PropertyOperation') : null;

    const propertyOperation =
      rawOp === 'Initialized' || rawOp === 'Changed' || rawOp === 'Deleted' ? rawOp : null;

    const source = simpleItems(firstTagContent(block, 'Source'));
    const data = simpleItems(firstTagContent(block, 'Data'));
    const sourceToken =
      source.InputToken ??
      source.RelayToken ??
      source.VideoSourceConfigurationToken ??
      source.Token ??
      source.Source ??
      null;

    events.push({ topic, sourceToken, utcTime, propertyOperation, source, data });
  }

  return events;
}

/**
 * Classifica a resposta do equipamento na taxonomia de retentativa (Q2).
 *
 * Cuidado deliberado: só devolvemos `unsupported` diante de evidência textual
 * do próprio equipamento. Classificar erro genérico como permanente cegaria a
 * câmera para sempre por causa de uma resposta ruim isolada — o falso negativo
 * mais caro deste subsistema.
 */
export function classifySoapFailure(status: number, body: string): PullPointFailureKind {
  if (status === 0) return 'transport';
  if (status === 401 || status === 403) return 'auth';

  const text = (body ?? '').toLowerCase();
  if (
    text.includes('notauthorized') ||
    text.includes('not authorized') ||
    text.includes('sender not authorized') ||
    text.includes('wsse:failedauthentication') ||
    text.includes('failedauthentication')
  ) {
    return 'auth';
  }
  if (
    text.includes('actionnotsupported') ||
    text.includes('action not supported') ||
    text.includes('optionalfeaturenotsupported') ||
    text.includes('nosuchservice') ||
    status === 404 ||
    status === 405
  ) {
    return 'unsupported';
  }
  if (status >= 500 || text.includes('<s:fault') || text.includes(':fault>')) {
    return 'device_fault';
  }
  return status >= 400 ? 'device_fault' : 'none';
}

/**
 * Referência de assinatura vencida/desconhecida — o equipamento diz, de várias
 * formas diferentes, "esse endereço não existe mais". Precisa virar recriação,
 * não recuo: insistir em `Renew` sobre referência morta é o laço estéril que a
 * regra P2 existe para evitar.
 */
export function isDeadSubscriptionFault(body: string): boolean {
  const text = (body ?? '').toLowerCase();
  return (
    text.includes('resourceunknown') ||
    text.includes('unabletodestroysubscription') ||
    text.includes('invalidmessage') ||
    text.includes('no such subscription') ||
    text.includes('subscription not found') ||
    text.includes('unacceptableterminationtime')
  );
}
