# 🔊 Sons de Alerta

Esta pasta contém os arquivos de áudio para notificações e alertas.

## 📁 Arquivos Necessários

| Arquivo | Descrição | Duração Recomendada |
|---------|-----------|---------------------|
| `alert.mp3` | Som de alerta crítico | 1-2 segundos |
| `notification.mp3` | Som de notificação geral | 0.5-1 segundo |
| `warning.mp3` | Som de aviso | 1 segundo |
| `success.mp3` | Som de sucesso | 0.5 segundo |

## 🎵 Fontes Gratuitas de Sons

1. **Freesound.org** - https://freesound.org
   - Buscar por "notification", "alert", "beep"
   - Licença Creative Commons

2. **Mixkit** - https://mixkit.co/free-sound-effects/
   - Sons gratuitos para uso comercial

3. **Zapsplat** - https://www.zapsplat.com
   - Requer cadastro gratuito

## 🔧 Especificações Técnicas

- **Formato:** MP3 (melhor compatibilidade)
- **Bitrate:** 128-192 kbps
- **Sample Rate:** 44.1 kHz
- **Canais:** Mono (menor tamanho)
- **Tamanho máximo:** < 100 KB por arquivo

## 💡 Dica

Para converter áudios, use FFmpeg:

```bash
# Converter para MP3 mono 128kbps
ffmpeg -i input.wav -ac 1 -ab 128k output.mp3
```

## ⚙️ Configuração no Sistema

Os sons são configurados em `src/lib/alertSounds.ts` e podem ser personalizados nas configurações do usuário.
