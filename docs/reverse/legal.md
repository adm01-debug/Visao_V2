# Guard-rails legais — Interoperabilidade com clientes Intelbras/Dahua

Este documento formaliza as regras de conduta que o time deve seguir ao
implementar qualquer paridade com o **Intelbras SIM Play**, **SmartPSS**,
**DMSS**, **DSS**, **iVMS-4200** ou qualquer outro cliente CFTV
proprietário.

## 1. O que É permitido

- Implementar do zero a **comunicação nos protocolos abertos** que os
  equipamentos aceitam: **ONVIF**, **RTSP**, **HTTP-CGI Dahua** (docs
  públicas), **DVR-IP / Sofia** (XiongMai — engenharia reversa clean-room
  publicamente documentada por comunidades como `SofiaCTL`).
- Ler documentação pública de fabricante (Dahua Developer Portal, wiki
  ONVIF, docs Intelbras) e implementar as chamadas descritas ali.
- Descrever comportamentos observáveis do SIM Play (portas, endpoints,
  sequência de handshake) em nossa própria linguagem, com nossas
  próprias palavras.

## 2. O que NÃO é permitido

- Copiar **código-fonte, DLLs, ícones, splashes, textos de UI, arquivos
  de tradução (`.qm`), imagens ou fluxos de tela pixel-a-pixel** do SIM
  Play. Isso viola copyright e o EULA embutido no instalador.
- Redistribuir o `SimPlayInstaller.exe` ou qualquer arquivo extraído
  dele. O binário fica somente no sandbox de análise, nunca no repositório.
- Fazer bundle de SDKs Dahua (`dhnetsdk.dll`, `playSDK.dll`, etc.) — são
  licenciados individualmente pela Dahua para integradores registrados.
- Reutilizar o nome "SIM Play", "Intelbras", "SmartPSS", "Dahua" em
  branding, marketing ou UI do VISÃO. O produto é **VISÃO**.

## 3. Metodologia clean-room

Toda equivalência com o SIM Play deve ser implementada seguindo o
modelo clean-room padrão:

1. Uma pessoa (ou o agente pesquisador) documenta o **comportamento
   observável** do SIM Play em termos de protocolo (`docs/reverse/*.md`).
2. Uma segunda pessoa (ou outro agente) implementa a partir dessa
   documentação, **sem nunca olhar o código/binário original**.
3. Toda captura de rede usada como evidência (`.pcap`) é sanitizada
   (credenciais removidas) antes de ser referenciada.

## 4. Credenciais e segurança

- Credenciais de NVRs de teste **nunca** entram no repositório — passam
  pelo envelope encryption (DEK/KEK) já implementado no VISÃO.
- Sniffing de protocolo (`tcpdump`, Wireshark) só é feito **fora do
  sandbox de build**, na rede do próprio usuário/laboratório.
- Nenhuma feature de "downloader de firmware" ou "extractor de config
  binária" será implementada — foge do escopo de VMS.

## 5. Aviso final

Se em algum momento a implementação exigir copiar um trecho literal
(por exemplo, um algoritmo de hash específico de handshake XiongMai
sem alternativa aberta), **pare e escale**. Não incorpore sem revisão
jurídica.
