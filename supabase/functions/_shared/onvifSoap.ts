// Onda 155 — transporte SOAP/ONVIF compartilhado.
//
// Extraído de camera-io-control (Onda 154) para que o puller de eventos e o
// controle de I/O falem exatamente o mesmo dialeto com o equipamento. Duas
// implementações de WS-Security divergindo é como se descobre, seis meses
// depois, que metade da frota autentica e a outra metade não.
//
// Notas de campo embutidas aqui:
//  - O digest usa SHA-1 por definição do perfil UsernameToken. Não é escolha
//    de segurança nossa: trocar por SHA-256 faz o equipamento recusar.
//  - Timeout é sempre explícito. `PullMessages` é chamada de espera longa e
//    precisa de um teto maior que o das chamadas comuns, mas nunca infinito:
//    conexão pendurada em Edge Function é vazamento de recurso pago.
//  - Falha de rede NUNCA vira exceção: devolvemos `status: 0`, para que a
//    camada de decisão classifique como transporte em vez de estourar.

export function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
  );
}

/** Cabeçalho WS-Security UsernameToken/PasswordDigest. */
export async function wsseHeader(username: string, password: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const created = new Date().toISOString();
  const enc = new TextEncoder();
  const passBytes = enc.encode(password);
  const createdBytes = enc.encode(created);
  const buf = new Uint8Array(nonce.length + createdBytes.length + passBytes.length);
  buf.set(nonce, 0);
  buf.set(createdBytes, nonce.length);
  buf.set(passBytes, nonce.length + createdBytes.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', buf));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `<s:Header>
    <Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${escapeXml(username)}</Username>
        <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${b64(digest)}</Password>
        <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${b64(nonce)}</Nonce>
        <Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${created}</Created>
      </UsernameToken>
    </Security>
  </s:Header>`;
}

const NAMESPACES = [
  'xmlns:s="http://www.w3.org/2003/05/soap-envelope"',
  'xmlns:tt="http://www.onvif.org/ver10/schema"',
  'xmlns:tds="http://www.onvif.org/ver10/device/wsdl"',
  'xmlns:tmd="http://www.onvif.org/ver10/deviceIO/wsdl"',
  'xmlns:tev="http://www.onvif.org/ver10/events/wsdl"',
  'xmlns:wsa="http://www.w3.org/2005/08/addressing"',
  'xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2"',
].join('\n  ');

export interface SoapResult {
  readonly ok: boolean;
  /** 0 significa que a requisição não chegou a receber resposta HTTP. */
  readonly status: number;
  readonly text: string;
}

export async function soapCall(
  url: string,
  headerXml: string,
  bodyXml: string,
  timeoutMs = 6000
): Promise<SoapResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope ${NAMESPACES}>
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (error) {
    return { ok: false, status: 0, text: String(error) };
  } finally {
    clearTimeout(timer);
  }
}
