/**
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * Reason: tela de bloqueio RBAC/IP whitelist; layout standalone próprio
 * para mensagem de erro de permissão.
 * See docs/LAYOUTS.md §11 — Camada 0.
 */
import { ShieldX, ArrowLeft, Home, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { PageMeta } from '@/components/PageMeta';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  operator: 'Operador',
  viewer: 'Visualizador',
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  viewer: 'Você pode visualizar câmeras, alertas e relatórios.',
  operator: 'Você pode visualizar e operar câmeras, alertas e colaboradores.',
  manager: 'Você pode gerenciar configurações, regras e automações.',
  admin: 'Você tem acesso total ao sistema.',
};

const AcessoNegadoPage = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PageMeta
        title="Acesso Negado"
        description="Você não tem permissão para acessar esta página"
      />
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardContent className="pt-8 pb-6 px-6 space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Permissão insuficiente</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </div>

          {/* Role info */}
          {user && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Sua função atual:</span>
                <span className="text-sm font-semibold text-foreground capitalize">
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              <p className="text-xs text-muted-foreground">
                Se precisa de mais permissões, solicite a um administrador do sistema.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate('/dashboard')} className="w-full gap-2">
              <Home className="w-4 h-4" />
              Ir para o Dashboard
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
              Voltar à página anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcessoNegadoPage;
