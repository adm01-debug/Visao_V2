/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Colaboradores / Pessoas (Refatorada)
 */

import { Users, UserPlus, Search, LayoutGrid, List, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { usePeopleData } from '@/components/people/usePeopleData';
import { PersonCard } from '@/components/people/PersonCard';
import { PersonFormDialog } from '@/components/people/PersonFormDialog';
import { PersonDetailsDialog } from '@/components/people/PersonDetailsDialog';
import { PeopleStatsBar } from '@/components/people/PeopleStatsBar';
import { PeopleListView } from '@/components/people/PeopleListView';
import { PageMeta } from '@/components/PageMeta';

export default function PeoplePage() {
  const {
    loading, viewMode, setViewMode, filters, setFilters,
    selectedPerson, setSelectedPerson, isFormOpen, setIsFormOpen,
    editingPerson, setEditingPerson, deleteConfirm, setDeleteConfirm,
    currentPage, setCurrentPage, paginatedPeople, filteredPeople,
    totalPages, stats, loadPeople, handleSavePerson, handleDeletePerson,
  } = usePeopleData();

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title="Colaboradores" description="Cadastro e gestão de pessoas reconhecidas" />
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />Colaboradores
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie as pessoas cadastradas no sistema de reconhecimento
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={loadPeople} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />Cadastrar
              </Button>
            </div>
          </div>
          <PeopleStatsBar stats={stats} />
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, departamento, cargo..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-9"
            />
            {filters.search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setFilters(f => ({ ...f, search: '' }))}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="active-only" checked={filters.activeOnly}
              onCheckedChange={(checked) => setFilters(f => ({ ...f, activeOnly: checked }))} />
            <Label htmlFor="active-only" className="text-sm">Apenas ativos</Label>
          </div>
          <div className="flex items-center border rounded-lg p-1">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className={cn('gap-4', viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2')}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} className={viewMode === 'grid' ? 'h-32' : 'h-16'} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredPeople.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-1">
              {filters.search || filters.activeOnly ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa cadastrada'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.activeOnly ? 'Tente ajustar os filtros' : 'Cadastre a primeira pessoa para começar'}
            </p>
            {!(filters.search || filters.activeOnly) && (
              <Button onClick={() => { setEditingPerson(null); setIsFormOpen(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />Cadastrar pessoa
              </Button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && viewMode === 'grid' && paginatedPeople.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPeople.map(person => (
              <PersonCard key={person.id} person={person}
                onView={() => setSelectedPerson(person)}
                onEdit={() => { setEditingPerson(person); setIsFormOpen(true); }}
                onDelete={() => setDeleteConfirm(person)} />
            ))}
          </div>
        )}

        {/* List */}
        {!loading && viewMode === 'list' && paginatedPeople.length > 0 && (
          <PeopleListView people={paginatedPeople}
            onView={(p) => setSelectedPerson(p)}
            onEdit={(p) => { setEditingPerson(p); setIsFormOpen(true); }}
            onDelete={(p) => setDeleteConfirm(p)} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <PersonFormDialog person={editingPerson} isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPerson(null); }}
        onSave={handleSavePerson} />

      <PersonDetailsDialog person={selectedPerson} isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onEdit={() => { setEditingPerson(selectedPerson); setIsFormOpen(true); setSelectedPerson(null); }}
        onDelete={() => { setDeleteConfirm(selectedPerson); setSelectedPerson(null); }} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerson} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
