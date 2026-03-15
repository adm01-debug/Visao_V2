// @ts-nocheck
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Reconhecimento de Placas (ALPR) - Expandida
 */

import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { LicensePlateRecognition } from '@/components/LicensePlateRecognition';
import { ALPRDashboard } from '@/components/ALPRDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, Car, Plus, Search, Trash2, Edit, AlertTriangle, 
  Shield, History, Download, Filter, RefreshCw 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vehicle {
  id: string;
  plate: string;
  owner_name: string | null;
  vehicle_type: string | null;
  color: string | null;
  list_type: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface PlateDetection {
  id: string;
  plate: string;
  camera_id: string;
  camera_name: string;
  confidence: number;
  timestamp: string;
  image_url?: string;
  is_blacklisted: boolean;
}

export default function LicensePlatePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    plate: '',
    owner: '',
    model: '',
    color: '',
    type: 'visitor' as 'whitelist' | 'blacklist' | 'visitor',
    notes: ''
  });

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar veículos',
        description: 'Não foi possível carregar a lista de veículos.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch detections history
  const fetchDetections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setDetections(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar histórico',
        description: 'Não foi possível carregar o histórico de detecções.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchVehicles();
    fetchDetections();
  }, [fetchVehicles, fetchDetections]);

  // Add/Edit vehicle
  const handleSaveVehicle = async () => {
    try {
      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(formData)
          .eq('id', editingVehicle.id);
        
        if (error) throw error;
        toast({ title: 'Veículo atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: 'Veículo cadastrado com sucesso!' });
      }
      
      setIsAddDialogOpen(false);
      setEditingVehicle(null);
      resetForm();
      fetchVehicles();
    } catch (error) {
      toast({
        title: 'Erro ao salvar veículo',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Veículo excluído com sucesso!' });
      fetchVehicles();
    } catch (error) {
      toast({
        title: 'Erro ao excluir veículo',
        variant: 'destructive'
      });
    }
  };

  // Search plate
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDetections();
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('plate_detections')
        .select('*')
        .ilike('plate', `%${searchQuery}%`)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      setDetections(data || []);
    } catch (error) {
      toast({
        title: 'Erro na busca',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plate: '',
      owner: '',
      model: '',
      color: '',
      type: 'visitor',
      notes: ''
    });
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      owner: vehicle.owner,
      model: vehicle.model,
      color: vehicle.color,
      type: vehicle.type,
      notes: vehicle.notes || ''
    });
    setIsAddDialogOpen(true);
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || v.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'whitelist':
        return <Badge className="bg-green-500">Autorizado</Badge>;
      case 'blacklist':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">Visitante</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Reconhecimento de Placas | VISÃO</title>
        <meta name="description" content="Sistema de reconhecimento automático de placas veiculares" />
      </Helmet>

      <div role="main" aria-label="Reconhecimento de placas" className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Reconhecimento de Placas</h1>
                <p className="text-muted-foreground">Sistema ALPR - Leitura Automática de Placas</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { fetchVehicles(); fetchDetections(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingVehicle(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Veículo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingVehicle ? 'Editar Veículo' : 'Cadastrar Veículo'}</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do veículo para cadastro no sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="plate">Placa *</Label>
                          <Input
                            id="plate"
                            placeholder="ABC-1234"
                            value={formData.plate}
                            onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Tipo *</Label>
                          <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v as Vehicle['type']})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whitelist">Autorizado</SelectItem>
                              <SelectItem value="blacklist">Bloqueado</SelectItem>
                              <SelectItem value="visitor">Visitante</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner">Proprietário</Label>
                        <Input
                          id="owner"
                          placeholder="Nome do proprietário"
                          value={formData.owner}
                          onChange={(e) => setFormData({...formData, owner: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="model">Modelo</Label>
                          <Input
                            id="model"
                            placeholder="Ex: Honda Civic"
                            value={formData.model}
                            onChange={(e) => setFormData({...formData, model: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="color">Cor</Label>
                          <Input
                            id="color"
                            placeholder="Ex: Preto"
                            value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                          />
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
                      <Button onClick={handleSaveVehicle}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="detection" className="gap-2">
                  <Car className="h-4 w-4" />
                  Detecção
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Veículos
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <ALPRDashboard />
              </TabsContent>

              <TabsContent value="detection">
                <LicensePlateRecognition />
              </TabsContent>

              <TabsContent value="vehicles">
                <Card>
                  <CardHeader>
                    <CardTitle>Veículos Cadastrados</CardTitle>
                    <CardDescription>
                      Gerencie a lista de veículos autorizados, bloqueados e visitantes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <Input
                          placeholder="Buscar por placa ou proprietário..."
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
                          <SelectItem value="visitor">Visitantes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placa</TableHead>
                          <TableHead>Proprietário</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cadastrado em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Nenhum veículo encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredVehicles.map((vehicle) => (
                            <TableRow key={vehicle.id}>
                              <TableCell className="font-mono font-bold">{vehicle.plate}</TableCell>
                              <TableCell>{vehicle.owner || '-'}</TableCell>
                              <TableCell>{vehicle.model || '-'}</TableCell>
                              <TableCell>{vehicle.color || '-'}</TableCell>
                              <TableCell>{getTypeBadge(vehicle.type)}</TableCell>
                              <TableCell>
                                {format(new Date(vehicle.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(vehicle)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteVehicle(vehicle.id)}>
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
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Detecções</CardTitle>
                    <CardDescription>
                      Últimas 100 placas detectadas pelo sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-6">
                      <Input
                        placeholder="Buscar placa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                      />
                      <Button onClick={handleSearch}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placa</TableHead>
                          <TableHead>Câmera</TableHead>
                          <TableHead>Confiança</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detections.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhuma detecção encontrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          detections.map((detection) => (
                            <TableRow key={detection.id}>
                              <TableCell className="font-mono font-bold">{detection.plate}</TableCell>
                              <TableCell>{detection.camera_name}</TableCell>
                              <TableCell>
                                <Badge variant={detection.confidence > 0.9 ? 'default' : 'secondary'}>
                                  {(detection.confidence * 100).toFixed(0)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {detection.is_blacklisted ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Bloqueado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Normal</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(detection.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}
