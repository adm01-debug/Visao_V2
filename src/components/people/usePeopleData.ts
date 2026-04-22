import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useManagedFilters } from '@/hooks/useManagedFilters';
import type { DbPerson, DbPersonInsert, Filters, ViewMode } from './types';

const defaultPeopleFilters: Filters = { search: '', activeOnly: false };

export function usePeopleData() {
  const { user } = useAuth();
  const [people, setPeople] = useState<DbPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { filters, setFilters, clearFilters, hasActiveFilters } = useManagedFilters<Filters & { [key: string]: unknown }>({
    scope: 'people',
    defaults: defaultPeopleFilters,
    labels: { search: 'busca', activeOnly: 'apenas ativos' },
    isActive: (key, value) => key === 'search' ? value !== '' : value === true,
  });
  const [selectedPerson, setSelectedPerson] = useState<DbPerson | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DbPerson | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DbPerson | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('*')
        .order('name');

      if (error) throw error;
      setPeople(data || []);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const searchFields = [person.name, person.department, person.role]
          .filter(Boolean)
          .map(f => f!.toLowerCase());
        if (!searchFields.some(f => f.includes(query))) return false;
      }
      if (filters.activeOnly && !person.is_active) return false;
      return true;
    });
  }, [people, filters]);

  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const paginatedPeople = filteredPeople.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSavePerson = async (data: Partial<DbPersonInsert>) => {
    if (!user) return;
    if (editingPerson) {
      const { error } = await supabase
        .from('registered_persons')
        .update(data)
        .eq('id', editingPerson.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('registered_persons')
        .insert({ ...data, user_id: user.id } as DbPersonInsert);
      if (error) throw error;
    }
    loadPeople();
    setEditingPerson(null);
  };

  const handleDeletePerson = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase
        .from('registered_persons')
        .delete()
        .eq('id', deleteConfirm.id);
      if (error) throw error;
      toast.success('Pessoa removida');
      loadPeople();
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setDeleteConfirm(null);
      setSelectedPerson(null);
    }
  };

  const stats = useMemo(() => ({
    total: people.length,
    active: people.filter(p => p.is_active).length,
    inactive: people.filter(p => !p.is_active).length,
  }), [people]);

  return {
    people, loading, viewMode, setViewMode, filters, setFilters,
    selectedPerson, setSelectedPerson, isFormOpen, setIsFormOpen,
    editingPerson, setEditingPerson, deleteConfirm, setDeleteConfirm,
    currentPage, setCurrentPage, filteredPeople, paginatedPeople,
    totalPages, stats, loadPeople, handleSavePerson, handleDeletePerson,
  };
}
