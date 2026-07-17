#!/usr/bin/env python3
"""
Onda 59 — Injeta aria-label em Botões icon-only sem nome acessível.

Estratégia heurística:
 1. Localiza cada <Button ... size="icon" ...> sem aria-label.
 2. Extrai o ícone lucide-react usado na 1ª tag <ComponentName ... /> a seguir
    (na mesma linha ou até 2 linhas depois).
 3. Traduz o nome do ícone para uma label PT-BR via mapa.
 4. Se onClick contém pistas melhores (delete/remove/close/edit), sobrepõe.
 5. Injeta aria-label="..." antes do ">" que fecha a tag do Button.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ICON_LABELS = {
    "X": "Fechar",
    "Trash2": "Excluir",
    "Trash": "Excluir",
    "Edit2": "Editar",
    "Edit": "Editar",
    "Pencil": "Editar",
    "MoreHorizontal": "Mais opções",
    "MoreVertical": "Mais opções",
    "Play": "Reproduzir",
    "Pause": "Pausar",
    "Volume2": "Som ligado",
    "VolumeX": "Som desligado",
    "Maximize2": "Tela cheia",
    "Minimize2": "Minimizar",
    "ChevronLeft": "Anterior",
    "ChevronRight": "Próximo",
    "ChevronUp": "Recolher",
    "ChevronDown": "Expandir",
    "ArrowLeft": "Voltar",
    "ArrowRight": "Avançar",
    "Settings": "Configurações",
    "Download": "Baixar",
    "Upload": "Enviar",
    "RefreshCw": "Atualizar",
    "LayoutGrid": "Visualizar em grade",
    "List": "Visualizar em lista",
    "Eye": "Visualizar",
    "EyeOff": "Ocultar",
    "Search": "Buscar",
    "Filter": "Filtrar",
    "Camera": "Câmera",
    "Video": "Vídeo",
    "Mic": "Microfone",
    "MicOff": "Silenciar microfone",
    "Bell": "Notificações",
    "Info": "Informações",
    "HelpCircle": "Ajuda",
    "Check": "Confirmar",
}

ONCLICK_HINTS = [
    (re.compile(r"onDelete|handleDelete|removeWebhook|deleteZone|setDeleteConfirm|onDiscard"), "Excluir"),
    (re.compile(r"onRemove|removeCondition|handleRemove"), "Remover"),
    (re.compile(r"onEdit|handleEdit"), "Editar"),
    (re.compile(r"onClose|onDismiss|handleClose"), "Fechar"),
    (re.compile(r"onFullscreen|toggleFullscreen"), "Tela cheia"),
    (re.compile(r"onPrev"), "Anterior"),
    (re.compile(r"onNext"), "Próximo"),
    (re.compile(r"onToggleCamera"), "Alternar câmera"),
    (re.compile(r"onToggleSound|toggleSound"), "Alternar som"),
    (re.compile(r"onToggleFullscreen"), "Alternar tela cheia"),
    (re.compile(r"onStart"), "Iniciar"),
    (re.compile(r"onStop"), "Parar"),
    (re.compile(r"onDownload"), "Baixar"),
    (re.compile(r"onRefresh|handleRefresh|loadClips|loadPeople|loadData|refreshData"), "Atualizar"),
    (re.compile(r"onTest"), "Testar conexão"),
    (re.compile(r"onSelectLog|onSelect"), "Ver detalhes"),
    (re.compile(r"navigate\(-1\)|window\.history\.back"), "Voltar"),
    (re.compile(r"handleShowTour"), "Iniciar tour"),
    (re.compile(r"setViewMode\('grid'\)"), "Visualizar em grade"),
    (re.compile(r"setViewMode\('list'\)"), "Visualizar em lista"),
    (re.compile(r"handleRemovePhoto"), "Remover foto"),
    (re.compile(r"onPlay"), "Reproduzir"),
]

# Regex de abertura de <Button ... size="icon" ...>
BUTTON_OPEN = re.compile(
    r'<Button\b(?P<attrs>[^>]*?\bsize="icon"[^>]*?)>',
    re.MULTILINE,
)
ICON_RX = re.compile(r"<([A-Z][A-Za-z0-9]+)\b[^>]*/>")

def derive_label(attrs: str, following: str) -> str:
    for rx, lbl in ONCLICK_HINTS:
        if rx.search(attrs):
            return lbl
    m = ICON_RX.search(following)
    if m and m.group(1) in ICON_LABELS:
        return ICON_LABELS[m.group(1)]
    return "Ação"

def process(path: Path) -> int:
    src = path.read_text()
    if 'size="icon"' not in src:
        return 0
    out = []
    i = 0
    changed = 0
    while True:
        m = BUTTON_OPEN.search(src, i)
        if not m:
            out.append(src[i:])
            break
        attrs = m.group("attrs")
        if "aria-label" in attrs:
            out.append(src[i:m.end()])
            i = m.end()
            continue
        # window de contexto (até 200 chars após abertura)
        following = src[m.end(): m.end() + 200]
        label = derive_label(attrs, following)
        # Injeta aria-label antes do ">"
        replacement = f'<Button{attrs} aria-label="{label}">'
        out.append(src[i:m.start()])
        out.append(replacement)
        i = m.end()
        changed += 1
    if changed:
        path.write_text("".join(out))
    return changed

if __name__ == "__main__":
    root = Path("src")
    total = 0
    for p in root.rglob("*.tsx"):
        n = process(p)
        if n:
            print(f"{p}: +{n}")
            total += n
    print(f"Total: {total}")
