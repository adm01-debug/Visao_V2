// URLs de webhook saem em arquivos que circulam fora do sistema (backup em
// JSON, e-mail, drive). Usuario/senha, query de segredo e token no path dao a
// quem tem o arquivo o poder de postar no webhook, entao sao removidos na
// exportacao. Host e caminho ficam: o destino continua reconhecivel e a
// importacao recria a configuracao.

const CHAVE_SECRETA_RE = /token|key|secret|sig|auth|password/i;
// Segmento opaco (Discord/Slack/Google Chat): longo e com letra e numero. O
// token do Slack comeca com X e tem 24+ caracteres; o do Discord, 68; o id
// numerico que vem antes dele nao casa porque nao tem letra.
const TOKEN_NO_PATH_RE = /^(?:X[A-Za-z0-9]{20,}|[A-Za-z0-9_-]{24,})$/;

/** Remove credenciais de uma URL de webhook; devolve o valor original se nao for URL. */
export function redactWebhookUrl(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return valor;
  }
  url.username = '';
  url.password = '';
  for (const chave of [...url.searchParams.keys()]) {
    if (CHAVE_SECRETA_RE.test(chave)) url.searchParams.delete(chave);
  }
  url.pathname = url.pathname
    .split('/')
    .map((parte) =>
      TOKEN_NO_PATH_RE.test(parte) && /[A-Za-z]/.test(parte) && /\d/.test(parte)
        ? 'REDACTED'
        : parte
    )
    .join('/');
  return url.toString();
}

/** Aplica `redactWebhookUrl` a uma lista, preservando valores que nao sejam array. */
export function redactWebhookUrls(valor: unknown): unknown {
  return Array.isArray(valor) ? valor.map(redactWebhookUrl) : valor;
}
