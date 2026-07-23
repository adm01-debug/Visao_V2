import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { ArrowLeft, Server, Radio, Wifi, WifiOff, HelpCircle, Lock, Unlock, Loader2, LayoutGrid, VideoOff, Video, Search, Maximize2, RefreshCw, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

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
  const prefsKey = id ? `visao:nvr-mosaic-prefs:${id}` : null;
  const [mosaicCols, setMosaicCols] = useState<"2" | "3" | "4">(() => {
    if (typeof window === "undefined" || !prefsKey) return "3";
    try {
      const raw = window.localStorage.getItem(prefsKey);
      if (!raw) return "3";
      const parsed = JSON.parse(raw) as { cols?: string };
      return parsed.cols === "2" || parsed.cols === "3" || parsed.cols === "4" ? parsed.cols : "3";
    } catch {
      return "3";
    }
  });
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">(() => {
    if (typeof window === "undefined" || !prefsKey) return "all";
    try {
      const raw = window.localStorage.getItem(prefsKey);
      if (!raw) return "all";
      const parsed = JSON.parse(raw) as { statusFilter?: string };
      return parsed.statusFilter === "online" || parsed.statusFilter === "offline"
        ? parsed.statusFilter
        : "all";
    } catch {
      return "all";
    }
  });
  const [sortMode, setSortMode] = useState<"channel-asc" | "channel-desc" | "name-asc">(() => {
    if (typeof window === "undefined" || !prefsKey) return "channel-asc";
    try {
      const raw = window.localStorage.getItem(prefsKey);
      if (!raw) return "channel-asc";
      const parsed = JSON.parse(raw) as { sortMode?: string };
      return parsed.sortMode === "channel-desc" || parsed.sortMode === "name-asc"
        ? parsed.sortMode
        : "channel-asc";
    } catch {
      return "channel-asc";
    }
  });
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [cycleSeconds, setCycleSeconds] = useState<0 | 5 | 10 | 30>(0);
  const [cyclePaused, setCyclePaused] = useState<boolean>(false);
  const [cycleProgress, setCycleProgress] = useState<number>(0);


  useEffect(() => {
    if (!prefsKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        prefsKey,
        JSON.stringify({ cols: mosaicCols, statusFilter, sortMode }),
      );
    } catch {
      // storage disabled/full — ignore silently
    }
  }, [prefsKey, mosaicCols, statusFilter, sortMode]);


  const filteredChannels = useMemo(() => {
    const rows = channelsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (statusFilter === "online" && r.status !== "online") return false;
      if (statusFilter === "offline" && r.status !== "offline") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        String(r.channel_number ?? "").includes(q)
      );
    });
    const sorted = [...filtered];
    if (sortMode === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else {
      const dir = sortMode === "channel-desc" ? -1 : 1;
      sorted.sort((a, b) => {
        const ca = a.channel_number ?? Number.POSITIVE_INFINITY;
        const cb = b.channel_number ?? Number.POSITIVE_INFINITY;
        return (ca - cb) * dir;
      });
    }
    return sorted;
  }, [channelsQuery.data, search, statusFilter, sortMode]);


  const fullscreenChannel = useMemo(
    () => (channelsQuery.data ?? []).find((c) => c.id === fullscreenId) ?? null,
    [channelsQuery.data, fullscreenId],
  );

  useEffect(() => {
    if (!fullscreenId) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setFullscreenId(null);
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const list = filteredChannels.length > 0 ? filteredChannels : (channelsQuery.data ?? []);
      if (list.length === 0) return;
      const idx = list.findIndex((c) => c.id === fullscreenId);
      if (idx < 0) return;
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const next = list[(idx + delta + list.length) % list.length];
      if (next) setFullscreenId(next.id);
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreenId, filteredChannels, channelsQuery.data]);

  useEffect(() => {
    setCycleProgress(0);
    if (!fullscreenId || cycleSeconds === 0 || cyclePaused) return;
    const list = filteredChannels.length > 0 ? filteredChannels : (channelsQuery.data ?? []);
    if (list.length < 2) return;
    const totalMs = cycleSeconds * 1000;
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setCycleProgress(Math.min(1, elapsed / totalMs));
    }, 100);
    const timer = window.setTimeout(() => {
      const idx = list.findIndex((c) => c.id === fullscreenId);
      if (idx < 0) return;
      const next = list[(idx + 1) % list.length];
      if (next) setFullscreenId(next.id);
    }, totalMs);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [fullscreenId, cycleSeconds, cyclePaused, filteredChannels, channelsQuery.data]);


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
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar canal ou nome…"
                        className="pl-8"
                        aria-label="Buscar canal"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ToggleGroup
                        type="single"
                        size="sm"
                        value={statusFilter}
                        onValueChange={(v) => v && setStatusFilter(v as typeof statusFilter)}
                        aria-label="Filtrar por status"
                      >
                        <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                        <ToggleGroupItem value="online" className="gap-1">
                          <Wifi className="h-3 w-3" /> Online
                        </ToggleGroupItem>
                        <ToggleGroupItem value="offline" className="gap-1">
                          <WifiOff className="h-3 w-3" /> Offline
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <ToggleGroup
                        type="single"
                        size="sm"
                        value={sortMode}
                        onValueChange={(v) => v && setSortMode(v as typeof sortMode)}
                        aria-label="Ordenação dos canais"
                      >
                        <ToggleGroupItem value="channel-asc" aria-label="Canal crescente">
                          <ArrowUpDown className="h-3 w-3 mr-1" /> CH ↑
                        </ToggleGroupItem>
                        <ToggleGroupItem value="channel-desc" aria-label="Canal decrescente">CH ↓</ToggleGroupItem>
                        <ToggleGroupItem value="name-asc" aria-label="Nome A-Z">A-Z</ToggleGroupItem>
                      </ToggleGroup>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void channelsQuery.refetch()}
                        disabled={channelsQuery.isFetching}
                        aria-label="Atualizar canais"
                      >
                        <RefreshCw className={"h-4 w-4 " + (channelsQuery.isFetching ? "animate-spin" : "")} />
                      </Button>
                    </div>
                  </div>

                  {channelsQuery.data && channelsQuery.data.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
                      <span className="flex items-center gap-2">
                        Exibindo <strong className="text-foreground">{filteredChannels.length}</strong> de{" "}
                        <strong className="text-foreground">{channelsQuery.data.length}</strong> canais
                        {(search || statusFilter !== "all" || sortMode !== "channel-asc") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("all");
                              setSortMode("channel-asc");
                            }}
                            className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </span>
                      {channelsQuery.dataUpdatedAt > 0 && (
                        <span aria-live="polite">
                          Atualizado às {new Date(channelsQuery.dataUpdatedAt).toLocaleTimeString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}


                  {channelsQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Carregando canais…</p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum canal disponível.</p>
                  )}
                  {channelsQuery.data && channelsQuery.data.length > 0 && filteredChannels.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum canal corresponde ao filtro atual.
                    </p>
                  )}
                  {filteredChannels.length > 0 && (
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
                      {filteredChannels.map((c) => {
                        const online = c.status === "online";
                        return (
                          <div
                            key={c.id}
                            className="group relative aspect-video overflow-hidden rounded-lg border bg-muted/40 transition hover:border-primary hover:shadow-md"
                          >
                            <Link
                              to={`/cameras/${c.id}`}
                              className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Abrir canal ${c.channel_number ?? ""} — ${c.name}`}
                            >
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted">
                                {online ? (
                                  <Video className="h-10 w-10 text-muted-foreground/60 group-hover:text-primary transition" aria-hidden />
                                ) : (
                                  <VideoOff className="h-10 w-10 text-destructive/50" aria-hidden />
                                )}
                              </div>
                            </Link>
                            <div className="absolute top-2 left-2 pointer-events-none">
                              <Badge variant="secondary" className="font-mono text-xs">
                                CH {c.channel_number ?? "—"}
                              </Badge>
                            </div>
                            <div className="absolute top-2 right-2 pointer-events-none">
                              {statusBadge(c.status)}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setFullscreenId(c.id);
                              }}
                              className="absolute bottom-2 right-2 z-10 rounded-md bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100 hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Tela cheia canal ${c.channel_number ?? ""}`}
                            >
                              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-2 pointer-events-none">
                              <p className="text-xs font-medium truncate">{c.name}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {fullscreenChannel && (() => {
            const navList = filteredChannels.length > 0 ? filteredChannels : (channelsQuery.data ?? []);
            const curIdx = navList.findIndex((c) => c.id === fullscreenChannel.id);
            const total = navList.length;
            const goDelta = (delta: number): void => {
              if (total === 0 || curIdx < 0) return;
              const next = navList[(curIdx + delta + total) % total];
              if (next) setFullscreenId(next.id);
            };
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur"
                role="dialog"
                aria-modal="true"
                aria-label={`Canal ${fullscreenChannel.channel_number ?? ""} em tela cheia`}
                onClick={() => setFullscreenId(null)}
              >
                <div
                  className="relative w-full max-w-6xl aspect-video overflow-hidden rounded-xl border bg-muted shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setCyclePaused(true)}
                  onMouseLeave={() => setCyclePaused(false)}
                >

                  <div className="absolute inset-0 flex items-center justify-center">
                    {fullscreenChannel.status === "online" ? (
                      <Video className="h-20 w-20 text-muted-foreground/60" aria-hidden />
                    ) : (
                      <VideoOff className="h-20 w-20 text-destructive/50" aria-hidden />
                    )}
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      CH {fullscreenChannel.channel_number ?? "—"}
                    </Badge>
                    {statusBadge(fullscreenChannel.status)}
                    {total > 1 && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {curIdx + 1}/{total}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2 items-center">
                    {total > 1 && (
                      <ToggleGroup
                        type="single"
                        size="sm"
                        value={String(cycleSeconds)}
                        onValueChange={(v) => {
                          if (!v) return;
                          const n = Number(v);
                          if (n === 0 || n === 5 || n === 10 || n === 30) setCycleSeconds(n);
                        }}
                        aria-label="Auto-ciclo de canais"
                        className="bg-background/80 rounded-md"
                      >
                        <ToggleGroupItem value="0" aria-label="Sem ciclo">Off</ToggleGroupItem>
                        <ToggleGroupItem value="5">5s</ToggleGroupItem>
                        <ToggleGroupItem value="10">10s</ToggleGroupItem>
                        <ToggleGroupItem value="30">30s</ToggleGroupItem>
                      </ToggleGroup>
                    )}
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/cameras/${fullscreenChannel.id}`}>Abrir canal</Link>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setFullscreenId(null)}>
                      Fechar
                    </Button>
                  </div>
                  {total > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => goDelta(-1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Canal anterior"
                      >
                        <ChevronLeft className="h-6 w-6" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => goDelta(1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Próximo canal"
                      >
                        <ChevronRight className="h-6 w-6" aria-hidden />
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4 flex items-end justify-between gap-2">
                    <p className="text-base font-medium truncate">{fullscreenChannel.name}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      ← / → navegar · Esc fechar{cycleSeconds > 0 ? (cyclePaused ? " · ciclo pausado" : " · passe o mouse para pausar") : ""}
                    </p>
                  </div>
                  {cycleSeconds > 0 && total > 1 && (
                    <div
                      className="absolute bottom-0 inset-x-0 h-1 bg-primary/80 transition-[width] duration-100 ease-linear"
                      style={{ width: `${Math.round((cyclePaused ? 0 : cycleProgress) * 100)}%` }}
                      aria-hidden
                    />
                  )}

                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
