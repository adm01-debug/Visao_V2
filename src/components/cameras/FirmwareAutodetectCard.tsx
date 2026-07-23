/**
 * FirmwareAutodetectCard — Card compartilhado por AddCameraDialog,
 * AddNvrDialog e PtzSetupWizard para identificar automaticamente
 * marca/modelo/perfil ONVIF/portas a partir de um firmware ou de uma
 * sonda ONVIF já disponível.
 *
 * Não persiste o binário no cliente; envia à Edge Function apenas se
 * o arquivo exceder 2 MB (limiar do hook).
 */
import { useRef, useState } from "react";
import { Loader2, ScanSearch, UploadCloud, ShieldCheck, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirmwareDetection } from "@/hooks/useFirmwareDetection";
import type { FirmwareMatch, OnvifProbe } from "@/lib/firmwareDetector";
import { toast } from "sonner";

export interface FirmwareAutodetectSuggestion {
  brandId: FirmwareMatch["brandId"];
  templateId?: string;
  profileId?: string;
  defaultPorts: FirmwareMatch["defaultPorts"];
  displayName: string;
  score: number;
}

export interface FirmwareAutodetectCardProps {
  /** Sonda ONVIF já disponível (opcional). */
  onvifProbe?: OnvifProbe | null;
  /** Chamado quando o usuário clica em “Aplicar sugestão”. */
  onApply: (suggestion: FirmwareAutodetectSuggestion) => void;
  /** Título alternativo do card. */
  title?: string;
  className?: string;
}

const ACCEPTED = ".bin,.img,.rom,.zip,.tar,.gz,.dav,.pkg,.upd,application/octet-stream";

export function FirmwareAutodetectCard({
  onvifProbe,
  onApply,
  title = "Detectar automaticamente marca/modelo",
  className,
}: FirmwareAutodetectCardProps) {
  const { detectFile, detectOnvif } = useFirmwareDetection();
  const [matches, setMatches] = useState<FirmwareMatch[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzing = detectFile.isPending;

  const clear = () => {
    setMatches([]);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
    detectFile.reset();
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const result = await detectFile.mutateAsync({
        file,
        onvif: onvifProbe ?? undefined,
      });
      setMatches(result.matches);
      if (result.matches.length === 0) {
        toast.info("Nenhuma assinatura conhecida foi encontrada nesse firmware.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao analisar firmware.");
    }
  };

  const analyzeOnvif = () => {
    if (!onvifProbe) return;
    const result = detectOnvif(onvifProbe);
    setMatches(result.matches);
    if (result.matches.length === 0) {
      toast.info("Sonda ONVIF sem correspondência no catálogo. Continue no modo manual.");
    }
  };

  const apply = (m: FirmwareMatch) => {
    onApply({
      brandId: m.brandId,
      templateId: m.templates[0],
      profileId: m.profileId,
      defaultPorts: m.defaultPorts,
      displayName: m.displayName,
      score: m.score,
    });
    toast.success(`Sugestão aplicada: ${m.displayName}`);
  };

  return (
    <div
      className={
        "space-y-3 rounded-md border border-border/60 bg-muted/40 p-3 " + (className ?? "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanSearch className="w-4 h-4 text-primary" />
          {title}
        </div>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Binário não é armazenado
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Envie o firmware do fabricante (.bin/.img/.zip) ou use a descoberta ONVIF atual
        para sugerir marca, template RTSP e portas padrão.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={analyzing}
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4 mr-2" />
          )}
          Selecionar firmware
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={analyzeOnvif}
          disabled={!onvifProbe || analyzing}
          title={onvifProbe ? "Usar sonda ONVIF já detectada" : "Nenhuma sonda ONVIF disponível ainda"}
        >
          <ScanSearch className="w-4 h-4 mr-2" />
          Usar descoberta ONVIF
        </Button>
        {fileName && (
          <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={fileName}>
            {fileName}
          </span>
        )}
        {(matches.length > 0 || fileName) && (
          <Button type="button" size="icon" variant="ghost" onClick={clear} aria-label="Limpar">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {matches.length > 0 ? (
        <ul className="space-y-2">
          {matches.slice(0, 3).map((m) => (
            <li
              key={`${m.brandId}:${m.profileId ?? ""}`}
              className="rounded-md border border-border/50 bg-background/60 p-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  {m.displayName}
                  <Badge variant="secondary" className="text-[10px]">
                    confiança {(m.score * 100).toFixed(0)}%
                  </Badge>
                  {m.profileId && (
                    <Badge variant="outline" className="text-[10px]">Perfil {m.profileId}</Badge>
                  )}
                </div>
                <Button type="button" size="sm" onClick={() => apply(m)}>
                  Aplicar <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="text-muted-foreground">
                Portas sugeridas: RTSP {m.defaultPorts.rtsp} · ONVIF {m.defaultPorts.onvif} · HTTP {m.defaultPorts.http}
              </div>
              {m.evidence.length > 0 && (
                <details className="text-muted-foreground">
                  <summary className="cursor-pointer">Evidências ({m.evidence.length})</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {m.evidence.slice(0, 6).map((e, i) => (
                      <li key={i}>· {e.kind}: {e.value}</li>
                    ))}
                    {m.evidence.length > 6 && <li>…e mais {m.evidence.length - 6}</li>}
                  </ul>
                </details>
              )}
              {m.notes && <p className="text-[11px] text-muted-foreground">{m.notes}</p>}
            </li>
          ))}
        </ul>
      ) : fileName && !analyzing ? (
        <Alert>
          <AlertTitle className="text-sm">Sem correspondência</AlertTitle>
          <AlertDescription className="text-xs">
            Não identificamos assinaturas conhecidas nesse arquivo. Você pode continuar
            no modo manual selecionando a marca abaixo.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export default FirmwareAutodetectCard;
