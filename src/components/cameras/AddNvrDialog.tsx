/**
 * VISÃO — AddNvrDialog
 *
 * Cadastra um NVR (gravador) em uma única operação e importa N canais
 * como câmeras. Cria as URLs RTSP a partir dos templates da biblioteca
 * `rtspTemplates` e persiste tudo via RPC transacional `create_nvr_with_channels`.
 */
import { useMemo, useState } from "react";
import { z } from "zod";
import { HardDrive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RTSP_TEMPLATES,
  getTemplatesForBrand,
  renderTemplate,
  type RtspBrand,
  type RtspTemplate,
} from "@/lib/rtspTemplates";
import { buildRtspUrl } from "@/components/cameras/addCameraSchema";

const nvrFormSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(80),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  brand: z.enum(["usecam", "hikvision", "dahua", "intelbras", "xiongmai", "generica"]),
  templateId: z.string().min(1, "Escolha um template"),
  host: z.string().trim().min(3, "IP/host obrigatório").max(253),
  port: z.coerce.number().int().min(1).max(65535),
  channels: z.coerce.number().int().min(1).max(64),
  username: z.string().trim().max(128).optional().or(z.literal("")),
  password: z.string().max(256).optional().or(z.literal("")),
});
type NvrFormValues = z.infer<typeof nvrFormSchema>;

const DEFAULTS: NvrFormValues = {
  name: "",
  location: "",
  brand: "usecam",
  templateId: "usecam-nvr-dahua-like",
  host: "",
  port: 554,
  channels: 4,
  username: "",
  password: "",
};

interface AddNvrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (nvrId: string) => void;
}

export function AddNvrDialog({ open, onOpenChange, onCreated }: AddNvrDialogProps) {
  const [values, setValues] = useState<NvrFormValues>(DEFAULTS);
  const [errors, setErrors] = useState<Partial<Record<keyof NvrFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const templates: RtspTemplate[] = useMemo(
    () => getTemplatesForBrand(values.brand),
    [values.brand],
  );
  const template = templates.find((t) => t.id === values.templateId);

  const set = <K extends keyof NvrFormValues>(key: K, value: NvrFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Ao trocar marca, resetar templateId para o primeiro da marca nova.
      if (key === "brand") {
        const first = getTemplatesForBrand(value as RtspBrand)[0];
        if (first) next.templateId = first.id;
        if (first && first.defaultPort) next.port = first.defaultPort;
      }
      if (key === "templateId") {
        const t = templates.find((tp) => tp.id === value);
        if (t) next.port = t.defaultPort;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const previewUrls = useMemo(() => {
    if (!template || !values.host) return [] as { channel: number; url: string; substream?: string }[];
    return Array.from({ length: values.channels }, (_, i) => {
      const ch = i + 1;
      const { primary, substream } = renderTemplate(template, {
        host: values.host,
        port: values.port,
        channel: ch,
      });
      const withCreds = (url: string) => {
        if (!values.username && !values.password) return url;
        try {
          return buildRtspUrl(url, values.username || undefined, values.password || undefined);
        } catch {
          return url;
        }
      };
      return { channel: ch, url: withCreds(primary), substream: substream ? withCreds(substream) : undefined };
    });
  }, [template, values]);

  const reset = () => {
    setValues(DEFAULTS);
    setErrors({});
  };

  const submit = async () => {
    const parsed = nvrFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof NvrFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof NvrFormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (previewUrls.length === 0) {
      toast.error("Não foi possível gerar as URLs dos canais");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_nvr_with_channels", {
        p_name: parsed.data.name,
        p_location: parsed.data.location || "",
        p_brand: parsed.data.brand,
        p_host: parsed.data.host,
        p_port: parsed.data.port,
        p_template_id: parsed.data.templateId,
        p_channels: parsed.data.channels,
        p_channel_urls: previewUrls.map((c) => ({
          channel: c.channel,
          url: c.url,
          substream: c.substream ?? null,
        })),
      });
      if (error) throw error;
      toast.success(`NVR cadastrado — ${previewUrls.length} canal(is) importado(s)`);
      onCreated?.(data as unknown as string);
      onOpenChange(false);
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao cadastrar NVR";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Cadastrar NVR (multi-canal)
          </DialogTitle>
          <DialogDescription>
            Informe o gravador uma única vez — todos os canais serão importados como câmeras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nvr-name">Nome do NVR</Label>
              <Input
                id="nvr-name"
                placeholder="Ex: NVR Loja Centro"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nvr-location">Localização (opcional)</Label>
              <Input
                id="nvr-location"
                placeholder="Ex: Recepção"
                value={values.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={values.brand} onValueChange={(v) => set("brand", v as RtspBrand)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RTSP_TEMPLATES) as RtspBrand[]).map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template RTSP</Label>
              <Select value={values.templateId} onValueChange={(v) => set("templateId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template?.description && (
                <p className="text-xs text-muted-foreground">{template.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nvr-host">IP / host do NVR (LAN)</Label>
              <Input
                id="nvr-host"
                placeholder="192.168.1.10"
                value={values.host}
                onChange={(e) => set("host", e.target.value)}
                aria-invalid={!!errors.host}
              />
              {errors.host && <p className="text-xs text-destructive">{errors.host}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nvr-port">Porta RTSP</Label>
              <Input
                id="nvr-port"
                type="number"
                min={1}
                max={65535}
                value={values.port}
                onChange={(e) => set("port", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nvr-channels">Canais a importar</Label>
              <Input
                id="nvr-channels"
                type="number"
                min={1}
                max={64}
                value={values.channels}
                onChange={(e) => set("channels", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nvr-user">Usuário</Label>
              <Input
                id="nvr-user"
                autoComplete="off"
                placeholder="admin"
                value={values.username ?? ""}
                onChange={(e) => set("username", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nvr-pass">Senha</Label>
              <Input
                id="nvr-pass"
                type="password"
                autoComplete="new-password"
                value={values.password ?? ""}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
          </div>

          {previewUrls.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Prévia das URLs geradas ({previewUrls.length} canal(is))
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs font-mono">
                {previewUrls.slice(0, 8).map((c) => (
                  <div key={c.channel} className="truncate text-muted-foreground">
                    <span className="text-foreground">Ch {c.channel}:</span>{" "}
                    {c.url.replace(/\/\/[^@]+@/, "//***:***@")}
                  </div>
                ))}
                {previewUrls.length > 8 && (
                  <p className="text-muted-foreground">…e mais {previewUrls.length - 8} canal(is)</p>
                )}
              </div>
            </div>
          )}

          <Alert>
            <AlertTitle className="text-sm">Como as imagens chegam até a nuvem</AlertTitle>
            <AlertDescription className="text-xs">
              O cadastro grava as URLs RTSP de cada canal. Para visualizar de qualquer lugar
              sem abrir portas no roteador, instale o <strong>Agente Local</strong> na mesma rede do NVR — ele
              faz a ponte segura via HTTPS de saída.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Cadastrar NVR e {values.channels} canal(is)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddNvrDialog;
