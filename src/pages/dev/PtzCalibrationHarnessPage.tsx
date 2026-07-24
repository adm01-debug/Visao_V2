/**
 * VISÃO — Harness DEV-only para exercitar cenários adversariais do
 * PtzCalibrationPanel.recapture via Playwright.
 *
 * Renderizado somente quando `import.meta.env.DEV === true`.
 *
 * Expõe `window.__ptzCalibrationHarness` com:
 *  - `configure({ minStall, maxStall, hangForever })`: define as posições que
 *    o driver reportará ao final dos sweeps -1 e +1. `hangForever=true` mantém
 *    `moving:true` e posição constante, exercitando o caminho de abortar.
 *  - `reset()`: limpa estado, log e configuração.
 *  - `lastLimits`: última chamada de `onChange` (para asserir persistência ou
 *    ausência dela em cenários de erro).
 *  - `driverLog`: sequência de calls do driver, útil p/ diagnóstico.
 *
 * Nenhum tráfego real de Supabase acontece — `cameraId` é omitido
 * intencionalmente: `saveObservedRange`, `guidedRecapture` e loaders todos
 * possuem guarda `if (cameraId)` que os torna in-memory neste harness.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PtzCalibrationPanel, type PtzLimits } from "@/components/ptz/PtzCalibrationPanel";
import type { usePtzControl } from "@/hooks/usePtzControl";

type PtzDriver = ReturnType<typeof usePtzControl>;
type StatusReturn = Awaited<ReturnType<PtzDriver["getStatus"]>>;
type DriverCall = { fn: string; args?: unknown; ts: number };

interface HarnessConfig {
  /** Posição reportada ao final de driveToStall(-1). */
  minStall: number;
  /** Posição reportada ao final de driveToStall(+1). */
  maxStall: number;
  /** Se true, getStatus retorna sempre a posição inicial com moving:true
   *  — driveToStall só sai por abort ou timeout. */
  hangForever: boolean;
}

declare global {
  interface Window {
    __ptzCalibrationHarness?: {
      configure: (cfg: Partial<HarnessConfig>) => void;
      reset: () => void;
      lastLimits: PtzLimits | null;
      driverLog: DriverCall[];
    };
  }
}

const INITIAL_LIMITS: PtzLimits = {
  pan: { min: -1, max: 1 },
  tilt: { min: -1, max: 1 },
  zoom: { min: 0, max: 1 },
};

export default function PtzCalibrationHarnessPage() {
  const [limits, setLimits] = useState<PtzLimits>(INITIAL_LIMITS);
  const configRef = useRef<HarnessConfig>({
    minStall: -0.85,
    maxStall: 0.85,
    hangForever: false,
  });
  const lastLimitsRef = useRef<PtzLimits | null>(null);
  const driverLogRef = useRef<DriverCall[]>([]);
  // Fase controlada pelo último startMove: 'idle' na origem, 'to-min' após
  // startMove com pan/tilt negativo, 'to-max' após positivo.
  const phaseRef = useRef<"idle" | "to-min" | "to-max">("idle");

  const ptz = useMemo<PtzDriver>(() => {
    const log = (fn: string, args?: unknown) => {
      driverLogRef.current.push({ fn, args, ts: Date.now() });
    };
    const buildStatus = (): StatusReturn => {
      const cfg = configRef.current;
      if (cfg.hangForever) {
        return {
          position: { pan: 0, tilt: 0, zoom: 0 },
          moving: { pan_tilt: true, zoom: true },
        } as StatusReturn;
      }
      const pan =
        phaseRef.current === "to-min" ? cfg.minStall
        : phaseRef.current === "to-max" ? cfg.maxStall
        : 0;
      return {
        position: { pan, tilt: 0, zoom: 0 },
        moving: { pan_tilt: false, zoom: false },
      } as StatusReturn;
    };
    return {
      getStatus: async () => {
        log("getStatus");
        return buildStatus();
      },
      startMove: async (params: unknown) => {
        log("startMove", params);
        const p = params as { pan?: number; tilt?: number };
        const dir = (p.pan ?? p.tilt ?? 0) as number;
        if (dir < 0) phaseRef.current = "to-min";
        else if (dir > 0) phaseRef.current = "to-max";
      },
      stopMove: async () => {
        log("stopMove");
      },
      zoom: async (dir: number, speed?: number) => {
        log("zoom", { dir, speed });
        if (dir < 0) phaseRef.current = "to-min";
        else if (dir > 0) phaseRef.current = "to-max";
      },
      send: async (cmd: string) => {
        log("send", cmd);
      },
      home: async () => {
        log("home");
        phaseRef.current = "idle";
      },
      savePreset: async () => {
        log("savePreset");
      },
    } as unknown as PtzDriver;
  }, []);

  useEffect(() => {
    window.__ptzCalibrationHarness = {
      configure: (cfg) => {
        configRef.current = { ...configRef.current, ...cfg };
      },
      reset: () => {
        configRef.current = { minStall: -0.85, maxStall: 0.85, hangForever: false };
        driverLogRef.current.length = 0;
        lastLimitsRef.current = null;
        phaseRef.current = "idle";
        setLimits(INITIAL_LIMITS);
      },
      lastLimits: null,
      driverLog: driverLogRef.current,
    };
    return () => {
      delete window.__ptzCalibrationHarness;
    };
  }, []);

  // Expose live refs.
  if (window.__ptzCalibrationHarness) {
    window.__ptzCalibrationHarness.lastLimits = lastLimitsRef.current;
    window.__ptzCalibrationHarness.driverLog = driverLogRef.current;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6" data-testid="ptz-calibration-harness">
      <h1 className="text-lg font-semibold">PtzCalibrationPanel — Harness (DEV)</h1>
      <div className="flex flex-wrap gap-2 text-xs">
        <Button
          size="sm"
          variant="outline"
          data-testid="harness-reset"
          onClick={() => window.__ptzCalibrationHarness?.reset()}
        >
          Reset
        </Button>
        <span data-testid="harness-limits" className="font-mono">
          pan={limits.pan.min.toFixed(2)}..{limits.pan.max.toFixed(2)}
        </span>
      </div>
      <Card className="p-3">
        <PtzCalibrationPanel
          ptz={ptz}
          limits={limits}
          onChange={(next) => {
            lastLimitsRef.current = next;
            if (window.__ptzCalibrationHarness) {
              window.__ptzCalibrationHarness.lastLimits = next;
            }
            setLimits(next);
          }}
          /* cameraId omitido de propósito → todas as gravações Supabase
             ficam desligadas neste harness. */
        />
      </Card>
    </div>
  );
}
