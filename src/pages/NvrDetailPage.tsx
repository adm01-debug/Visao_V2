import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageMeta } from "@/components/PageMeta";
import { ArrowLeft, Server, Radio, Wifi, WifiOff, HelpCircle } from "lucide-react";

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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Server className="h-7 w-7 text-primary" aria-hidden />
              {nvr.name}
            </h1>
            <p className="text-muted-foreground">
              {nvr.brand.toUpperCase()} · <span className="font-mono">{nvr.host}:{nvr.rtsp_port}</span>
              {nvr.location && <> · {nvr.location}</>}
            </p>
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
        </>
      )}
    </div>
  );
}
