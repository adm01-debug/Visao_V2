import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageMeta } from "@/components/PageMeta";
import { useNvrs, type NvrWithChannels } from "@/hooks/useNvrs";
import { Server, Video, Radio, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function bridgeBadge(nvr: NvrWithChannels): JSX.Element {
  if (!nvr.agent_id) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Sem agente
      </Badge>
    );
  }
  if (nvr.channels_online > 0 && nvr.channels_online === nvr.channels_registered) {
    return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Bridge saudável</Badge>;
  }
  if (nvr.channels_online > 0) {
    return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">Parcial</Badge>;
  }
  return <Badge variant="destructive">Offline</Badge>;
}

export default function NvrsPage(): JSX.Element {
  const { data: nvrs, isLoading, error } = useNvrs();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageMeta
        title="NVRs — VISÃO"
        description="Gerencie gravadores de vídeo em rede (NVR) e monitore a saúde do bridge de canais RTSP."
      />

      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-7 w-7 text-primary" aria-hidden />
            NVRs cadastrados
          </h1>
          <p className="text-muted-foreground">
            Cada NVR agrupa vários canais RTSP. O bridge é feito pelo Agente Local vinculado.
          </p>
        </div>
        <Button asChild>
          <Link to="/cameras?novo=nvr">Cadastrar novo NVR</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" aria-hidden /> Frota de gravadores
          </CardTitle>
          <CardDescription>
            Status agregado de canais online/offline por NVR. Atualização automática a cada 60 segundos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando NVRs…</p>}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              Falha ao carregar NVRs: {(error as Error).message}
            </p>
          )}
          {!isLoading && !error && (!nvrs || nvrs.length === 0) && (
            <div className="text-center py-8 space-y-3">
              <Video className="h-10 w-10 text-muted-foreground mx-auto" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Nenhum NVR cadastrado ainda. Use o botão acima para criar o primeiro.
              </p>
            </div>
          )}
          {nvrs && nvrs.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead className="text-center">Canais</TableHead>
                    <TableHead className="text-center">Online</TableHead>
                    <TableHead>Bridge</TableHead>
                    <TableHead>Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nvrs.map((nvr) => (
                    <TableRow key={nvr.id}>
                      <TableCell className="font-medium">
                        <Link to={`/nvrs/${nvr.id}`} className="hover:underline text-primary">
                          {nvr.name}
                        </Link>
                        {nvr.location && (
                          <p className="text-xs text-muted-foreground">{nvr.location}</p>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{nvr.brand}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {nvr.host}:{nvr.rtsp_port}
                      </TableCell>
                      <TableCell className="text-center">
                        {nvr.channels_registered}/{nvr.channel_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600">{nvr.channels_online}</span>
                        {nvr.channels_offline > 0 && (
                          <span className="text-muted-foreground"> / </span>
                        )}
                        {nvr.channels_offline > 0 && (
                          <span className="text-destructive">{nvr.channels_offline}</span>
                        )}
                      </TableCell>
                      <TableCell>{bridgeBadge(nvr)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(nvr.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
