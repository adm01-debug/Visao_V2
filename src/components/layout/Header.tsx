/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Header Component
 */

import { memo } from "react";
import { Bell, Search, Settings, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  className?: string;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

function HeaderComponent({ className, onMenuToggle, showMenuButton = false }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6",
        className
      )}
    >
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search */}
      <div className="flex-1 md:max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="pl-8 bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
              <span className="sr-only">Notificações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1">
              <span className="font-medium">Alerta de segurança</span>
              <span className="text-xs text-muted-foreground">
                Movimento detectado na Câmera 3
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1">
              <span className="font-medium">Sistema atualizado</span>
              <span className="text-xs text-muted-foreground">
                Versão 2.1.0 instalada com sucesso
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Configurações</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="Usuário" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
export default Header;
