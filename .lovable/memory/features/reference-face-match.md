---
name: Reference Face Match
description: Onda 198 — comparação 1:N por imagem de referência; modelo diferente é "não comparado" (nunca semelhança baixa), empate no topo é ambíguo, fraude na consulta vence tudo
type: feature
---

# Onda 198 — Busca por imagem de referência (1:N)

Régua única em `src/lib/faces/referenceMatch.ts`. Pura: sem rede, sem relógio, sem banco.
Hook `useReferenceFaceMatch` extrai o vetor (`insightface-encode`) e lê a galeria
(`face_embeddings`, isolada por dono pela RLS). A tela nunca reescreve o julgamento.

## Invariantes que não podem regredir

1. **Modelo diferente ⇒ `incomparable`**, jamais um cosseno "baixo". Cosseno entre
   ArcFace r100 e face-api-128 é bem definido e sem significado; exibi-lo faria o
   operador concluir "não é a pessoa" a partir de nada.
2. **Dimensão diferente ou norma nula ⇒ não medido** (`safeCosine` devolve `null`,
   nunca `0`). Zero significaria ortogonal, isto é, medido.
3. **Empate vence afirmação**: `top - second < AMBIGUITY_MARGIN` (0,05) ⇒ `ambiguous`.
4. **Fraude na foto de consulta vence semelhança**, mesmo em 1,00.
5. **Vivacidade < `REFERENCE_LIVENESS_FLOOR` (0,5) só rebaixa** o topo a candidato.
6. **Só o topo pode ser `identified`**; demais acima do corte são candidatos.
7. **Ordem determinística**: semelhança desc, empate por `id` asc; incomparáveis ao fim.
8. **Incomparáveis são contados e ditos na UI** — galeria meio migrada nunca vira
   "pessoa ausente".
9. Recusas declaradas (`describeReferenceRejection`), nunca correção silenciosa.

Validação: `npm run simulate:wave198` (729.786 asserções) +
`src/lib/faces/__tests__/referenceMatch.test.ts`.
