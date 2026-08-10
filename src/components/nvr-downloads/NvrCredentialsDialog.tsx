/**
 * Diálogo para captura das credenciais HTTP-CGI de um NVR.
 * As credenciais NUNCA são persistidas — ficam em memória durante a sessão.
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';

export type NvrCreds = {
  host: string;
  http_port: number;
  username: string;
  password: string;
};

interface Props {
  open: boolean;
  nvrName: string;
  nvrHost: string;
  onCancel: () => void;
  onConfirm: (creds: NvrCreds) => void;
}

export function NvrCredentialsDialog({ open, nvrName, nvrHost, onCancel, onConfirm }: Props) {
  const [host, setHost] = useState(nvrHost);
  const [port, setPort] = useState<number>(80);
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');

  useEffect(() => {
    if (open) {
      setHost(nvrHost);
      setPort(80);
      setUser('admin');
      setPass('');
    }
  }, [open, nvrHost]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciais do NVR — {nvrName}</DialogTitle>
          <DialogDescription>
            Necessárias para o backend consultar as gravações via HTTP-CGI. Ficam apenas em memória.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="nvr-host">Host</Label>
              <Input id="nvr-host" value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nvr-port">Porta HTTP</Label>
              <Input
                id="nvr-port"
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nvr-user">Usuário</Label>
            <Input
              id="nvr-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nvr-pass">Senha</Label>
            <Input
              id="nvr-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-primary" aria-hidden />
            As credenciais são usadas somente pela Edge Function nesta sessão e não são armazenadas.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                host: host.trim(),
                http_port: port,
                username: user.trim(),
                password: pass,
              })
            }
            disabled={!host.trim() || !user.trim() || !pass}
          >
            Usar credenciais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
