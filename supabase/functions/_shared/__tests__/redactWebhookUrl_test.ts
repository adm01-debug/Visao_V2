import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { redactWebhookUrl, redactWebhookUrls } from '../redactWebhookUrl.ts';

Deno.test('backup nao leva usuario e senha da URL do webhook', () => {
  assertEquals(
    redactWebhookUrl('https://usuario:SenhaSecreta123@hooks.exemplo.com/alertas'),
    'https://hooks.exemplo.com/alertas'
  );
});

Deno.test('backup nao leva segredo em query string', () => {
  const saida = String(
    redactWebhookUrl('https://hooks.exemplo.com/n?token=abc123&canal=ti&apikey=xyz')
  );
  assertEquals(saida, 'https://hooks.exemplo.com/n?canal=ti');
  assert(!saida.includes('abc123'));
  assert(!saida.includes('xyz'));
});

Deno.test('token no caminho de servicos conhecidos sai redigido', () => {
  // Discord: id numerico + token; Slack: T/B/A seguidos de id numerico; o id
  // numerico do Discord precisa sobreviver para o destino ser reconhecivel.
  assertEquals(
    redactWebhookUrl(
      'https://discord.com/api/webhooks/123456789012345678/AbCdEfGh12345678XyZ_abcdefghijklmnop'
    ),
    'https://discord.com/api/webhooks/123456789012345678/REDACTED'
  );
  assertEquals(
    redactWebhookUrl(
      'https://hooks.slack.com/services/T00000000/B00000000/Xk1234567890abcdefghijklmn'
    ),
    'https://hooks.slack.com/services/T00000000/B00000000/REDACTED'
  );
});

Deno.test('URL sem credencial e caminho legivel passam inteiros', () => {
  assertEquals(
    redactWebhookUrl('https://alertas.minhaempresa.com.br/webhook/portaria'),
    'https://alertas.minhaempresa.com.br/webhook/portaria'
  );
  assertEquals(
    redactWebhookUrl('http://203.0.113.10:8080/avisos?canal=seguranca'),
    'http://203.0.113.10:8080/avisos?canal=seguranca'
  );
});

Deno.test('valor que nao e URL e devolvido como veio', () => {
  assertEquals(redactWebhookUrl('nao-e-url'), 'nao-e-url');
  assertEquals(redactWebhookUrl(null), null);
  assertEquals(redactWebhookUrl(undefined), undefined);
  assertEquals(redactWebhookUrl(42), 42);
});

Deno.test('lista de webhooks preserva a posicao de cada URL', () => {
  assertEquals(
    redactWebhookUrls([
      'https://a.com/h?token=1',
      'https://usuario:senha@b.com/h',
      'https://c.com/h/portaria',
    ]),
    ['https://a.com/h', 'https://b.com/h', 'https://c.com/h/portaria']
  );
  assertEquals(redactWebhookUrls(null), null);
  assertEquals(redactWebhookUrls('https://a.com/?key=1'), 'https://a.com/?key=1');
});
