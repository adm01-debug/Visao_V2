/**
 * Exclusão da própria conta pelo titular (LGPD art. 18, VI).
 *
 * A edge function `delete-my-account` (com rate limit e cascata via
 * `delete_user_data`) existia sem nenhum consumidor: o direito de eliminação só
 * era exercível por fora do produto. Este card é o gatilho na interface —
 * confirmação digitada porque a operação apaga dados em cascata e a conta de
 * acesso, sem volta.
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { humanizeFunctionError } from '@/lib/edgeFunctionErrors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const CONFIRMATION_WORD = 'EXCLUIR';

export function AccountDeletionCard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = typed.trim().toUpperCase() === CONFIRMATION_WORD;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (deleting) return;
      setOpen(next);
      if (!next) setTyped('');
    },
    [deleting]
  );

  const deleteAccount = useCallback(async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-my-account', { method: 'POST' });
      if (error) throw error;
      toast.success('Sua conta foi excluída permanentemente.');
      setOpen(false);
      setTyped('');
      await signOut();
      navigate('/auth', { replace: true });
    } catch (err) {
      const { message } = await humanizeFunctionError(err, 'Não foi possível excluir a conta');
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }, [confirmed, deleting, navigate, signOut]);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Excluir minha conta
        </CardTitle>
        <CardDescription>
          Remove permanentemente a conta e os dados associados: câmeras, gravações, máscaras,
          alertas e histórico. Não há como desfazer nem recuperar depois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exporte antes o que precisar guardar. A operação também remove a conta de acesso
          {user?.email ? ' ' : ' '}
          <span className="font-medium">{user?.email ?? 'vinculada a este usuário'}</span>.
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir minha conta
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta permanentemente</DialogTitle>
            <DialogDescription>
              Esta ação apaga a conta, as câmeras, as gravações e as configurações. É irreversível.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">
              Digite {CONFIRMATION_WORD} para confirmar
            </Label>
            <Input
              id="delete-account-confirmation"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={deleting}
              placeholder={CONFIRMATION_WORD}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={!confirmed || deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
