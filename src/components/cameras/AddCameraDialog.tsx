/**
 * VISÃO — Diálogo de cadastro de câmera com credenciais protegidas por cofre criptografado.
 *
 * Fluxo seguro:
 *  1. Valida com Zod (client-side).
 *  2. Constrói `rtsp://user:pass@host/...` (via URL() para escape correto).
 *  3. INSERT em `public.cameras` sem stream_url em texto puro.
 *  4. Envia URL completa ao cofre (`camera-credentials-vault` → envelope encryption).
 *  5. Rollback do INSERT se o cofre falhar.
 *  6. Nunca loga URL/senha; usa maskSecrets defensivo em erros.
 *  7. Se PTZ habilitado: valida capabilities via ONVIF e persiste `camera_ptz_config`.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Activity, Gamepad2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRtspValidation } from "@/hooks/useRtspValidation";
import { useFirstSnapshot } from "@/hooks/useFirstSnapshot";
import { RtspValidationPanel } from "./RtspValidationPanel";
import { LivePreviewPlayer } from "./LivePreviewPlayer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCameras } from "@/hooks/useCameras";
import { useCameraVault } from "@/hooks/useCameraVault";
import { supabase } from "@/integrations/supabase/client";
import {
  addCameraSchema,
  buildRtspUrl,
  hasEmbeddedCredentials,
  DEFAULT_PTZ_PORT,
  PTZ_PROTOCOLS,
  type AddCameraFormValues,
  type PtzProtocol,
} from "./addCameraSchema";
import {
  getTemplatesForBrand,
  findTemplate,
  renderTemplate,
} from "@/lib/rtspTemplates";

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cameraId?: string) => void;
  /**
   * `quick` (default) mantém o comportamento clássico.
   * `guided` bloqueia o submit até que o teste RTSP tenha rodado com sucesso
   * (score `ok`/`warn`). Score `critical` exige confirmação explícita.
   */
  mode?: "quick" | "guided";
}

const DEFAULTS: AddCameraFormValues = {
  name: "",
  location: "",
  brand: "generica",
  rtspUrl: "",
  substreamUrl: "",
  username: "",
  password: "",
  ptzEnabled: false,
  ptzConfig: {
    protocol: "onvif",
    endpoint: "",
    port: 80,
    channel: 1,
    username: "",
    password: "",
    default_speed: 0.5,
  },
};

interface DiscoverState {
  loading: boolean;
  ok: boolean | null;
  message: string | null;
  model?: string | null;
  presets?: number;
}

interface AutoDiscoverErrorDetail {
  code: string;
  title: string;
  hint: string;
  steps: string[];
  isLanHost: boolean;
  usedRelay: boolean;
  testedPorts: number[];
}

interface AutoDiscoverState {
  loading: boolean;
  ok: boolean | null;
  message: string | null;
  errorDetail: AutoDiscoverErrorDetail | null;
  host: string;
  allowPrivate: boolean;
  manualMode: boolean;
  manualPort: string;
  relayAgentId: string;
}

interface RelayAgentOption {
  id: string;
  name: string;
  last_seen_at: string | null;
  network_cidr: string | null;
}



/** Mascara qualquer credencial antes de aparecer em toast/log. */
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Erro desconhecido";
  return raw.replace(/rtsps?:\/\/[^\s"']+/gi, "rtsp://[REDACTED]");
}

export function AddCameraDialog({ open, onOpenChange, onCreated, mode = "quick" }: AddCameraDialogProps) {
  const guided = mode === "guided";
  const [showPassword, setShowPassword] = useState(false);
  const [showPtzPass, setShowPtzPass] = useState(false);
  const [forceCritical, setForceCritical] = useState(false);
  const [discover, setDiscover] = useState<DiscoverState>({ loading: false, ok: null, message: null });
  const [autoDiscover, setAutoDiscover] = useState<AutoDiscoverState>({
    loading: false,
    ok: null,
    message: null,
    errorDetail: null,
    host: "",
    allowPrivate: false,
    manualMode: false,
    manualPort: "",
    relayAgentId: "",
  });
  const [relayAgents, setRelayAgents] = useState<RelayAgentOption[]>([]);
  const [templateCtx, setTemplateCtx] = useState<{
    templateId: string;
    host: string;
    port: string;
    channel: string;
  }>({ templateId: "", host: "", port: "", channel: "1" });

  // Carrega agentes locais online (heartbeat < 2 min) para oferecer como relé.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const cutoff = new Date(Date.now() - 120_000).toISOString();
      const { data } = await supabase
        .from("local_agents")
        .select("id, name, last_seen_at, network_cidr")
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: false })
        .limit(20);
      if (!cancelled && data) setRelayAgents(data as RelayAgentOption[]);
    })();
    return () => { cancelled = true; };
  }, [open]);


  const { createCamera, deleteCamera, refetch } = useCameras();
  const { storeCredentials, loading: vaultLoading } = useCameraVault();
  const rtspValidation = useRtspValidation();
  const substreamValidation = useRtspValidation();
  const firstSnapshot = useFirstSnapshot();



  const form = useForm<AddCameraFormValues>({
    resolver: zodResolver(addCameraSchema),
    defaultValues: DEFAULTS,
    mode: "onBlur",
  });

  const rtspUrl = form.watch("rtspUrl");
  const embedded = hasEmbeddedCredentials(rtspUrl || "");
  const ptzEnabled = form.watch("ptzEnabled");
  const ptzProtocol = (form.watch("ptzConfig.protocol") ?? "onvif") as PtzProtocol;
  const ptzSpeed = form.watch("ptzConfig.default_speed") ?? 0.5;
  const brand = form.watch("brand");
  const brandTemplates = useMemo(() => getTemplatesForBrand(brand), [brand]);
  const selectedTemplate = useMemo(
    () => (templateCtx.templateId ? findTemplate(brand, templateCtx.templateId) : undefined),
    [brand, templateCtx.templateId],
  );

  // Ao trocar de marca, reseta o template selecionado (mas mantém host/canal digitados).
  useEffect(() => {
    setTemplateCtx((prev) => ({ ...prev, templateId: "" }));
  }, [brand]);

  // Limpa estado sensível quando fecha
  useEffect(() => {
    if (!open) {
      form.reset(DEFAULTS);
      setShowPassword(false);
      setShowPtzPass(false);
      setForceCritical(false);
      setDiscover({ loading: false, ok: null, message: null });
      setAutoDiscover({ loading: false, ok: null, message: null, errorDetail: null, host: "", allowPrivate: false, manualMode: false, manualPort: "", relayAgentId: "" });
      setTemplateCtx({ templateId: "", host: "", port: "", channel: "1" });
      rtspValidation.reset();
      substreamValidation.reset();
    }
  }, [open, form, rtspValidation, substreamValidation]);

  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      toast.error("Selecione um modelo antes de aplicar.");
      return;
    }
    const host = templateCtx.host.trim();
    if (!host) {
      toast.error("Informe o IP/host da câmera para gerar as URLs.");
      return;
    }
    const port = templateCtx.port ? Number(templateCtx.port) : undefined;
    if (port !== undefined && (!Number.isFinite(port) || port < 1 || port > 65535)) {
      toast.error("Porta inválida.");
      return;
    }
    const channel = templateCtx.channel ? Number(templateCtx.channel) : 1;
    if (!Number.isFinite(channel) || channel < 1 || channel > 64) {
      toast.error("Canal deve estar entre 1 e 64.");
      return;
    }
    const currentPrimary = form.getValues("rtspUrl")?.trim();
    const currentSub = form.getValues("substreamUrl")?.trim();
    const willOverwrite = Boolean(currentPrimary) || Boolean(currentSub);

    const apply = () => {
      const { primary, substream } = renderTemplate(selectedTemplate, { host, port, channel });
      form.setValue("rtspUrl", primary, { shouldValidate: true, shouldDirty: true });
      form.setValue("substreamUrl", substream ?? "", { shouldValidate: true, shouldDirty: true });
      rtspValidation.reset();
      substreamValidation.reset();
      toast.success("URLs preenchidas pelo template.", {
        description: "Ajuste manualmente se sua câmera usa caminho diferente.",
      });
    };

    if (willOverwrite) {
      toast("Sobrescrever URLs atuais?", {
        description: "Você já tem URLs preenchidas. Isso substituirá os valores.",
        action: { label: "Sobrescrever", onClick: apply },
        cancel: { label: "Cancelar", onClick: () => undefined },
      });
      return;
    }
    apply();
  };



  // Ajusta porta padrão ao trocar protocolo
  useEffect(() => {
    if (!ptzEnabled) return;
    const currentPort = form.getValues("ptzConfig.port");
    if (!currentPort || currentPort === 80) {
      form.setValue("ptzConfig.port", DEFAULT_PTZ_PORT[ptzProtocol]);
    }
  }, [ptzProtocol, ptzEnabled, form]);

  const handleTest = async () => {
    const values = form.getValues();
    if (!values.rtspUrl || (!hasEmbeddedCredentials(values.rtspUrl) && (!values.username || !values.password))) {
      toast.error("Preencha URL RTSP e credenciais antes de testar.");
      return;
    }
    // 1. Testa principal
    try {
      await rtspValidation.validate({
        mode: "inline",
        rtspUrl: values.rtspUrl,
        username: embedded ? undefined : values.username || undefined,
        password: embedded ? undefined : values.password || undefined,
      });
    } catch {
      /* erro já exposto pelo hook */
    }
    // 2. Testa substream (se preenchido)
    const sub = values.substreamUrl?.trim();
    if (sub) {
      const subEmbedded = hasEmbeddedCredentials(sub);
      try {
        await substreamValidation.validate({
          mode: "inline",
          rtspUrl: sub,
          username: subEmbedded ? undefined : values.username || undefined,
          password: subEmbedded ? undefined : values.password || undefined,
        });
      } catch {
        /* erro já exposto pelo hook */
      }
    } else {
      substreamValidation.reset();
    }
  };

  /** Descobre automaticamente porta ONVIF, RTSP principal/substream e capability PTZ. */
  const handleAutoDiscover = async () => {
    const host = autoDiscover.host.trim();
    const username = form.getValues("username");
    const password = form.getValues("password");
    if (!host) {
      toast.error("Informe o IP ou hostname da câmera.");
      return;
    }
    if (!username || !password) {
      toast.error("Preencha usuário e senha antes de descobrir.");
      return;
    }
    setAutoDiscover((s) => ({ ...s, loading: true, ok: null, message: null, errorDetail: null }));
    try {
      const manualPortNum = autoDiscover.manualMode
        ? Number.parseInt(autoDiscover.manualPort.trim(), 10)
        : NaN;
      if (autoDiscover.manualMode && (!Number.isFinite(manualPortNum) || manualPortNum < 1 || manualPortNum > 65535)) {
        setAutoDiscover((s) => ({ ...s, loading: false, ok: false, message: "Porta ONVIF inválida (use 1–65535)." }));
        return;
      }
      const { data, error } = await supabase.functions.invoke("onvif-autodiscover", {
        body: {
          host,
          username,
          password,
          allow_private: autoDiscover.manualMode ? true : autoDiscover.allowPrivate,
          ...(autoDiscover.manualMode ? { ports: [manualPortNum] } : {}),
          ...(autoDiscover.relayAgentId ? { relay_agent_id: autoDiscover.relayAgentId } : {}),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        const steps: string[] = Array.isArray(data.steps) ? data.steps.filter((s: unknown): s is string => typeof s === "string") : [];
        const detail: AutoDiscoverErrorDetail | null = steps.length
          ? {
              code: String(data.error_code ?? data.error),
              title: typeof data.title === "string" ? data.title : "Não foi possível alcançar a câmera",
              hint: typeof data.hint === "string" ? data.hint : String(data.error),
              steps,
              isLanHost: Boolean(data.is_lan_host),
              usedRelay: Boolean(data.used_relay),
              testedPorts: Array.isArray(data.tested_ports) ? data.tested_ports : [],
            }
          : null;
        setAutoDiscover((s) => ({
          ...s,
          loading: false,
          ok: false,
          message: data.hint || data.error,
          errorDetail: detail,
        }));
        return;
      }
      // Pré-preenche o formulário. Remove credenciais embutidas — cofre cuida delas.
      const stripCreds = (url: string) => url.replace(/^(rtsps?:\/\/)[^@\/]+@/i, "$1");
      if (data.rtsp_primary) {
        form.setValue("rtspUrl", stripCreds(data.rtsp_primary), { shouldValidate: true });
      }
      if (data.rtsp_substream) {
        form.setValue("substreamUrl", stripCreds(data.rtsp_substream), { shouldValidate: true });
      }
      if (data.ptz_capable) {
        form.setValue("ptzEnabled", true);
        form.setValue("ptzConfig.endpoint", host);
        form.setValue("ptzConfig.port", data.onvif?.port ?? 80);
        form.setValue("ptzConfig.username", username);
        form.setValue("ptzConfig.password", password);
      }
      if (data.device?.model && !form.getValues("name")) {
        form.setValue("name", `${data.device.manufacturer ?? "Câmera"} ${data.device.model}`.trim());
      }
      setAutoDiscover((s) => ({
        ...s,
        loading: false,
        ok: true,
        errorDetail: null,
        message: `${data.device?.manufacturer ?? "Dispositivo"} ${data.device?.model ?? ""} · porta ${data.onvif?.port} · ${data.profiles} perfil(is)${data.ptz_capable ? " · PTZ" : ""}`,
      }));
      toast.success("Câmera descoberta! Campos preenchidos automaticamente.");
    } catch (err) {
      setAutoDiscover((s) => ({ ...s, loading: false, ok: false, errorDetail: null, message: safeErrorMessage(err) }));
      toast.error(`Descoberta falhou: ${safeErrorMessage(err)}`);
    }
  };

  const [portProbe, setPortProbe] = useState<{
    loading: boolean;
    results: Array<{ port: number; reachable: boolean; latency_ms: number | null; http_status: number | null; reason: string | null }>;
    summary: { open: number[]; suggested_onvif: number[]; suggested_rtsp: number[] } | null;
    nextStep: string | null;
    error: string | null;
  }>({ loading: false, results: [], summary: null, nextStep: null, error: null });

  const handleProbePorts = async () => {
    const host = autoDiscover.host.trim();
    if (!host) {
      toast.error("Informe o IP/hostname da câmera antes de testar portas.");
      return;
    }
    setPortProbe({ loading: true, results: [], summary: null, nextStep: null, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("camera-port-probe", {
        body: {
          host,
          allow_private: autoDiscover.manualMode || autoDiscover.allowPrivate,
          ...(autoDiscover.manualMode && autoDiscover.manualPort
            ? { ports: [Number.parseInt(autoDiscover.manualPort, 10)] }
            : {}),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        setPortProbe((s) => ({ ...s, loading: false, error: data.hint || data.error }));
        return;
      }
      setPortProbe({
        loading: false,
        results: data.results ?? [],
        summary: data.summary ?? null,
        nextStep: data.next_step ?? null,
        error: null,
      });
      // Se o modo manual estiver ativo e o probe sugerir uma porta ONVIF, pré-preenche.
      if (autoDiscover.manualMode && !autoDiscover.manualPort && data?.summary?.suggested_onvif?.[0]) {
        setAutoDiscover((s) => ({ ...s, manualPort: String(data.summary.suggested_onvif[0]) }));
      }
    } catch (err) {
      setPortProbe({ loading: false, results: [], summary: null, nextStep: null, error: safeErrorMessage(err) });
      toast.error(`Teste de portas falhou: ${safeErrorMessage(err)}`);
    }
  };




  const handleDiscoverPtz = async () => {
    const cfg = form.getValues("ptzConfig");
    if (!cfg || !cfg.endpoint || !cfg.username || !cfg.password) {
      toast.error("Preencha endpoint, usuário e senha PTZ.");
      return;
    }
    setDiscover({ loading: true, ok: null, message: null });
    try {
      const { data, error } = await supabase.functions.invoke("ptz-onvif-discover", {
        body: {
          protocol: cfg.protocol,
          endpoint: cfg.endpoint,
          port: cfg.port,
          channel: cfg.channel,
          username: cfg.username,
          password: cfg.password,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        setDiscover({
          loading: false,
          ok: false,
          message: data.hint || data.error,
        });
        return;
      }
      setDiscover({
        loading: false,
        ok: true,
        message: `Conectado${data?.capabilities?.model ? ` a ${data.capabilities.model}` : ""} — ${data?.presets?.length ?? 0} presets`,
        model: data?.capabilities?.model ?? null,
        presets: data?.presets?.length ?? 0,
      });
      toast.success("Câmera PTZ respondeu ao ONVIF");
    } catch (err) {
      setDiscover({ loading: false, ok: false, message: safeErrorMessage(err) });
    }
  };

  const submitting = form.formState.isSubmitting || vaultLoading;

  const onSubmit = form.handleSubmit(async (values) => {
    let createdId: string | null = null;
    try {
      const finalUrl = buildRtspUrl(
        values.rtspUrl,
        embedded ? undefined : values.username || undefined,
        embedded ? undefined : values.password || undefined,
      );

      // 1. Cria linha pública (sem stream_url em texto puro)
      const camera = await createCamera({
        name: values.name,
        location: values.location?.trim() || "Sem localização",
        status: "offline",
        ptz_capable: values.ptzEnabled,
        substream_enabled: Boolean(values.substreamUrl),
        substream_protocol: values.substreamUrl ? "rtsp" : null,
      });
      createdId = camera.id;

      // 2. Envia credenciais para o cofre (envelope encryption)
      await storeCredentials(camera.id, finalUrl);

      // 3. PTZ config (se habilitado)
      if (values.ptzEnabled && values.ptzConfig) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada");
        const { error: ptzErr } = await supabase.from("camera_ptz_config").insert({
          camera_id: camera.id,
          user_id: user.id,
          protocol: values.ptzConfig.protocol,
          endpoint: values.ptzConfig.endpoint,
          port: values.ptzConfig.port,
          channel: values.ptzConfig.channel,
          username: values.ptzConfig.username,
          password_encrypted: values.ptzConfig.password,
          default_speed: values.ptzConfig.default_speed,
          capabilities: {},
        });
        if (ptzErr) throw new Error(`PTZ: ${ptzErr.message}`);

        // Descoberta assíncrona pós-criação (importa presets se ONVIF)
        if (values.ptzConfig.protocol === "onvif") {
          supabase.functions
            .invoke("ptz-onvif-discover", {
              body: {
                camera_id: camera.id,
                protocol: values.ptzConfig.protocol,
                endpoint: values.ptzConfig.endpoint,
                port: values.ptzConfig.port,
                channel: values.ptzConfig.channel,
                username: values.ptzConfig.username,
                password: values.ptzConfig.password,
                import_presets: true,
              },
            })
            .then((res) => {
              if (res.data?.imported) {
                toast.success(`${res.data.imported} presets ONVIF importados`);
              }
            })
            .catch(() => {
              /* falha silenciosa — usuário pode redescobrir depois */
            });
        }
      }

      // 4. Substream (não sensível, pode ficar no metadata)
      if (values.substreamUrl && hasEmbeddedCredentials(values.substreamUrl)) {
        toast.warning(
          "Substream contém credenciais — considere migrar para o cofre em uma próxima etapa",
        );
      }

      toast.success("Câmera cadastrada e credenciais protegidas no cofre");
      await refetch();

      // 5. Primeiro snapshot — best-effort, não bloqueia o fluxo.
      const shouldCapture =
        guided && rtspValidation.result && rtspValidation.result.score !== "critical";
      if (shouldCapture) {
        const { data: cam } = await supabase
          .from("cameras")
          .select("stream_url, substream_url")
          .eq("id", camera.id)
          .maybeSingle();
        const result = await firstSnapshot.capture({
          cameraId: camera.id,
          hlsUrl: cam?.substream_url ?? null,
          fallbackHlsUrl: cam?.stream_url ?? null,
        });
        if (result.status === "done") {
          toast.success("Snapshot inicial capturado");
          await refetch();
        } else if (result.status === "pending") {
          toast.info("Snapshot inicial ficará disponível após o stream público ser ingerido pelo MediaMTX");
        } else {
          toast.warning("Não foi possível capturar o snapshot inicial — capture manualmente na tela da câmera");
        }
      }

      onCreated?.(createdId ?? undefined);
      onOpenChange(false);
    } catch (err) {
      // Rollback se INSERT teve sucesso mas alguma etapa falhou
      if (createdId) {
        try {
          await deleteCamera(createdId);
        } catch {
          /* toast do delete já roda */
        }
      }
      toast.error(`Falha ao cadastrar câmera: ${safeErrorMessage(err)}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            Adicionar câmera
          </DialogTitle>
          <DialogDescription>
            Credenciais são cifradas com envelope encryption antes de sair do seu navegador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {guided && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium text-foreground">Cadastro guiado da primeira câmera</p>
                <p className="text-muted-foreground">
                  Preencha identificação e RTSP, teste a conexão e cadastre. Credenciais são cifradas
                  no cofre (AES-GCM + KEK) antes de sair do navegador.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-cam-name">Nome *</Label>
              <Input
                id="add-cam-name"
                autoComplete="off"
                placeholder="Portaria Principal"
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-cam-location">Localização</Label>
              <Input
                id="add-cam-location"
                autoComplete="off"
                placeholder="Entrada / Estacionamento"
                {...form.register("location")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-cam-brand">Marca</Label>
              <Select
                value={form.watch("brand")}
                onValueChange={(v) => form.setValue("brand", v as AddCameraFormValues["brand"])}
              >
                <SelectTrigger id="add-cam-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hikvision">Hikvision</SelectItem>
                  <SelectItem value="dahua">Dahua</SelectItem>
                  <SelectItem value="intelbras">Intelbras</SelectItem>
                  <SelectItem value="generica">Genérica / ONVIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4 text-primary" aria-hidden />
              Descoberta automática ONVIF
            </div>
            <p className="text-xs text-muted-foreground">
              Informe apenas o IP/hostname da câmera + usuário/senha (acima) e nós preenchemos porta, RTSP principal, substream e PTZ automaticamente.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="IP ou hostname da câmera"
                placeholder="192.168.1.10 ou cam.exemplo.com"
                autoComplete="off"
                spellCheck={false}
                value={autoDiscover.host}
                onChange={(e) => setAutoDiscover((s) => ({ ...s, host: e.target.value }))}
                disabled={autoDiscover.loading}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAutoDiscover}
                disabled={autoDiscover.loading}
                className="sm:w-52"
              >
                {autoDiscover.loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {autoDiscover.manualMode ? "Conectar ao endpoint" : "Descobrir agora"}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={autoDiscover.manualMode}
                onChange={(e) => setAutoDiscover((s) => ({ ...s, manualMode: e.target.checked }))}
                className="h-3 w-3"
              />
              Configuração manual do endpoint ONVIF (pular varredura e usar porta específica)
            </label>
            {autoDiscover.manualMode && (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/60 p-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="add-cam-onvif-port" className="text-[11px]">
                    Porta ONVIF (ex.: 80, 8000, 2020)
                  </Label>
                  <Input
                    id="add-cam-onvif-port"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="8000"
                    value={autoDiscover.manualPort}
                    onChange={(e) =>
                      setAutoDiscover((s) => ({ ...s, manualPort: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                    }
                    disabled={autoDiscover.loading}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground sm:max-w-[55%]">
                  Use quando a câmera responde ONVIF em uma porta customizada ou quando a varredura automática não encontrou endpoint. A opção "hosts privados/LAN" é habilitada automaticamente nesse modo.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-2">
              <Label htmlFor="add-cam-relay" className="text-[11px]">
                Rotear via Agente Local (relé)
              </Label>
              <Select
                value={autoDiscover.relayAgentId || "__direct__"}
                onValueChange={(v) => setAutoDiscover((s) => ({ ...s, relayAgentId: v === "__direct__" ? "" : v }))}
              >
                <SelectTrigger id="add-cam-relay" className="h-8 text-xs">
                  <SelectValue placeholder="Conexão direta (sem relé)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__direct__">Conexão direta (Edge Function → câmera)</SelectItem>
                  {relayAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.network_cidr ? `· ${a.network_cidr}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {relayAgents.length === 0
                  ? "Nenhum agente online. Cadastre em Agentes Locais para relayar chamadas da nuvem até câmeras na sua LAN."
                  : "Use o relé quando a câmera está em rede privada sem port-forward ou VPN. O agente executa a chamada localmente e devolve a resposta."}
              </p>
            </div>
            {!autoDiscover.manualMode && (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoDiscover.allowPrivate}
                  onChange={(e) => setAutoDiscover((s) => ({ ...s, allowPrivate: e.target.checked }))}
                  className="h-3 w-3"
                />
                Permitir hosts privados/LAN (só funciona se houver rota interna até a câmera)
              </label>
            )}
            {autoDiscover.ok === true && (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> {autoDiscover.message}
              </Badge>
            )}
            {autoDiscover.ok === false && (
              <Badge variant="destructive" className="max-w-full whitespace-normal">
                {autoDiscover.message}
              </Badge>
            )}
            {autoDiscover.ok === false && autoDiscover.errorDetail && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {autoDiscover.errorDetail.title}
                </div>
                <p className="mb-2 text-muted-foreground">{autoDiscover.errorDetail.hint}</p>
                {autoDiscover.errorDetail.testedPorts.length > 0 && (
                  <p className="mb-2 font-mono text-[11px] text-muted-foreground">
                    Portas testadas: {autoDiscover.errorDetail.testedPorts.join(", ")}
                  </p>
                )}
                <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Como resolver
                </div>
                <ol className="ml-4 list-decimal space-y-1.5 text-foreground">
                  {autoDiscover.errorDetail.steps.map((step, i) => (
                    <li key={i} className="leading-snug">{step}</li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoDiscover((s) => ({ ...s, manualMode: true }))}
                    disabled={autoDiscover.manualMode}
                  >
                    Ativar configuração manual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleProbePorts}
                    disabled={portProbe.loading}
                  >
                    Testar portas agora
                  </Button>
                  {relayAgents.length === 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open("/agentes-locais", "_blank", "noopener")}
                    >
                      Instalar agente local
                    </Button>
                  ) : (
                    !autoDiscover.relayAgentId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAutoDiscover((s) => ({ ...s, relayAgentId: relayAgents[0]?.id ?? "" }))}
                      >
                        Usar agente local
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-2 space-y-2 rounded-md border border-border/40 bg-background/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium">Diagnóstico de portas (pré-teste)</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleProbePorts}
                  disabled={portProbe.loading || !autoDiscover.host.trim()}
                >
                  {portProbe.loading ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-3 w-3" />
                  )}
                  Testar portas
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Verifica quais portas ONVIF/RTSP/HTTP respondem no host informado, a partir do mesmo ambiente que rodará o autodiscover. Útil para diagnosticar firewall e escolher a porta correta antes de tentar descobrir.
              </p>
              {portProbe.error && (
                <Badge variant="destructive" className="max-w-full whitespace-normal">
                  {portProbe.error}
                </Badge>
              )}
              {portProbe.results.length > 0 && (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                    {portProbe.results.map((r) => (
                      <div
                        key={r.port}
                        className={`flex items-center justify-between rounded border px-2 py-1 text-[11px] ${
                          r.reachable
                            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                            : "border-border/60 bg-muted/30 text-muted-foreground"
                        }`}
                        title={r.reason ? `motivo: ${r.reason}` : ""}
                      >
                        <span className="font-mono">:{r.port}</span>
                        <span>
                          {r.reachable
                            ? r.http_status
                              ? `HTTP ${r.http_status}`
                              : `${r.latency_ms}ms`
                            : r.reason ?? "fechado"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {portProbe.summary && portProbe.summary.suggested_onvif.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="text-muted-foreground">Candidatos ONVIF:</span>
                      {portProbe.summary.suggested_onvif.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setAutoDiscover((s) => ({ ...s, manualMode: true, manualPort: String(p) }))
                          }
                        >
                          usar :{p}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {portProbe.nextStep && (
                    <p className="text-[11px] text-muted-foreground">{portProbe.nextStep}</p>
                  )}
                </div>
              )}
            </div>
          </div>


          <div className="space-y-2 rounded-md border border-border/60 bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Modelo da câmera (template RTSP)</div>
              {selectedTemplate && (
                <Badge variant="outline" className="text-[10px]">
                  Porta padrão: {selectedTemplate.defaultPort}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione o modelo para preencher automaticamente as URLs principal e substream. Ajuste manualmente se sua câmera usa caminho diferente.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="add-cam-template" className="text-xs">Modelo</Label>
                <Select
                  value={templateCtx.templateId || "__none__"}
                  onValueChange={(v) =>
                    setTemplateCtx((s) => ({ ...s, templateId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="add-cam-template">
                    <SelectValue placeholder="Personalizado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Personalizado (não usar template)</SelectItem>
                    {brandTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description && (
                  <p className="text-[11px] text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-cam-tpl-host" className="text-xs">Host / IP</Label>
                <Input
                  id="add-cam-tpl-host"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="192.168.1.10"
                  value={templateCtx.host}
                  onChange={(e) => setTemplateCtx((s) => ({ ...s, host: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-cam-tpl-port" className="text-xs">
                  Porta {selectedTemplate ? `(padrão ${selectedTemplate.defaultPort})` : ""}
                </Label>
                <Input
                  id="add-cam-tpl-port"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder={selectedTemplate ? String(selectedTemplate.defaultPort) : "554"}
                  value={templateCtx.port}
                  onChange={(e) => setTemplateCtx((s) => ({ ...s, port: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-cam-tpl-channel" className="text-xs">Canal</Label>
                <Input
                  id="add-cam-tpl-channel"
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="1"
                  value={templateCtx.channel}
                  onChange={(e) => setTemplateCtx((s) => ({ ...s, channel: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || !templateCtx.host.trim()}
              >
                Aplicar template
              </Button>
            </div>
          </div>




          <div className="space-y-1.5">
            <Label htmlFor="add-cam-rtsp">URL RTSP principal *</Label>
            <Input
              id="add-cam-rtsp"
              autoComplete="off"
              spellCheck={false}
              placeholder="rtsp://192.168.1.10:554/Streaming/Channels/101"
              aria-invalid={!!form.formState.errors.rtspUrl}
              {...form.register("rtspUrl")}
            />
            {form.formState.errors.rtspUrl && (
              <p className="text-xs text-destructive">{form.formState.errors.rtspUrl.message}</p>
            )}
            {embedded && (
              <p className="text-xs text-muted-foreground">
                Credenciais detectadas na URL — campos abaixo desabilitados.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-cam-substream">URL RTSP substream (para IA)</Label>
            <Input
              id="add-cam-substream"
              autoComplete="off"
              spellCheck={false}
              placeholder="rtsp://.../Channels/102 (opcional)"
              {...form.register("substreamUrl")}
            />
            {form.formState.errors.substreamUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.substreamUrl.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-cam-user">Usuário {embedded ? "" : "*"}</Label>
              <Input
                id="add-cam-user"
                autoComplete="off"
                disabled={embedded}
                aria-invalid={!!form.formState.errors.username}
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-cam-pass">Senha {embedded ? "" : "*"}</Label>
              <div className="relative">
                <Input
                  id="add-cam-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={embedded}
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="add-cam-ptz" className="cursor-pointer">
                Câmera PTZ (Pan/Tilt/Zoom)
              </Label>
              <p className="text-xs text-muted-foreground">
                Habilite se sua câmera aceita comandos ONVIF/Hikvision de movimento.
              </p>
            </div>
            <Switch
              id="add-cam-ptz"
              checked={ptzEnabled}
              onCheckedChange={(v) => form.setValue("ptzEnabled", v)}
            />
          </div>

          {ptzEnabled && (
            <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gamepad2 className="h-4 w-4 text-primary" />
                Controle PTZ
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ptz-protocol">Protocolo</Label>
                  <Select
                    value={ptzProtocol}
                    onValueChange={(v) =>
                      form.setValue("ptzConfig.protocol", v as PtzProtocol)
                    }
                  >
                    <SelectTrigger id="ptz-protocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PTZ_PROTOCOLS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ptz-endpoint">Endpoint (IP/host) *</Label>
                  <Input
                    id="ptz-endpoint"
                    autoComplete="off"
                    placeholder="192.168.1.10"
                    aria-invalid={!!form.formState.errors.ptzConfig?.endpoint}
                    {...form.register("ptzConfig.endpoint")}
                  />
                  {form.formState.errors.ptzConfig?.endpoint && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.ptzConfig.endpoint.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ptz-port">Porta</Label>
                  <Input
                    id="ptz-port"
                    type="number"
                    min={1}
                    max={65535}
                    {...form.register("ptzConfig.port", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ptz-channel">Canal</Label>
                  <Input
                    id="ptz-channel"
                    type="number"
                    min={1}
                    max={64}
                    {...form.register("ptzConfig.channel", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ptz-user">Usuário PTZ *</Label>
                  <Input
                    id="ptz-user"
                    autoComplete="off"
                    aria-invalid={!!form.formState.errors.ptzConfig?.username}
                    {...form.register("ptzConfig.username")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ptz-pass">Senha PTZ *</Label>
                  <div className="relative">
                    <Input
                      id="ptz-pass"
                      type={showPtzPass ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={!!form.formState.errors.ptzConfig?.password}
                      {...form.register("ptzConfig.password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPtzPass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPtzPass ? "Ocultar senha" : "Mostrar senha"}
                      tabIndex={-1}
                    >
                      {showPtzPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ptz-speed">Velocidade padrão</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(ptzSpeed * 100)}%
                  </span>
                </div>
                <Slider
                  id="ptz-speed"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[ptzSpeed]}
                  onValueChange={([v]) => form.setValue("ptzConfig.default_speed", v)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleDiscoverPtz}
                  disabled={discover.loading}
                >
                  {discover.loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Testar &amp; descobrir
                </Button>
                {discover.ok === true && (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> {discover.message}
                  </Badge>
                )}
                {discover.ok === false && (
                  <Badge variant="destructive" className="max-w-[280px] truncate" title={discover.message ?? undefined}>
                    {discover.message}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                A descoberta consulta capabilities e importa presets existentes via SOAP ONVIF (WS-UsernameToken).
              </p>
            </div>
          )}

          {(rtspValidation.loading || rtspValidation.result || rtspValidation.error) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Stream principal</p>
              <RtspValidationPanel
                result={rtspValidation.result}
                loading={rtspValidation.loading}
                error={rtspValidation.error}
                onRetry={handleTest}
                compact
              />
            </div>
          )}

          {(substreamValidation.loading || substreamValidation.result || substreamValidation.error) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Substream (IA)</p>
              <RtspValidationPanel
                result={substreamValidation.result}
                loading={substreamValidation.loading}
                error={substreamValidation.error}
                onRetry={handleTest}
                compact
              />
            </div>
          )}

          {rtspValidation.result &&
            rtspValidation.result.score !== "critical" &&
            form.getValues("rtspUrl") && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Prévia ao vivo (60s)
                </p>
                <LivePreviewPlayer
                  key={form.getValues("rtspUrl")}
                  rtspUrl={buildRtspUrl(
                    form.getValues("rtspUrl"),
                    form.getValues("username") || undefined,
                    form.getValues("password") || undefined,
                  )}
                />
              </div>
            )}




          {guided && rtspValidation.result?.score === "critical" && (
            <label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <input
                type="checkbox"
                checked={forceCritical}
                onChange={(e) => setForceCritical(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <span>
                O stream está com score <strong>crítico</strong>. Marque esta caixa para salvar
                mesmo assim — recomendamos ajustar as sugestões acima antes.
              </span>
            </label>
          )}

          {guided && !rtspValidation.result && (
            <p className="rounded-md border border-dashed bg-muted/30 p-2 text-center text-xs text-muted-foreground">
              🔒 No modo guiado é obrigatório <strong>testar a conexão</strong> antes de cadastrar.
            </p>
          )}

          {firstSnapshot.status === "capturing" && (
            <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Capturando snapshot inicial…
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={submitting || rtspValidation.loading || substreamValidation.loading}
              title="Valida principal e substream via Edge Function (latência, jitter, codec, auth)"
            >
              {(rtspValidation.loading || substreamValidation.loading)

                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Activity className="mr-2 h-4 w-4" />}
              Testar conexão
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                rtspValidation.loading ||
                substreamValidation.loading ||
                (guided && !rtspValidation.result) ||
                (guided && rtspValidation.result?.score === "critical" && !forceCritical)
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar câmera
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddCameraDialog;
