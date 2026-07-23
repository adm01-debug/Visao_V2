import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageMeta } from "@/components/PageMeta";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Server, Radio, Wifi, WifiOff, HelpCircle, Lock, Unlock, Loader2, LayoutGrid, VideoOff, Video } from "lucide-react";

interface NvrRow {
  id: string;
  name: string;
  location: string | null;
  brand: string;
  host: string;
  rtsp_port: number;
  channel_count: number;
  agent_id: string | null;
  notes: string | null;
  created_at: string;
}

interface ChannelRow {
  id: string;
  name: string;
  status: string | null;
  channel_number: number | null;
}

function statusBadge(status: string | null): JSX.Element {
  if (status === "online") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 gap-1">
        <Wifi className="h-3 w-3" /> Online
      </Badge>
    );
  }
  if (status === "offline") {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" /> Offline
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <HelpCircle className="h-3 w-3" /> {status ?? "Desconhecido"}
    </Badge>
  );
}

export default function NvrDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  const nvrQuery = useQuery({
    queryKey: ["nvr", id],
    enabled: !!id,
    queryFn: async (): Promise<NvrRow | null> => {
      const { data, error } = await supabase
        .from("nvrs")
        .select("id, name, location, brand, host, rtsp_port, channel_count, agent_id, notes, created_at")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as NvrRow | null;
    },
  });

  const channelsQuery = useQuery({
    queryKey: ["nvr-channels", id],
    enabled: !!id,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ChannelRow[]> => {
      const { data, error } = await supabase
        .from("cameras")
        .select("id, name, status, channel_number")
        .eq("nvr_id", id!)
        .order("channel_number", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ChannelRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = channelsQuery.data ?? [];
    return {
      total: rows.length,
      online: rows.filter((r) => r.status === "online").length,
      offline: rows.filter((r) => r.status === "offline").length,
    };
  }, [channelsQuery.data]);

  const nvr = nvrQuery.data;
  const { user } = useAuth();
  const { toast } = useToast();
  const [bulkBusy, setBulkBusy] = useState<null | "arm" | "disarm">(null);
  const [mosaicCols, setMosaicCols] = useState<"2" | "3" | "4">("3");

  async function bulkAction(action: "arm" | "disarm"): Promise<void> {
    const channels = channelsQuery.data ?? [];
    if (!user || channels.length === 0) return;
    setBulkBusy(action);
    try {
      if (action === "arm") {
        const payload = channels.map((c) => ({
          user_id: user.id,
          camera_id: c.id,
          state: "armed" as const,
          armed_by_email: user.email ?? null,
          armed_at: new Date().toISOString(),
          disarm_at: null,
        }));
        const { error } = await supabase.from("arm_disarm_states").upsert(payload, { onConflict: "camera_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("arm_disarm_states")
          .update({ state: "disarmed", updated_at: new Date().toISOString() })
          .in("camera_id", channels.map((c) => c.id))
          .eq("user_id", user.id);
        if (error) throw error;
      }
      toast({
        title: action === "arm" ? "🔒 Canais armados" : "🔓 Canais desarmados",
        description: `${channels.length} canais do NVR ${nvr?.name ?? ""}.`,
      });
    } catch (e) {
      toast({
        title: "Falha na operação em lote",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBulkBusy(null);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6 mb-mobile-nav">
      <PageMeta
        title={nvr ? `${nvr.name} — NVR — VISÃO` : "NVR — VISÃO"}
        description="Detalhes do gravador e status por canal RTSP."
      />

      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/nvrs">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>
      </div>

      {nvrQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando NVR…</p>}
      {nvrQuery.error && (
        <p className="text-sm text-destructive" role="alert">
          Erro: {(nvrQuery.error as Error).message}
        </p>
      )}
      {!nvrQuery.isLoading && !nvr && (
        <p className="text-sm text-muted-foreground">NVR não encontrado.</p>
      )}

      {nvr && (
        <>
          <header className="space-y-1">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Server className="h-7 w-7 text-primary" aria-hidden />
                  {nvr.name}
                </h1>
                <p className="text-muted-foreground">
                  {nvr.brand.toUpperCase()} · <span className="font-mono">{nvr.host}:{nvr.rtsp_port}</span>
                  {nvr.location && <> · {nvr.location}</>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkBusy !== null || (channelsQuery.data?.length ?? 0) === 0}
                  onClick={() => bulkAction("arm")}
                >
                  {bulkBusy === "arm" ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-1" />
                  )}
                  Armar todos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkBusy !== null || (channelsQuery.data?.length ?? 0) === 0}
                  onClick={() => bulkAction("disarm")}
                >
                  {bulkBusy === "disarm" ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-1" />
                  )}
                  Desarmar todos
                </Button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Canais cadastrados</CardDescription>
                <CardTitle className="text-3xl">{stats.total}/{nvr.channel_count}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Online</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">{stats.online}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Offline</CardDescription>
                <CardTitle className="text-3xl text-destructive">{stats.offline}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="list" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="list" className="gap-1">
                  <Radio className="h-4 w-4" /> Lista
                </TabsTrigger>
                <TabsTrigger value="mosaic" className="gap-1">
                  <LayoutGrid className="h-4 w-4" /> Mosaico
                </TabsTrigger>
              </TabsList>
              <ToggleGroup
                type="single"
                size="sm"
                value={mosaicCols}
                onValueChange={(v) => v && setMosaicCols(v as "2" | "3" | "4")}
                aria-label="Colunas do mosaico"
              >
                <ToggleGroupItem value="2">2×</ToggleGroupItem>
                <ToggleGroupItem value="3">3×</ToggleGroupItem>
                <ToggleGroupItem value="4">4×</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-primary" aria-hidden /> Canais
                  </CardTitle>
                  <CardDescription>
                    Status por canal (atualização automática a cada 30 s).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {channelsQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Carregando canais…</p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum canal associado. Recadastre o NVR para provisionar os canais.
                    </p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16 text-center">Canal</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {channelsQuery.data.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-center font-mono">
                                {c.channel_number ?? "—"}
                              </TableCell>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell>{statusBadge(c.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/cameras/${c.id}`}>Abrir</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mosaic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" aria-hidden /> Mosaico de canais
                  </CardTitle>
                  <CardDescription>
                    Visualização em grade estilo mesa de CFTV. Clique em um tile para abrir o canal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {channelsQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Carregando canais…</p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum canal disponível.</p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length > 0 && (
                    <div
                      className={
                        "grid gap-3 " +
                        (mosaicCols === "2"
                          ? "grid-cols-1 sm:grid-cols-2"
                          : mosaicCols === "3"
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")
                      }
                    >
                      {channelsQuery.data.map((c) => {
                        const online = c.status === "online";
                        return (
                          <Link
                            key={c.id}
                            to={`/cameras/${c.id}`}
                            className="group relative aspect-video overflow-hidden rounded-lg border bg-muted/40 transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Abrir canal ${c.channel_number ?? ""} — ${c.name}`}
                          >
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted">
                              {online ? (
                                <Video className="h-10 w-10 text-muted-foreground/60 group-hover:text-primary transition" aria-hidden />
                              ) : (
                                <VideoOff className="h-10 w-10 text-destructive/50" aria-hidden />
                              )}
                            </div>
                            <div className="absolute top-2 left-2">
                              <Badge variant="secondary" className="font-mono text-xs">
                                CH {c.channel_number ?? "—"}
                              </Badge>
                            </div>
                            <div className="absolute top-2 right-2">{statusBadge(c.status)}</div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                              <p className="text-xs font-medium truncate">{c.name}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
