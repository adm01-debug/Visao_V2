# 📖 Dicionário de Dados — VISÃO

Este documento mapeia as entidades de negócio às tabelas técnicas no banco de dados.

## Principais Entidades

| Entidade              | Tabela               | Descrição                             | Classificação LGPD   |
| --------------------- | -------------------- | ------------------------------------- | -------------------- |
| **Usuário**           | `profiles`           | Perfil estendido do usuário auth.     | PII (Nome, Avatar)   |
| **Câmera**            | `cameras`            | Dispositivos de captura de vídeo.     | Sensível (IP, Local) |
| **Alerta**            | `alerts`             | Eventos detectados por IA.            | Operacional          |
| **Pessoa Registrada** | `registered_persons` | Base para reconhecimento facial.      | Biométrica (Face)    |
| **Placa Registrada**  | `registered_plates`  | Base para ALPR.                       | PII (Placa)          |
| **Regra de Negócio**  | `rules`              | Configuração de automação e gatilhos. | Configuração         |
| **Zona**              | `zones`              | Áreas de interesse em uma câmera.     | Configuração         |
| **Log de Auditoria**  | `audit_logs`         | Rastro imutável de ações críticas.    | Auditoria            |

## Detalhamento de Colunas Críticas

### Tabela: `cameras`

- `id`: UUID (Primary Key)
- `user_id`: UUID (FK a auth.users)
- `name`: Nome identificador.
- `stream_url`: URL do stream (HLS/RTSP). **Dado Sensível.**
- `status`: `online`, `offline`, `maintenance`.
- `version`: Inteiro (Optimistic Locking).

### Tabela: `registered_persons`

- `id`: UUID
- `name`: Nome da pessoa.
- `list_type`: `whitelist`, `blacklist`, `vip`.
- `face_encoding`: Vetor numérico da face. **Biométrico.**

---

_Para o schema técnico completo, consulte `src/integrations/supabase/types.ts`._
