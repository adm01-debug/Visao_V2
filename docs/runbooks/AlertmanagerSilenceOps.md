# Runbook — Operações de Silence do Alertmanager (VISÃO)

## Quando usar
- Manutenção planejada de infraestrutura (janela declarada).
- Deploy sabidamente ruidoso (canary / migração de storage).
- Alertas duplicados enquanto o time investiga incidente ativo.

**Nunca** silencie um alerta `critical` sem abrir incidente correspondente.

## Endpoints (Edge Function `alertmanager-silence`)

Base: `https://<supabase>/functions/v1/alertmanager-silence`. Sempre com `Authorization: Bearer <JWT do admin>`.

### 1. Criar silence a partir de um alerta ativo
```bash
curl -X POST "$FN?action=from_alert" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "alertname": "VisaoSloFastBurn",
    "labels": { "slo": "metrics_availability", "region": "us-east-1" },
    "durationMinutes": 60,
    "comment": "INC-1234 — investigando causa raiz"
  }'
```

### 2. Criar silence com matchers customizados
```bash
curl -X POST "$FN?action=create" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      { "name": "alertname", "value": "^VisaoBlackbox.*", "isRegex": true },
      { "name": "region", "value": "sa-east-1" }
    ],
    "durationMinutes": 120,
    "comment": "Manutenção CGNAT provedor SP — CHG-45"
  }'
```

### 3. Listar silences ativos
```bash
curl -H "Authorization: Bearer $JWT" "$FN?action=list"
```

### 4. Expirar silence (encerrar antes do prazo)
```bash
curl -X DELETE -H "Authorization: Bearer $JWT" "$FN?id=<silenceID>"
```

## Guard-rails aplicados
| Regra | Motivo |
|---|---|
| Duração min 5 min / max 24 h | Evita silence "eterno" esquecido. |
| Rejeita matchers `.*` / vazio | Silence global mascara qualquer incidente. |
| Máx. 12 matchers | Silence estreito demais raramente é intencional. |
| `comment` obrigatório | Auditoria: por que foi silenciado. |
| `from_alert` remove `instance` | Silence não deve ser por host, e sim por alerta/serviço. |
| Rate-limit 20 req/min/admin | Impede automação abusiva. |
| Auditoria imutável em `alertmanager_silences_audit` | Trilha regulatória. |

## Diagnóstico
```sql
-- Últimos silences criados por qualquer admin
SELECT created_at, action, silence_id, actor_user_id, duration_minutes, comment, status, error_message
FROM public.alertmanager_silences_audit
ORDER BY created_at DESC
LIMIT 50;

-- Silences criados mas que falharam upstream
SELECT * FROM public.alertmanager_silences_audit
WHERE status = 'error' AND created_at > now() - interval '24 hours';
```

## Falhas comuns
- `am_unreachable` → checar `ALERTMANAGER_URL`, VPN/mTLS e status do serviço.
- `invalid_silence_id` → o ID deve ser o UUID retornado pelo `silenceID` do POST.
- `comment_required` → adicione contexto operacional (ticket, changelog, etc.).
- `match_everything_forbidden` → estreite os matchers (adicione ao menos um narrowing).

## Relacionados
- `docs/runbooks/VisaoSloFastBurn.md`
- `docs/runbooks/VisaoDeployFreezeActive.md`
