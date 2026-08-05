# SIM Play — Catálogo de referência (Fase 1)

> Documento vivo. Baseado em (a) metadados verificáveis do instalador
> `SimPlayInstaller.exe` v1.4.1 e (b) documentação pública Intelbras/Dahua.
> Nenhum código, ícone, string ou asset do SIM Play foi copiado.
> Somente **protocolos e comportamentos observáveis** são catalogados —
> engenharia reversa clean-room, no espírito descrito em `legal.md`.

## 1. Identificação do binário (verificado)

| Campo           | Valor                           |
| --------------- | ------------------------------- |
| Produto         | Intelbras SIM Play              |
| Versão          | 1.4.1                           |
| Empresa         | INTELBRAS S.A                   |
| Contato         | GRUPO.SOFTWARE@INTELBRAS.COM.BR |
| Assinatura      | GlobalSign → INTELBRAS S/A      |
| Empacotador     | Inno Setup 6.4.3 (Unicode)      |
| Arquitetura     | Win32 (x86, 32-bit)             |
| Tamanho payload | ~172 MiB comprimido             |

O payload interno **não foi decodificado** neste sandbox: Inno Setup 6.4.3
usa `Compression Method = 20` (LZMA2 com dicionário customizado + chunking
novo) que ainda não é suportado por nenhuma versão pública de
`innoextract` (testada até HEAD 1.10-dev / commit 6e9e34e). Para completar
a extração binária use uma máquina Windows real (ou wine com prefixo
inicializado) — o instalador aceita `/VERYSILENT /DIR=C:\SimPlay`.

## 2. Stack presumida (não confirmada por fonte primária Intelbras)

O manual oficial do SIM Play não lista SDKs internos, versões de FFmpeg
ou nomes de DLLs. As DLLs abaixo são **hipóteses** derivadas do fato de
que a Intelbras compartilha plataforma de hardware/firmware com a Dahua
(formato `.dav`, porta 37777, CGI compatível) — mas nenhuma delas foi
verificada dentro do payload 1.4.x neste sandbox:

| DLL provável                    | Origem           | Função                                            |
| ------------------------------- | ---------------- | ------------------------------------------------- |
| `dhnetsdk.dll`                  | Dahua NetSDK     | Login (`CLIENT_LoginEx2`), preview, PTZ, playback |
| `dhconfigsdk.dll`               | Dahua NetSDK     | Leitura/escrita de config remota                  |
| `dhplay.dll` / `playSDK.dll`    | Dahua Play SDK   | Decodificação `.dav` proprietário                 |
| `avnetsdk.dll`                  | Dahua NetSDK aux | Alarmes, event listener                           |
| `Qt5*.dll` / `Qt6*.dll`         | Qt Framework     | UI                                                |
| `avcodec*.dll`, `avformat*.dll` | FFmpeg           | Fallback H.264/H.265                              |
| `libcrypto*.dll`                | OpenSSL          | TLS + P2P handshake                               |

Requisitos declarados do SIM Play (Win10/11 x64, GPU dedicada
recomendada como GTX 1660) apontam para decodificação por hardware
via DXVA — coerente com pipelines FFmpeg/DirectShow, mas é inferência.

Referência: [Manual oficial SIM Play](https://manuais.intelbras.com.br/manual-software-de-monitoramento-intelbras-sim-play/)
· [Dahua NetSDK Programming Guide v3.4.7](https://pdfcoffee.com/dahua-camera-netsdk-programming-guide-pdf-free.html)

## 3. Protocolos e portas usados

**Confirmado por documentação primária Intelbras/parceiros:**

| Protocolo                   | Porta       | Fonte                                                                                                                                                                                                                       |
| --------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ONVIF**                   | TCP 80/8000 | Datasheets [MHDX 1332](https://backend.intelbras.com/sites/default/files/2025-07/datasheet-mhdx-1332-pt.pdf), [NVD 3016 P](https://backend.intelbras.com/sites/default/files/integration/datasheet_a4_nvds_3016_p_site.pdf) |
| **RTSP**                    | TCP 554     | Implícito por ONVIF Profile S                                                                                                                                                                                               |
| **DH-P2P / DHIP**           | TCP 37777   | [Guia Remotizze Intelbras](https://mkcontroller.com/blog/remote_access/intelbras/remote-intelbras-access-with-remotizze/)                                                                                                   |
| **HTTP-CGI (Dahua-compat)** | TCP 80      | Herdado da plataforma OEM                                                                                                                                                                                                   |

**Não confirmado para o SIM Play:**

- **DVR-IP / Sofia (XiongMai, TCP 34567)** — aparece em produtos XiongMai
  (XMeye/vMEyeSuper) mas **não** é citado no manual do SIM Play, que se
  refere a "protocolo de comunicação Intelbras-1". Nossa integração com
  `xiongmai-nbd80x` continua válida para NVRs OEM XiongMai puros, mas
  não deve ser assumida como usada pelo SIM Play.
- **RTMP (1935)** — sem citação primária.

## 4. Cloud Intelbras (Remotizze)

**Confirmado:** o SIM Play exige login com **Conta Intelbras** (SSO) para
usar o serviço P2P **Remotizze** (antigo "Intelbras Cloud"), com limite
de 1 computador logado por vez. O dispositivo abre túnel outbound para
a nuvem, dispensando port-forward.

Fontes: [Manual SIM Play — Conta Intelbras](https://manuais.intelbras.com.br/manual-software-de-monitoramento-intelbras-sim-play/)
· [Remotizze setup](https://mkcontroller.com/blog/remote_access/intelbras/remote-intelbras-access-with-remotizze/)

**Não confirmado:** endpoints exatos, formato do ID P2P e mecanismo de
handshake por serial (proprietário, não publicado). Os domínios
`izy.intelbras.com.br` / `mibo.intelbras.com.br` **pertencem a outras
linhas de produto** (automação residencial Izy e câmeras Mibo) e não
ao ecossistema NVR/DVR do SIM Play — a suspeita anterior foi descartada.

## 5. Matriz de paridade com VISÃO

| Feature SIM Play                 | VISÃO hoje                      | Gap / Onda proposta                    |
| -------------------------------- | ------------------------------- | -------------------------------------- |
| Mosaico 1/4/9/16/25/36           | 2x–4x + patrulha (`MosaicPage`) | Adicionar 5x/6x/custom                 |
| Playback timeline multi-cam sync | Parcial (clips isolados)        | **Onda 1 desta fase**                  |
| Download de gravações do NVR     | Não                             | Edge Function DVR-IP/CGI               |
| Áudio bidirecional (talk-back)   | Não                             | WebRTC → agente local → G.711          |
| Alarmes push nativos NVR         | Via webhook                     | `SubscribeToEvents` na Edge Function   |
| P2P Cloud Intelbras (izy/mibo)   | Não                             | Requer conta 3ª-parte                  |
| Cadastro de usuários NVR remoto  | Não                             | CGI Dahua `/cgi-bin/userManager.cgi`   |
| Config OSD/horário/rede NVR      | Não                             | CGI Dahua `/cgi-bin/configManager.cgi` |
| Backup `.dav` / `.h264`          | Não                             | Conversor server-side FFmpeg           |

## 6. Modelos suportados (linha comercial Intelbras)

- **NVR:** NVD 1000/3000/5000/7000 (Dahua OEM), MHDX 3000/5000 (DVR híbrido)
- **Câmeras IP:** VIP série 1000/3000/5000/7000 (Dahua OEM)
- **Cloud:** Izy (residencial), Mibo (corporativo/PME)
- **OEM XiongMai:** subconjunto de câmeras/DVRs econômicos —
  identificáveis pelo perfil `xiongmai-nbd80x` já registrado em
  `onvifProfiles.ts` (porta 8899 ONVIF, DVR-IP 34567).

## 7. Documentação oficial útil (integração third-party)

- Dahua Developer Portal — `https://dahuawiki.com/`
  (`Category:HTTP_API` e `Category:NetSDK`)
- Dahua HTTP API v2.7x — CGI reference
- ONVIF Core Spec 22.06 (todos os NVR Intelbras modernos são Profile S/T/G)
- MediaMTX docs — nosso relé para RTSP → HLS/WebRTC

## 8. Próximos passos

1. **Fase 2** (matriz priorizada) — concluída nesta seção 5.
2. **Fase 3 — Onda 1** — Timeline de playback sincronizada
   (`/playback` + `SyncPlaybackPage.tsx`). Em execução.
3. **Fase 3 — Ondas 2-6** — encadeadas no ritmo já estabelecido.
