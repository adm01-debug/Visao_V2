# ⚡ Edge Functions Quick Reference

## Funções Supabase Edge

---

## Lista de Funções

| Função | Método | Uso |
|--------|--------|-----|
| `analyze-image` | POST | Análise geral com IA |
| `detect-faces` | POST | Detecção de faces |
| `compare-faces` | POST | Comparação 1:1 |
| `generate-face-encoding` | POST | Gerar encoding 128D |
| `analyze-license-plate` | POST | OCR de placas |
| `send-alert-notification` | POST | Push/Email |
| `send-telegram` | POST | Mensagem Telegram |
| `check-ip` | POST | Validar IP |
| `get-mapbox-token` | GET | Token Mapbox |

---

## Chamada Rápida

```typescript
const { data } = await supabase.functions.invoke('detect-faces', {
  body: { imageBase64: 'data:image/...' },
});
```

---

## Deploy

```bash
supabase functions deploy
```

---

Veja [EDGE-FUNCTIONS.md](./EDGE-FUNCTIONS.md) para guia completo.
