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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Activity, Gamepad2, Search } from "lucide-react";
import { toast } from "sonner";
import { useRtspValidation } from "@/hooks/useRtspValidation";
import { RtspValidationPanel } from "./RtspValidationPanel";

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

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
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

/** Mascara qualquer credencial antes de aparecer em toast/log. */
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Erro desconhecido";
  return raw.replace(/rtsps?:\/\/[^\s"']+/gi, "rtsp://[REDACTED]");
}

export function AddCameraDialog({ open, onOpenChange, onCreated }: AddCameraDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPtzPass, setShowPtzPass] = useState(false);
  const [discover, setDiscover] = useState<DiscoverState>({ loading: false, ok: null, message: null });
  const { createCamera, deleteCamera, refetch } = useCameras();
  const { storeCredentials, loading: vaultLoading } = useCameraVault();
  const rtspValidation = useRtspValidation();
  const substreamValidation = useRtspValidation();


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

  // Limpa estado sensível quando fecha
  useEffect(() => {
    if (!open) {
      form.reset(DEFAULTS);
      setShowPassword(false);
      setShowPtzPass(false);
      setDiscover({ loading: false, ok: null, message: null });
      rtspValidation.reset();
    }
  }, [open, form, rtspValidation]);

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
    const parse = addCameraSchema.safeParse(values);
    if (!parse.success) {
      toast.error("Preencha URL RTSP e credenciais antes de testar.");
      return;
    }
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
      onCreated?.();
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
            <RtspValidationPanel
              result={rtspValidation.result}
              loading={rtspValidation.loading}
              error={rtspValidation.error}
              onRetry={handleTest}
              compact
            />
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
              disabled={submitting || rtspValidation.loading}
            >
              {rtspValidation.loading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Activity className="mr-2 h-4 w-4" />}
              Testar conexão
            </Button>
            <Button
              type="submit"
              disabled={submitting || rtspValidation.loading}
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
