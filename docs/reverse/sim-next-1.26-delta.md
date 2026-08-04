# Delta S.I.M Next (página de produto + changelog 1.26.2) vs VISÃO

Fonte: página oficial do produto (Intelbras, PT-BR) e lista de documentos publicados
(Manual 1.25.x, Changelog 1.26.2 de 14/07/2026). Documento clean-room: descreve
**comportamento anunciado**, nunca código, arte ou texto de UI do produto original
(ver `docs/reverse/legal.md`).

## 1. O que a página confirma do que já temos

| Anúncio do fabricante                  | Estado no VISÃO                                             |
| -------------------------------------- | ----------------------------------------------------------- |
| IA integrada / gestão de inteligências | Coberto (regras, faces, ALPR, comportamento)                |
| >100 dispositivos numa interface       | Coberto (frota 60+, mosaicos, saúde da frota)               |
| Multimonitor por saída de vídeo        | **Parcial** — mosaico existe, janela destacada não          |
| Conta na nuvem do fabricante           | Equivalente próprio (auth + organizações)                   |
| E-Map / planos e favoritos             | Planta baixa pronta; **favoritos de visualização ausentes** |

## 2. Lacunas novas identificadas nesta leitura

1. **Visualizações favoritas ("planos e favoritos")** — salvar um arranjo nomeado
   de mosaico (quais câmeras, em quais células, qual layout) e restaurá-lo em um
   clique. Hoje o mosaico é volátil por sessão.
2. **Conexão por "Registro"** (novidade da versão Beta) — o equipamento inicia a
   conexão de fora da rede em vez de o servidor discá-lo. Nosso agente local já
   faz túnel reverso; falta o **modelo de registro por dispositivo** com
   identidade e prova de posse, para NVR sem agente.
3. **Integração com controle de acesso (InControl)** — eventos de porta/leitor
   como origem de alarme no mesmo barramento multi-origem da Onda 178.
4. **Menu OSD do equipamento** — proxy de configuração da câmera (imagem, exposição)
   a partir do console, além do PTZ.
5. **Exportação para canais externos ("enviar vídeo direto")** — hoje só temos
   dossiê probatório; falta compartilhamento com link efêmero e marca d'água.
6. **Multimonitor real** — janela destacada em segunda tela (`window.open` +
   Broadcast Channel), sem duplicar consumo de stream do gravador.

## 3. Ordem recomendada (por risco × valor)

- **Onda 188 — Visualizações favoritas**: puro produto, baixo risco, alto uso diário.
- **Onda 189 — Multimonitor destacado**: reaproveita o stream já aberto.
- **Onda 190 — Registro de dispositivo**: exige identidade, segredo de registro
  rotacionável e RLS; tratar como onda de segurança, não de conveniência.
- **Onda 191 — Fan-in de controle de acesso**: encaixa direto na agregação de alarme.
- **Onda 192 — Proxy OSD**: depende de CGI por fabricante; menor paridade real.

## 4. Regras que não podem ser violadas nestas ondas

- Layout favorito é preferência do usuário: isolado por `user_id` com RLS, nunca global.
- Segredo de registro de dispositivo nunca volta em SELECT após a criação
  (hash no banco, valor exibido uma única vez).
- Link de compartilhamento é efêmero e assinado; nunca URL pública de balde.
- Evento de controle de acesso entra como origem no livro de alarme, jamais
  fecha episódio sozinho (regra da Onda 178: OR abre, AND fecha).
