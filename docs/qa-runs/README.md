# QA Runs — Evidências de Validação Manual

Esta pasta armazena execuções pontuais do checklist guiado de QA.

## Como criar uma nova run

1. Copie o template:
   ```bash
   cp docs/qa-checklist-template.md docs/qa-runs/QA-$(date +%Y-%m-%d)-<release>.md
   ```
2. Crie a pasta de assets correspondente:
   ```bash
   mkdir -p docs/qa-runs/assets/$(date +%Y-%m-%d)-<release>
   ```
3. Preencha os critérios, anexe screenshots seguindo a nomenclatura do template.
4. Versione o arquivo `.md` + assets junto com a release que está validando.

## Convenção de nomes

- Run document: `QA-YYYY-MM-DD-<release-id>.md`
- Pasta de assets: `assets/YYYY-MM-DD-<release-id>/`
- Screenshots: ver seção 7 do template para padrão de nomenclatura

## Histórico

| Data | Release | Veredito | Documento |
|---|---|---|---|
| _(adicione aqui)_ | | | |
