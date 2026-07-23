import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Trash2, Plus, ShieldCheck, Server, Radar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageMeta } from "@/components/PageMeta";
import { RelayReliabilityCard } from "@/components/local-agents/RelayReliabilityCard";

interface LocalAgent {
  id: string;
  name: string;
  version: string | null;
  network_cidr: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

interface AgentDiscovery {
  id: string;
  agent_id: string;
  host: string;
  port: number;
  manufacturer: string | null;
  model: string | null;
  firmware: string | null;
  onvif_endpoint: string | null;
  rtsp_primary: string | null;
  rtsp_substream: string | null;
  ptz_capable: boolean;
  discovered_at: string;
}

const AGENT_ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < AGENT_ONLINE_THRESHOLD_MS;
}

export default function LocalAgentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCidr, setNewCidr] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const agentsQuery = useQuery({
    queryKey: ["local-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_agents")
        .select("id, name, version, network_cidr, status, last_seen_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LocalAgent[];
    },
    refetchInterval: 30_000,
  });

  const discoveriesQuery = useQuery({
    queryKey: ["agent-discoveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_discoveries")
        .select("id, agent_id, host, port, manufacturer, model, firmware, onvif_endpoint, rtsp_primary, rtsp_substream, ptz_capable, discovered_at")
        .order("discovered_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AgentDiscovery[];
    },
    refetchInterval: 30_000,
  });

  const pairMutation = useMutation({
    mutationFn: async (payload: { name: string; network_cidr: string | null }) => {
      const { data, error } = await supabase.functions.invoke<{ token: string; agent: LocalAgent }>("agent-pair", {
        body: payload,
      });
      if (error) throw error;
      if (!data?.token) throw new Error("Sem token na resposta");
      return data;
    },
    onSuccess: (data) => {
      setIssuedToken(data.token);
      setShowCreate(false);
      setNewName("");
      setNewCidr("");
      queryClient.invalidateQueries({ queryKey: ["local-agents"] });
      toast.success("Agente pareado. Copie o token — ele só aparece uma vez.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Falha ao parear agente"),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("local_agents")
        .update({ status: "revoked", token_hash: "revoked-" + crypto.randomUUID() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agente revogado");
      queryClient.invalidateQueries({ queryKey: ["local-agents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("local_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agente removido");
      queryClient.invalidateQueries({ queryKey: ["local-agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-discoveries"] });
    },
  });

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };

  return (
    <div className="container mx-auto py-6 space-y-6 mb-mobile-nav">
      <PageMeta title="Agentes Locais — VISÃO" description="Agentes locais que descobrem câmeras ONVIF na LAN e reportam ao backend." />

      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" /> Agentes Locais
          </h1>
          <p className="text-sm text-muted-foreground">
            Serviço leve rodando na sua rede que descobre câmeras ONVIF e envia ao VISÃO.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar agente
        </Button>
      </header>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agentes ({agentsQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="discoveries">Descobertas ({discoveriesQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="reliability">Confiabilidade</TabsTrigger>
          <TabsTrigger value="install">Como instalar</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Instalações registradas</CardTitle>
              <CardDescription>Um registro por máquina/rede onde o agente está rodando.</CardDescription>
            </CardHeader>
            <CardContent>
              {agentsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : agentsQuery.data && agentsQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Rede</TableHead>
                      <TableHead>Último heartbeat</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentsQuery.data.map((a) => {
                      const online = a.status === "active" && isOnline(a.last_seen_at);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>
                            {a.status === "revoked" ? (
                              <Badge variant="destructive">Revogado</Badge>
                            ) : online ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Online</Badge>
                            ) : (
                              <Badge variant="outline">Offline</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{a.version ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{a.network_cidr ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.last_seen_at ? formatDistanceToNow(new Date(a.last_seen_at), { addSuffix: true, locale: ptBR }) : "nunca"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {a.status === "active" && (
                              <Button size="sm" variant="outline" onClick={() => revokeMutation.mutate(a.id)}>
                                Revogar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (confirm(`Remover o agente "${a.name}" e todas as descobertas?`)) {
                                deleteAgent.mutate(a.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum agente registrado. Clique em <strong>Adicionar agente</strong> para começar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discoveries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="w-5 h-5 text-primary" /> Câmeras descobertas
              </CardTitle>
              <CardDescription>
                Dispositivos ONVIF encontrados pelos agentes. Use “Cadastrar” para pré-preencher a câmera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {discoveriesQuery.data && discoveriesQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>PTZ</TableHead>
                      <TableHead>RTSP</TableHead>
                      <TableHead>Descoberta</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discoveriesQuery.data.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.host}:{d.port}</TableCell>
                        <TableCell>{[d.manufacturer, d.model].filter(Boolean).join(" · ") || "—"}</TableCell>
                        <TableCell>{d.ptz_capable ? <Badge variant="secondary">Sim</Badge> : <span className="text-muted-foreground">Não</span>}</TableCell>
                        <TableCell className="max-w-[280px] truncate font-mono text-xs">
                          {d.rtsp_primary ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(d.discovered_at), { addSuffix: true, locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const params = new URLSearchParams({
                                novo: "1",
                                host: d.host,
                                rtsp: d.rtsp_primary ?? "",
                                substream: d.rtsp_substream ?? "",
                                manufacturer: d.manufacturer ?? "",
                                model: d.model ?? "",
                                ptz: d.ptz_capable ? "1" : "0",
                              });
                              window.location.href = `/cameras?${params.toString()}`;
                            }}
                          >
                            Cadastrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma descoberta ainda. Assim que um agente rodar um scan, as câmeras aparecerão aqui.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reliability" className="mt-4">
          <RelayReliabilityCard hours={24} />
        </TabsContent>

        <TabsContent value="install" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instalação do agente</CardTitle>
              <CardDescription>Node 20+ ou Docker. Rode dentro da mesma LAN das câmeras.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <ShieldCheck className="w-4 h-4 inline mr-1 text-primary" />
                O token é opaco e só é mostrado uma vez. Guarde num cofre.
              </p>
              <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto">
{`# Docker (host network necessário para WS-Discovery multicast)
docker run -d --restart=unless-stopped \\
  --name visao-agent --network host \\
  -e BACKEND_URL="https://fsisdfdwlbfeadwfqpir.functions.supabase.co" \\
  -e AGENT_TOKEN="<TOKEN_AQUI>" \\
  -e DISCOVERY_INTERVAL=300 \\
  ghcr.io/visao/agent:latest`}
              </pre>
              <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto">
{`# Node standalone (agent/ neste repo)
cd agent && npm ci
BACKEND_URL="https://fsisdfdwlbfeadwfqpir.functions.supabase.co" \\
AGENT_TOKEN="<TOKEN_AQUI>" \\
node dist/index.js`}
              </pre>
              <p className="text-muted-foreground text-xs">
                O agente faz heartbeat a cada 30 s e um scan ONVIF a cada 5 min (configurável em <code>DISCOVERY_INTERVAL</code>, segundos).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: criar agente */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar agente local</DialogTitle>
            <DialogDescription>Um token opaco será gerado. Você verá o valor uma única vez.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Nome</Label>
              <Input id="agent-name" placeholder="ex: Portaria — matriz" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-cidr">CIDR da rede (opcional)</Label>
              <Input id="agent-cidr" placeholder="ex: 192.168.3.0/24" value={newCidr} onChange={(e) => setNewCidr(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              disabled={!newName.trim() || pairMutation.isPending}
              onClick={() => pairMutation.mutate({ name: newName.trim(), network_cidr: newCidr.trim() || null })}
            >
              {pairMutation.isPending ? "Gerando…" : "Gerar token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: token emitido */}
      <Dialog open={!!issuedToken} onOpenChange={(open) => { if (!open) setIssuedToken(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token do agente</DialogTitle>
            <DialogDescription>Copie agora — ele não será exibido novamente.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted p-3 font-mono text-xs break-all">
            {issuedToken}
          </div>
          <DialogFooter>
            <Button onClick={() => issuedToken && copy(issuedToken)}>
              <Copy className="w-4 h-4 mr-2" /> Copiar token
            </Button>
            <Button variant="outline" onClick={() => setIssuedToken(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
