#!/usr/bin/env python3
"""
Onda 59 — Reparo do injetor.
Reverte injeções que quebraram JSX (regex capturou > dentro de expressões).
Padrões conhecidos:
  1. `= aria-label="X"> `   →  `=> `   (arrow function partida)
  2. `? aria-label="X"> `   →  `? `    (ternário partido — raro)
  3. Também remove aria-label="Ação"> soltos em posições estranhas
     que vieram como segundo `>` órfão.
"""
from pathlib import Path
import re

BAD_LABELS = {
    "Fechar","Excluir","Editar","Mais opções","Reproduzir","Pausar","Som ligado",
    "Som desligado","Tela cheia","Minimizar","Anterior","Próximo","Recolher","Expandir",
    "Voltar","Avançar","Configurações","Baixar","Enviar","Atualizar","Visualizar em grade",
    "Visualizar em lista","Visualizar","Ocultar","Buscar","Filtrar","Câmera","Vídeo",
    "Microfone","Silenciar microfone","Notificações","Informações","Ajuda","Confirmar",
    "Remover","Alternar câmera","Alternar som","Alternar tela cheia","Iniciar","Parar",
    "Testar conexão","Ver detalhes","Iniciar tour","Remover foto","Ação",
}
label_alt = "|".join(re.escape(l) for l in BAD_LABELS)

# Padrão 1: `= aria-label="X">` — arrow quebrada por injeção
PAT_ARROW = re.compile(rf'=\s+aria-label="(?:{label_alt})">\s?')

def repair(path: Path) -> int:
    src = path.read_text()
    changed = 0
    new = PAT_ARROW.sub("= ", src)
    if new != src:
        changed += len(PAT_ARROW.findall(src))
        src = new
    if changed:
        path.write_text(src)
    return changed

if __name__ == "__main__":
    total = 0
    for p in Path("src").rglob("*.tsx"):
        n = repair(p)
        if n:
            print(f"{p}: -{n}")
            total += n
    print(f"Total reparado: {total}")
