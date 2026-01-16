/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Gerenciador de Blacklist/Whitelist de Faces
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Trash2, Edit, AlertTriangle, Shield, ShieldAlert,
  ShieldCheck, User, Upload, Filter, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Person {
  id: string;
  name: string;
  document?: string;
  list_type: 'whitelist' | 'blacklist' | 'vip' | 'unknown';
  notes?: string;
  image_url?: string;
  created_at: string;
  last_seen?: string;
  detection_count: number;
}

export function FaceBlacklistManager() {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    list_type: 'unknown' as Person['list_type'],
    notes: ''
  });

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('known_faces')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar pessoas',
        description: 'Não foi possível carregar a lista.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `faces/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('faces')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('faces')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      // Upload error handled silently
      return null;
    }
  };

  const handleSavePerson = async () => {
    try {
      let imageUrl = editingPerson?.image_url || null;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const personData = {
        ...formData,
        image_url: imageUrl
      };

      if (editingPerson) {
        const { error } = await supabase
          .from('known_faces')
          .update(personData)
          .eq('id', editingPerson.id);
        
        if (error) throw error;
        toast({ title: 'Pessoa atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('known_faces')
          .insert([personData]);
        
        if (error) throw error;
        toast({ title: 'Pessoa cadastrada com sucesso!' });
      }
      
      setIsAddDialogOpen(false);
      setEditingPerson(null);
      resetForm();
      fetchPeople();
    } catch (error) {
      toast({
        title: 'Erro ao salvar pessoa',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) return;
    
    try {
      const { error } = await supabase
        .from('known_faces')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Pessoa excluída com sucesso!' });
      fetchPeople();
    } catch (error) {
      toast({
        title: 'Erro ao excluir pessoa',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      document: '',
      list_type: 'unknown',
      notes: ''
    });
    setSelectedImage(null);
    setPreviewUrl('');
  };

  const openEditDialog = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      document: person.document || '',
      list_type: person.list_type,
      notes: person.notes || ''
    });
    setPreviewUrl(person.image_url || '');
    setIsAddDialogOpen(true);
  };

  const filteredPeople = people.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.document?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || p.list_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'whitelist':
        return <Badge className="bg-green-500 gap-1"><ShieldCheck className="h-3 w-3" />Autorizado</Badge>;
      case 'blacklist':
        return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" />Bloqueado</Badge>;
      case 'vip':
        return <Badge className="bg-amber-500 gap-1"><Shield className="h-3 w-3" />VIP</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" />Desconhecido</Badge>;
    }
  };

  const stats = {
    total: people.length,
    whitelist: people.filter(p => p.list_type === 'whitelist').length,
    blacklist: people.filter(p => p.list_type === 'blacklist').length,
    vip: people.filter(p => p.list_type === 'vip').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Autorizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.whitelist}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Bloqueados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.blacklist}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">VIP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.vip}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Listas</CardTitle>
              <CardDescription>
                Gerencie pessoas autorizadas, bloqueadas e VIPs
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchPeople} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setEditingPerson(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Pessoa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingPerson ? 'Editar Pessoa' : 'Cadastrar Pessoa'}</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para cadastro no sistema de reconhecimento.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex justify-center">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={previewUrl} />
                          <AvatarFallback>{formData.name.charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
                        <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1 rounded-full cursor-pointer">
                          <Upload className="h-4 w-4" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="document">Documento</Label>
                        <Input
                          id="document"
                          placeholder="CPF/RG"
                          value={formData.document}
                          onChange={(e) => setFormData({...formData, document: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Classificação *</Label>
                        <Select value={formData.list_type} onValueChange={(v) => setFormData({...formData, list_type: v as Person['list_type']})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whitelist">Autorizado</SelectItem>
                            <SelectItem value="blacklist">Bloqueado</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="unknown">Desconhecido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Input
                        id="notes"
                        placeholder="Notas adicionais"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSavePerson} disabled={!formData.name}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whitelist">Autorizados</SelectItem>
                <SelectItem value="blacklist">Bloqueados</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="unknown">Desconhecidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Detecções</TableHead>
                <TableHead>Última visualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma pessoa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredPeople.map((person) => (
                  <TableRow key={person.id} className={person.list_type === 'blacklist' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.image_url || ''} />
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.document || '-'}</TableCell>
                    <TableCell>{getTypeBadge(person.list_type)}</TableCell>
                    <TableCell>{person.detection_count || 0}</TableCell>
                    <TableCell>
                      {person.last_seen 
                        ? format(new Date(person.last_seen), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(person)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePerson(person.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
