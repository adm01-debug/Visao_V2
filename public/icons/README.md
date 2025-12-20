# 📱 Ícones PWA

Esta pasta contém os ícones do aplicativo em vários tamanhos para PWA (Progressive Web App).

## 📁 Arquivos Necessários

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `icon-72x72.png` | 72x72 | Android (ldpi) |
| `icon-96x96.png` | 96x96 | Android (mdpi) |
| `icon-128x128.png` | 128x128 | Chrome Web Store |
| `icon-144x144.png` | 144x144 | Android (hdpi) |
| `icon-152x152.png` | 152x152 | iOS |
| `icon-192x192.png` | 192x192 | Android (xhdpi) |
| `icon-384x384.png` | 384x384 | Android (xxhdpi) |
| `icon-512x512.png` | 512x512 | Android (xxxhdpi) / Splash |
| `apple-touch-icon.png` | 180x180 | iOS Home Screen |
| `maskable-icon.png` | 512x512 | Android Adaptive Icon |

## 🎨 Design do Ícone VISÃO

O ícone deve representar:
- 👁️ Olho (vigilância)
- 📹 Câmera (monitoramento)
- 🔵 Cor azul (confiança, tecnologia)

## 🔧 Gerando Ícones

### Usando Figma/Sketch
1. Crie o ícone em 512x512
2. Exporte em todos os tamanhos

### Usando ImageMagick
```bash
# A partir de um ícone 512x512
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

### Usando Ferramentas Online
- **RealFaviconGenerator:** https://realfavicongenerator.net
- **PWA Asset Generator:** https://pwabuilder.com

## ⚠️ Requisitos

- Formato PNG com transparência
- Fundo sólido (não transparente) para iOS
- Ícone "maskable" com safe zone de 40%

## 📝 Manifest.json

Os ícones são referenciados em `/public/manifest.json`:

```json
{
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-icon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
