#!/usr/bin/env python3
"""Restaura arrow functions quebradas: `) = ident` -> `) => ident`."""
from pathlib import Path
import re

PAT = re.compile(r'(\))\s*=\s+(?=[A-Za-z_])')

def fix(path: Path) -> int:
    src = path.read_text()
    new = PAT.sub(r"\1 => ", src)
    if new != src:
        n = len(PAT.findall(src))
        path.write_text(new)
        return n
    return 0

if __name__ == "__main__":
    total = 0
    for p in Path("src").rglob("*.tsx"):
        n = fix(p)
        if n:
            print(f"{p}: +{n}")
            total += n
    print(f"Total: {total}")
