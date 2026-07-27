import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface UploadPlanDialogProps {
  saving: boolean;
  onCreate: (file: File, name: string, dimensions: { width: number; height: number }) => Promise<boolean>;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 12 * 1024 * 1024;

/** Lê as dimensões reais da imagem — sem elas o encaixe distorce a planta. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagem ilegível'));
    };
    image.src = url;
  });
}

export function UploadPlanDialog({ saving, onCreate }: UploadPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    setProblem(null);
    const file = fileRef.current?.files?.[0];

    if (!file) return setProblem('Escolha a imagem da planta.');
    if (!ACCEPTED.includes(file.type)) return setProblem('Formato aceito: PNG, JPG, WEBP ou SVG.');
    if (file.size > MAX_BYTES) return setProblem('A imagem precisa ter no máximo 12 MB.');
    if (name.trim().length < 2) return setProblem('Dê um nome à planta (ex.: "Térreo — Galpão A").');

    let dimensions: { width: number; height: number };
    try {
      dimensions = await readDimensions(file);
    } catch {
      return setProblem('Não consegui ler essa imagem. Tente exportar novamente.');
    }
    if (dimensions.width < 16 || dimensions.height < 16) {
      return setProblem('A imagem é pequena demais para servir de planta.');
    }

    const ok = await onCreate(file, name, dimensions);
    if (ok) {
      setOpen(false);
      setName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova planta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar planta baixa</DialogTitle>
          <DialogDescription>
            A imagem fica em área privada: só você e quem você autorizar conseguem abri-la.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nome</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Térreo — Galpão A"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-file">Imagem da planta</Label>
            <Input id="plan-file" type="file" ref={fileRef} accept={ACCEPTED.join(',')} />
          </div>
          {problem && (
            <p className="text-sm text-destructive" role="alert">
              {problem}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Enviando…' : 'Salvar planta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
