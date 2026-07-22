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
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  addCameraSchema,
  buildRtspUrl,
  hasEmbeddedCredentials,
  type AddCameraFormValues,
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
};

/** Mascara qualquer credencial antes de aparecer em toast/log. */
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Erro desconhecido";
  return raw.replace(/rtsps?:\/\/[^\s"']+/gi, "rtsp://[REDACTED]");
}

export function AddCameraDialog({ open, onOpenChange, onCreated }: AddCameraDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { createCamera, deleteCamera, refetch } = useCameras();
  const { storeCredentials, loading: vaultLoading } = useCameraVault();

  const form = useForm<AddCameraFormValues>({
    resolver: zodResolver(addCameraSchema),
    defaultValues: DEFAULTS,
    mode: "onBlur",
  });

  const rtspUrl = form.watch("rtspUrl");
  const embedded = hasEmbeddedCredentials(rtspUrl || "");

  // Limpa estado sensível quando fecha
  useEffect(() => {
    if (!open) {
      form.reset(DEFAULTS);
      setShowPassword(false);
    }
  }, [open, form]);

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

      // 3. Substream (não sensível, pode ficar no metadata)
      // observação: substream costuma ser URL de baixa qualidade, mas pode conter
      // credenciais também. Por segurança, opcionalmente também armazenamos no cofre
      // em uma próxima onda. Por ora, se substream tiver credenciais, avisamos.
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
      // Rollback se INSERT teve sucesso mas o cofre falhou
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
      <DialogContent className="max-w-lg">
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
              checked={form.watch("ptzEnabled")}
              onCheckedChange={(v) => form.setValue("ptzEnabled", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
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
