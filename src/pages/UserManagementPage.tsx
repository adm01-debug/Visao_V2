import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { CapabilityGrantsCard } from '@/components/permissions/CapabilityGrantsCard';

interface ManagedUser {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  manager: "Gerente",
  operator: "Operador",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "destructive",
  manager: "default",
  operator: "secondary",
  viewer: "outline",
};

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, role: currentRole, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "GET",
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (err: unknown) {
      toast({
        title: "Erro ao carregar usuários",
        description: err instanceof Error ? err.message : "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && !roleLoading) {
      fetchUsers();
    }
  }, [isAdmin, roleLoading, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { user_id: userId, new_role: newRole },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Role atualizada",
        description: `Usuário promovido a ${ROLE_LABELS[newRole]}`,
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao atualizar role",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="p-6 space-y-4">
      <PageMeta title="Gestão de Usuários" description="Gerencie usuários e permissões do sistema" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/acesso-negado" replace />;
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <PageContent>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie permissões e roles dos usuários do sistema
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(["admin", "manager", "operator", "viewer"] as AppRole[]).map(
          (role) => {
            const count = users.filter((u) => u.role === role).length;
            return (
              <Card key={role}>
                <CardHeader className="pb-2">
                  <CardDescription>{ROLE_LABELS[role]}s</CardDescription>
                  <CardTitle className="text-3xl">{loading ? "—" : count}</CardTitle>
                </CardHeader>
              </Card>
            );
          }
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Usuários ({loading ? "..." : users.length})</CardTitle>
          </div>
          <CardDescription>
            Clique na role para alterar as permissões de um usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário encontrado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Criado em</TableHead>
                    <TableHead className="hidden md:table-cell">Último acesso</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(u.full_name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {u.full_name || "Sem nome"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.id === user?.id ? (
                          <Badge variant={ROLE_COLORS[u.role] as "default" | "secondary" | "destructive" | "outline"}>
                            {ROLE_LABELS[u.role]} (você)
                          </Badge>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(val) =>
                              handleRoleChange(u.id, val as AppRole)
                            }
                            disabled={updatingUserId === u.id}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(ROLE_LABELS) as AppRole[]
                              ).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {format(new Date(u.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {u.last_sign_in_at
                          ? format(
                              new Date(u.last_sign_in_at),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR }
                            )
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant={
                            u.email_confirmed_at ? "default" : "secondary"
                          }
                        >
                          {u.email_confirmed_at ? "Ativo" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {user?.id && (
        <CapabilityGrantsCard
          users={users.map((u) => ({ id: u.id, email: u.email, role: u.role }))}
          actorId={user.id}
          actorRole={currentRole}
        />
      )}
    </PageContent>
  );
};

export default UserManagementPage;
