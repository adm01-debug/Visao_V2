/**
 * VISÃO — Assistente de conectividade para `private_host_blocked`.
 *
 * Quando a Edge Function detecta que o host da câmera está numa faixa privada
 * (RFC1918) e nenhum caminho de acesso foi configurado, este assistente guia
 * o usuário por 3 opções e coleta os campos necessários para desbloquear:
 *
 *   A) Agente Local (recomendado) — seleciona um relé ativo na LAN.
 *   B) VPN                       — assume que o túnel já está estabelecido.
 *   C) Port-forward / DDNS       — pede host público + porta ONVIF externa.
 *
 * Ao aplicar, o assistente devolve uma `PrivateHostResolution` para o pai
 * (AddCameraDialog) que ajusta seu estado `autoDiscover` de acordo.
 */
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Radar,
  Server,
  Shield,
  Globe,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface RelayAgentSummary {
  id: string;
  name: string;
  last_seen_at: string | null;
  network_cidr: string | null;
}

export type PrivateHostResolution =
  | { mode: "relay"; relayAgentId: string }
  | { mode: "vpn" }
  | { mode: "port_forward"; publicHost: string; publicPort: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  host: string;
  agents: RelayAgentSummary[];
  onApply: (resolution: PrivateHostResolution) => void;
}

type Path = "relay" | "vpn" | "port_forward";

export function PrivateHostBlockedWizard({ open, onOpenChange, host, agents, onApply }: Props) {
  const defaultPath: Path = agents.length > 0 ? "relay" : "port_forward";
  const [path, setPath] = useState<Path>(defaultPath);
  const [relayAgentId, setRelayAgentId] = useState<string>(agents[0]?.id ?? "");
  const [vpnConfirmed, setVpnConfirmed] = useState(false);
  const [publicHost, setPublicHost] = useState("");
  const [publicPort, setPublicPort] = useState<string>("8000");
  const [applying, setApplying] = useState(false);

  const errors = useMemo(() => {
    if (path === "relay") {
      if (agents.length === 0) return "Nenhum Agente Local ativo. Instale um primeiro.";
      if (!relayAgentId) return "Selecione um Agente Local.";
    }
    if (path === "vpn" && !vpnConfirmed) {
      return "Confirme que a VPN está conectada.";
    }
    if (path === "port_forward") {
      if (!publicHost.trim()) return "Informe o host público (IP ou DDNS).";
      const port = Number.parseInt(publicPort, 10);
      if (!Number.isFinite(port) || port < 1 || port > 65535) return "Porta inválida (1–65535).";
    }
    return null;
  }, [path, agents.length, relayAgentId, vpnConfirmed, publicHost, publicPort]);

  function handleApply() {
    if (errors) return;
    setApplying(true);
    try {
      if (path === "relay") {
        onApply({ mode: "relay", relayAgentId });
      } else if (path === "vpn") {
        onApply({ mode: "vpn" });
      } else {
        onApply({
          mode: "port_forward",
          publicHost: publicHost.trim(),
          publicPort: Number.parseInt(publicPort, 10),
        });
      }
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assistente de conectividade
          </DialogTitle>
          <DialogDescription>
            O host <span className="font-mono text-foreground">{host || "informado"}</span> está em rede
            privada. Escolha como o VISÃO deve alcançar essa câmera.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={path} onValueChange={(v) => setPath(v as Path)} className="space-y-3">
          {/* Opção A — Agente Local */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              path === "relay" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <RadioGroupItem value="relay" id="path-relay" className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-primary" />
                <span className="font-medium">Agente Local (recomendado)</span>
                <Badge variant="secondary" className="text-[10px]">
                  {agents.length} ativo(s)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Um pequeno serviço na rede da câmera executa a descoberta e envia o resultado para a nuvem.
                Sem abrir portas no roteador.
              </p>

              {path === "relay" && (
                <div className="space-y-2">
                  {agents.length === 0 ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Nenhum agente ativo</AlertTitle>
                      <AlertDescription className="flex items-center justify-between gap-3">
                        <span>Instale o agente e volte aqui.</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => window.open("/agentes-locais", "_blank", "noopener")}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" /> Abrir instalação
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs">Selecionar agente</Label>
                      <div className="space-y-1">
                        {agents.map((a) => (
                          <label
                            key={a.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${
                              relayAgentId === a.id ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            <input
                              type="radio"
                              name="relay-agent"
                              value={a.id}
                              checked={relayAgentId === a.id}
                              onChange={() => setRelayAgentId(a.id)}
                              className="accent-primary"
                            />
                            <Server className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{a.name}</span>
                            {a.network_cidr && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {a.network_cidr}
                              </span>
                            )}
                            <span className="ml-auto text-[11px] text-muted-foreground">
                              {a.last_seen_at
                                ? `há ${formatDistanceToNow(new Date(a.last_seen_at), { locale: ptBR })}`
                                : "sem heartbeat"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </label>

          {/* Opção B — VPN */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              path === "vpn" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <RadioGroupItem value="vpn" id="path-vpn" className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">VPN corporativa</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Se seu navegador já está numa VPN que alcança a câmera, o teste pode rodar diretamente.
                (A Edge Function tentará forçar o acesso ao host privado.)
              </p>

              {path === "vpn" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={vpnConfirmed}
                    onChange={(e) => setVpnConfirmed(e.target.checked)}
                    className="accent-primary"
                  />
                  Confirmo que estou conectado à VPN da rede da câmera.
                </label>
              )}
            </div>
          </label>

          {/* Opção C — Port-forward / DDNS */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              path === "port_forward" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <RadioGroupItem value="port_forward" id="path-pf" className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium">Port-forward / DDNS</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Encaminhe a porta ONVIF (ex.: 8000) no roteador para a câmera e informe o IP público ou
                DDNS. O VISÃO substituirá o host privado pelo endereço público.
              </p>

              {path === "port_forward" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="public-host" className="text-xs">
                      Host público (IP ou DDNS)
                    </Label>
                    <Input
                      id="public-host"
                      placeholder="203.0.113.10 ou casa.ddns.net"
                      value={publicHost}
                      onChange={(e) => setPublicHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="public-port" className="text-xs">
                      Porta ONVIF externa
                    </Label>
                    <Input
                      id="public-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={publicPort}
                      onChange={(e) => setPublicPort(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </RadioGroup>

        {errors && (
          <Alert variant="destructive" className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>{errors}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply} disabled={!!errors || applying}>
            {applying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Aplicar e testar novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
