/**
 * QuickPtzBar — Overlay compacto para controle PTZ direto no live view.
 * - 4 setas (pan/tilt contínuo com stop no mouseup/touchend)
 * - Zoom +/-, Home
 * - Dropdown com top 8 presets por uso
 * - Atalhos de teclado quando ativo:
 *    setas → pan/tilt, +/- → zoom, 1-9 → goto preset, Shift+1-9 → salvar, H → home
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Minus, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePtzControl } from "@/hooks/usePtzControl";
import { cn } from "@/lib/utils";

interface QuickPtzBarProps {
  cameraId: string;
  keyboardEnabled?: boolean;
  className?: string;
}

const SPEED = 0.6;

export function QuickPtzBar({ cameraId, keyboardEnabled = true, className }: QuickPtzBarProps) {
  const ptz = usePtzControl({ cameraId });
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const start = useCallback(
    (pan: number, tilt: number) => {
      void ptz.startMove({ pan, tilt, speed: SPEED });
    },
    [ptz],
  );
  const stop = useCallback(() => {
    void ptz.stopMove();
  }, [ptz]);

  const topPresets = useMemo(
    () =>
      [...(ptz.presets ?? [])]
        .sort(
          (a: { uses?: number; preset_number: number }, b: { uses?: number; preset_number: number }) =>
            (b.uses ?? 0) - (a.uses ?? 0) || a.preset_number - b.preset_number,
        )
        .slice(0, 8),
    [ptz.presets],
  );

  // Atalhos de teclado
  useEffect(() => {
    if (!keyboardEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignora se algum input tem foco
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }
      const key = e.key;
      if (activeKey === key) return;

      if (key === "ArrowUp") { setActiveKey(key); start(0, SPEED); e.preventDefault(); return; }
      if (key === "ArrowDown") { setActiveKey(key); start(0, -SPEED); e.preventDefault(); return; }
      if (key === "ArrowLeft") { setActiveKey(key); start(-SPEED, 0); e.preventDefault(); return; }
      if (key === "ArrowRight") { setActiveKey(key); start(SPEED, 0); e.preventDefault(); return; }
      if (key === "+" || key === "=") { void ptz.zoom(0.5); e.preventDefault(); return; }
      if (key === "-" || key === "_") { void ptz.zoom(-0.5); e.preventDefault(); return; }
      if (key === "h" || key === "H") { void ptz.home(); e.preventDefault(); return; }
      if (/^[1-9]$/.test(key)) {
        const n = parseInt(key, 10);
        if (e.shiftKey) {
          void ptz.savePreset(n, `Preset ${n}`);
        } else {
          void ptz.gotoPreset(n);
        }
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (activeKey === e.key) {
          setActiveKey(null);
          stop();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [keyboardEnabled, activeKey, start, stop, ptz]);

  const btnProps = (pan: number, tilt: number, label: string) => ({
    "aria-label": label,
    onMouseDown: () => start(pan, tilt),
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); start(pan, tilt); },
    onTouchEnd: stop,
  });

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-lg border border-border/60 bg-background/85 p-1.5 backdrop-blur shadow-lg",
        className,
      )}
      role="toolbar"
      aria-label="Controles PTZ rápidos"
    >
      <div className="grid grid-cols-3 gap-0.5">
        <span />
        <Button size="icon" variant="ghost" className="h-8 w-8" {...btnProps(0, SPEED, "Cima")}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span />
        <Button size="icon" variant="ghost" className="h-8 w-8" {...btnProps(-SPEED, 0, "Esquerda")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => ptz.home()}
          aria-label="Posição inicial (H)"
          title="Home (H)"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" {...btnProps(SPEED, 0, "Direita")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span />
        <Button size="icon" variant="ghost" className="h-8 w-8" {...btnProps(0, -SPEED, "Baixo")}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <span />
      </div>

      <div className="mx-1 h-8 w-px bg-border/60" aria-hidden />

      <div className="flex flex-col gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-8"
          onClick={() => ptz.zoom(0.5)}
          aria-label="Zoom in (+)"
          title="Zoom + (tecla +)"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-8"
          onClick={() => ptz.zoom(-0.5)}
          aria-label="Zoom out (-)"
          title="Zoom − (tecla −)"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
      </div>

      <div className="mx-1 h-8 w-px bg-border/60" aria-hidden />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 gap-1" aria-label="Presets">
            <Star className="h-4 w-4" />
            <span className="text-xs">Presets</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {topPresets.length === 0 ? (
            <DropdownMenuItem disabled>Nenhum preset salvo</DropdownMenuItem>
          ) : (
            topPresets.map((p) => (
              <DropdownMenuItem
                key={p.id ?? p.preset_number}
                onSelect={() => void ptz.gotoPreset(p.preset_number)}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-mono">
                  {p.preset_number}
                </span>
                <span className="flex-1 truncate">{p.name ?? `Preset ${p.preset_number}`}</span>
                {typeof p.uses === "number" && p.uses > 0 && (
                  <span className="ml-2 text-[10px] text-muted-foreground">{p.uses}×</span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default QuickPtzBar;
