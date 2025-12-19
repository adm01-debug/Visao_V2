/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: PersonCard
 * 
 * Card para exibição de pessoa cadastrada no sistema de reconhecimento facial.
 */

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Shield,
  Star,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Ban,
  Check,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Person,
  ListType,
  getListTypeColor,
  getListTypeLabel,
} from '@/types/faceRecognition';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

interface PersonCardProps {
  /** Pessoa */
  person: Person;
  
  /** Callbacks */
  onEdit?: (person: Person) => void;
  onDelete?: (personId: string) => void;
  onAddPhoto?: (personId: string) => void;
  onToggleStatus?: (personId: string, status: Person['status']) => void;
  onViewDetails?: (person: Person) => void;
  
  /** Modo compacto */
  compact?: boolean;
  
  /** Selecionado */
  selected?: boolean;
  
  /** Callback de seleção */
  onSelect?: (personId: string) => void;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// ÍCONES POR TIPO DE LISTA
// ============================================

const listTypeIcons: Record<ListType, React.ElementType> = {
  whitelist: Check,
  blacklist: Ban,
  vip: Star,
  employee: Briefcase,
  visitor: User,
  contractor: Building,
  unknown: User,
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function PersonCard({
  person,
  onEdit,
  onDelete,
  onAddPhoto,
  onToggleStatus,
  onViewDetails,
  compact = false,
  selected = false,
  onSelect,
  className,
}: PersonCardProps) {
  const ListTypeIcon = listTypeIcons[person.listType];
  const initials = person.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ============================================
  // RENDER: Modo Compacto
  // ============================================

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer',
          'hover:bg-accent/50',
          selected && 'bg-accent ring-2 ring-primary',
          className
        )}
        onClick={() => onSelect?.(person.id)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={person.photoUrl} alt={person.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{person.name}</span>
            <Badge className={cn('text-white border-0 text-xs', getListTypeColor(person.listType))}>
              {getListTypeLabel(person.listType)}
            </Badge>
          </div>
          {person.company && (
            <p className="text-xs text-muted-foreground truncate">{person.company}</p>
          )}
        </div>

        {person.status === 'blocked' && (
          <Ban className="w-4 h-4 text-destructive" />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: Modo Completo
  // ============================================

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'overflow-hidden transition-all hover:shadow-lg',
          selected && 'ring-2 ring-primary',
          person.status === 'blocked' && 'opacity-60',
          className
        )}
      >
        {/* Header com foto */}
        <div className="relative">
          {/* Background gradient */}
          <div className={cn(
            'h-20',
            getListTypeColor(person.listType),
            'opacity-80'
          )} />

          {/* Avatar */}
          <div className="absolute -bottom-10 left-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={person.photoUrl} alt={person.name} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
          </div>

          {/* Menu */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(person)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(person)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddPhoto?.(person.id)}>
                  <Camera className="w-4 h-4 mr-2" />
                  Adicionar foto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {person.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onToggleStatus?.(person.id, 'blocked')}>
                    <Ban className="w-4 h-4 mr-2" />
                    Bloquear
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleStatus?.(person.id, 'active')}>
                    <Check className="w-4 h-4 mr-2" />
                    Ativar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(person.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge className={cn('text-white border-0', getListTypeColor(person.listType))}>
              <ListTypeIcon className="w-3 h-3 mr-1" />
              {getListTypeLabel(person.listType)}
            </Badge>
            {person.status === 'blocked' && (
              <Badge variant="destructive">Bloqueado</Badge>
            )}
          </div>
        </div>

        <CardContent className="pt-12 pb-4">
          {/* Nome e cargo */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg">{person.name}</h3>
            {person.role && (
              <p className="text-sm text-muted-foreground">{person.role}</p>
            )}
          </div>

          {/* Informações */}
          <div className="space-y-2 text-sm">
            {person.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="w-4 h-4" />
                <span>{person.company}</span>
                {person.department && (
                  <span className="text-xs">• {person.department}</span>
                )}
              </div>
            )}

            {person.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{person.email}</span>
              </div>
            )}

            {person.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{person.phone}</span>
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="text-lg font-bold text-primary">
                    {person.recognitionCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Detecções</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total de reconhecimentos</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="text-lg font-bold">
                    {person.trainingPhotos.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Fotos</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Fotos de treinamento</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="text-lg font-bold">
                    {person.encodingQuality 
                      ? `${Math.round(person.encodingQuality * 100)}%` 
                      : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">Qualidade</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Qualidade do modelo facial</TooltipContent>
            </Tooltip>
          </div>

          {/* Último acesso */}
          {person.lastSeenAt && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Último acesso</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(person.lastSeenAt, { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          )}

          {person.lastSeenCameraName && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{person.lastSeenCameraName}</span>
            </div>
          )}

          {/* Tags */}
          {person.tags && person.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {person.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {person.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{person.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Horário de acesso */}
          {person.accessSchedule?.enabled && (
            <div className="mt-3 p-2 bg-accent/50 rounded-lg text-xs">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" />
                <span>Horário permitido</span>
              </div>
              <div className="font-medium">
                {person.accessSchedule.startTime} - {person.accessSchedule.endTime}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default PersonCard;
