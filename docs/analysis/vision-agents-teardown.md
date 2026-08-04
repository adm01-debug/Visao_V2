# Análise exaustiva — GetStream/Vision-Agents → VISÃO

Repositório: <https://github.com/GetStream/Vision-Agents> (Apache-2.0, Python 3.10+, ~8k ★)
Data da análise: clone raso de `main`, 238 MB, 41 plugins, 11 exemplos.
Objetivo: extrair **ideias e funções** aproveitáveis, separando o que é portável do que é folclore.

---

## 0. Veredito de portabilidade

| Camada                                                                   | Portável para o VISÃO? | Motivo                                                                                               |
| ------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Runtime do agente (`agents-core`)                                        | ❌                     | Python + asyncio + aiortc + GPU. Nosso backend é Edge Function Deno com timeout curto.               |
| Transporte WebRTC (Stream Edge)                                          | ❌                     | Trocaria MediaMTX/HLS por rede proprietária. Regressão de arquitetura.                               |
| Modelos locais (YOLO/Roboflow via `ultralytics`, `inference`)            | ⚠️ parcial             | Servidor precisa de CUDA. No browser já temos TFJS/MediaPipe; a **política** de uso é o que importa. |
| **Padrões de projeto** (processor, forwarder, warmup, eventos, métricas) | ✅                     | É disso que vale copiar. Detalhado abaixo.                                                           |
| Exemplo `05_security_camera`                                             | ✅ conceitual          | É literalmente o nosso domínio, escrito por outra equipe. Ouro para achar gaps.                      |

---

## 1. Achados de arquitetura (o que vale copiar)

### 1.1 `VideoForwarder` — um decode, N consumidores, FPS por consumidor

`agents-core/vision_agents/core/utils/video_forwarder.py`

Um único produtor lê o track e enfileira em `VideoLatestNQueue` (fila que **descarta frame velho** em vez de acumular). Cada handler registra seu próprio FPS e o consumidor faz _throttle_ por handler:

```python
min_interval = (1.0 / handler.fps) if handler.fps else 0.0
if min_interval == 0.0 or (now - handler.last_ts) >= min_interval:
    handler.last_ts = now
    await handler.callback(frame)
```

E a guarda que evita a mentira mais comum: `add_frame_handler` **rejeita** um handler com FPS maior que o do forwarder.

> **Gap no VISÃO:** hoje cada consumidor de frame (`process-frame`, detecção facial no browser, ALPR, heatmap) puxa seu próprio frame do `<video>`. Em mosaico de 16 câmeras isso multiplica decode. Um `FrameBus` por câmera com assinatura `{ consumidor, fps }` e política _latest-wins_ é adotável direto no cliente.

### 1.2 `Warmable` / `on_warmup` — custo de carregamento sai do primeiro frame

`core/warmup.py`, usado por `SecurityCameraProcessor` e `LocalModerationProcessor`.

O modelo é baixado e carregado na subida do agente, não na primeira detecção. O comentário do exemplo de moderação é explícito: _"so the model is downloaded and loaded during agent startup rather than on the first video frame."_

> **Gap no VISÃO:** `useFaceAPI`/`usePPEDetection` carregam TFJS no primeiro uso — o primeiro frame de cada sessão paga segundos e é justamente o frame do evento. Falta um estágio de _warmup_ declarado, com estado observável na UI ("modelo aquecendo" ≠ "nada detectado").

### 1.3 Inferência assíncrona com _hold_ do último resultado

`examples/11_moderation_example` — o frame é encaminhado **imediatamente**; a inferência roda em background e o overlay (blur) **segura a última posição conhecida** até chegar o próximo resultado.

> Isso é o oposto do que fazemos: hoje o overlay some quando a inferência atrasa, produzindo piscada. Segurar a última leitura **com marca de idade** (e apagar após um teto) é melhor UX _e_ mais honesto — desde que a idade seja exibida, senão vira leitura fantasma.

### 1.4 Hierarquia de processors — o contrato que nos falta

`core/processors/base_processor.py`: `Processor` → `VideoProcessor` (consome) / `VideoPublisher` (produz) / `VideoProcessorPublisher` (ambos), mais o par de áudio. Cada um com `name`, `attach_agent`, `stop_processing` e um `MetricsCollector` próprio no construtor.

> **Gap no VISÃO:** temos 8 funções de IA (`detect-faces`, `analyze-license-plate`, `detect-behavior`, `insightface-*`, `process-frame`, `analyze-image`) sem contrato comum: cada uma define seu próprio formato de entrada, saída e erro. Um `VisionProcessor` com `{ name, warmup(), process(frame) → Reading[], stop() }` unificaria medição de latência, atribuição de culpa (`networkError.ts`) e encadeamento.

### 1.5 Métricas nomeadas por estágio, não por função

`core/observability/metrics.py` — histogramas separados para `stt.latency.ms`, `llm.time_to_first_token.ms`, `llm.latency.ms`, `tts.latency.ms`, contadores de `*.errors`, `llm.tokens.input/output`, `llm.tool_calls`. E a decisão certa: **a biblioteca não configura provider**; se ninguém configurou OTel, tudo é no-op.

> Nosso `metrics-prometheus` mede a função inteira. Separar **tempo até o primeiro token** de **tempo total** é o que permite distinguir "modelo lento" de "resposta longa" — hoje não conseguimos.

### 1.6 `EventManager` tipado por dataclass

Cada processor registra suas classes de evento (`events.register(PersonDetectedEvent)`) e emite objetos tipados com `type: "security.person_detected"`. Namespace no nome do tipo, payload tipado, registro explícito.

> Nosso barramento de alertas usa strings soltas. O namespace `dominio.fato` + registro explícito eliminaria typo silencioso.

---

## 2. O exemplo `05_security_camera` — nosso domínio, achados diretos

1.726 linhas. É o arquivo mais valioso do repositório para nós.

### 2.1 Janela deslizante de 30 min com limpeza por `last_seen`

`time_window=1800`, `_cleanup_old_items` remove tudo com `last_seen < now - window`. Contagem de "visitantes únicos" é sempre _da janela_, nunca acumulada.

### 2.2 Dois relógios de detecção — o truque de custo

- `detection_interval = 2.0s` → detecção **completa** com _encoding_ de identidade (caro).
- `bbox_update_interval = 0.3s` → apenas atualização de posição, sem encoding (barato).

Ou seja: **rastrear é barato, identificar é caro, e são cadências diferentes.** É exatamente o gate de custo que discutimos, aplicado dentro do próprio detector.

### 2.3 Atribuição causal por presença — e o buraco probatório dela

Quando um pacote some, `_find_person_present_at(package.last_seen)` procura quem estava em cena e emite `PackageDisappearedEvent(picker_face_id, picker_name)`. O casamento é por **distância de centroide normalizada pela diagonal do frame**, com teto `max_distance_ratio`.

> **Este é o achado mais importante — e é uma armadilha.** "Estava presente quando sumiu" **não é** "pegou". O código deles nomeia a variável `picker` e a mensagem diz _"Package picked up by {name}"_ — uma correlação temporal virou afirmação de autoria. No VISÃO isso violaria diretamente a lei da Onda 159 (estado não verificado nunca é apresentado como verificado) e contaminaria o atestado de trajetória. Se adotarmos correlação de presença, o vocabulário tem que ser `presente_no_instante`, nunca `autor`, e o grau precisa cair para `candidate` na régua de `referenceMatch.ts`.

### 2.4 Estado de desaparecimento tri-estatal

`disappeared_at: Optional[float]` distingue três coisas que normalmente colapsam em uma: **presente** (`None`), **acabou de sair** (marcado agora, dispara evento) e **ausente há tempo** (já marcado, não redispara). Evita o evento repetido a cada frame — problema que já tivemos no fan-in de silêncio (Onda 192).

### 2.5 Limiares que eles descobriram na prática

`PICKUP_THRESHOLD_SECONDS = 5.0` (só conta como sumiço após 5s de ausência) e `PICKUP_MAX_AGE_SECONDS = 300.0` (ignora objeto velho demais). Área mínima/máxima do objeto como **razão do frame** (1%–90%), não em pixels — sobrevive a mudança de resolução. `face_match_tolerance = 0.6`.

---

## 3. Limitações declaradas por eles = requisitos para nós

O README lista, com honestidade rara:

- _"Video AI struggles with small text — models may hallucinate scores, signs, etc."_
- _"Context degrades on longer sessions (~30s+) for continuous video understanding"_
- _"Most use cases need a mix of specialized models with larger LLMs"_
- _"Real-time models require audio/text to trigger responses — video alone won't prompt output"_

> **Consequência direta para o VISÃO:** placa lida por LLM e rosto descrito por LLM **não podem** entrar no atestado com o mesmo peso de uma leitura ALPR/ArcFace. Falta uma coluna de **procedência da leitura** (`sensor` | `modelo_especializado` | `llm`) propagada até `timelineAttestation.ts`. Hoje um `analyze-image` que "viu ABC-1234" é indistinguível de uma leitura ALPR na prova.

---

## 4. O que NÃO copiar

- **`poster_generator.py`** — gera "cartaz de procurado" com Gemini e **publica no X** a foto de uma pessoa detectada. Sob a LGPD isso é tratamento e divulgação de dado biométrico sem base legal. É demo de conferência, não software de segurança.
- **Nomear correlação como autoria** (§2.3).
- **`face_recognition` (dlib)** como motor — já migramos para ArcFace/InsightFace, que é superior; tolerância 0.6 de dlib não é comparável.
- **Acoplar ao edge da Stream.**

---

## 5. Backlog derivado (ordenado por razão valor/risco)

| #   | Item                                                                          | Origem | Impacto                           |
| --- | ----------------------------------------------------------------------------- | ------ | --------------------------------- |
| 1   | **Procedência da leitura** (`sensor`/`modelo`/`llm`) propagada até o atestado | §3     | Probatório — fecha buraco real    |
| 2   | **Gate de custo com duas cadências** (rastrear 0.3s / identificar 2s)         | §2.2   | Custo + ruído                     |
| 3   | **`FrameBus` por câmera**, latest-wins, FPS por consumidor                    | §1.1   | Performance em mosaico            |
| 4   | **Contrato `VisionProcessor`** unificando as 8 funções de IA                  | §1.4   | Manutenção + medição              |
| 5   | **Warmup declarado** com estado na UI                                         | §1.2   | UX + latência do 1º evento        |
| 6   | **Métrica por estágio** (TTFT vs total)                                       | §1.5   | Diagnóstico                       |
| 7   | **Overlay com hold + idade visível**                                          | §1.3   | UX honesta                        |
| 8   | Presença correlacionada a evento, rotulada como `candidate`                   | §2.3   | Investigação, com trava semântica |
