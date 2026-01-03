/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sample Data - Dados de exemplo para desenvolvimento e demonstração
 */

export const samplePersons = [
  {
    id: 'person-001',
    name: 'João Silva',
    role: 'Operador',
    department: 'Produção',
    status: 'active',
  },
  {
    id: 'person-002',
    name: 'Maria Santos',
    role: 'Supervisora',
    department: 'Segurança',
    status: 'active',
  },
  {
    id: 'person-003',
    name: 'Carlos Oliveira',
    role: 'Gerente',
    department: 'Administrativo',
    status: 'active',
  },
];

export const sampleVehicles = [
  {
    id: 'vehicle-001',
    plate: 'ABC1234',
    type: 'car',
    color: 'Preto',
    owner: 'João Silva',
    status: 'allowed',
  },
  {
    id: 'vehicle-002',
    plate: 'XYZ5678',
    type: 'truck',
    color: 'Branco',
    owner: 'Empresa XYZ',
    status: 'allowed',
  },
  {
    id: 'vehicle-003',
    plate: 'DEF9012',
    type: 'motorcycle',
    color: 'Vermelho',
    owner: 'Carlos Oliveira',
    status: 'blocked',
  },
];

export const sampleZones = [
  {
    id: 'zone-001',
    name: 'Área de Produção',
    type: 'restricted',
    color: '#FF6B6B',
    cameraIds: ['cam-002', 'cam-004'],
    isActive: true,
  },
  {
    id: 'zone-002',
    name: 'Estacionamento',
    type: 'monitored',
    color: '#4ECDC4',
    cameraIds: ['cam-003'],
    isActive: true,
  },
  {
    id: 'zone-003',
    name: 'Entrada Principal',
    type: 'access',
    color: '#45B7D1',
    cameraIds: ['cam-001'],
    isActive: true,
  },
];

export const sampleRecordings = [
  {
    id: 'rec-001',
    cameraId: 'cam-001',
    cameraName: 'Entrada Principal',
    startTime: new Date(Date.now() - 1000 * 60 * 60),
    endTime: new Date(Date.now() - 1000 * 60 * 30),
    duration: 1800,
    size: 256000000,
    hasAlert: false,
  },
  {
    id: 'rec-002',
    cameraId: 'cam-002',
    cameraName: 'Linha de Produção 1',
    startTime: new Date(Date.now() - 1000 * 60 * 120),
    endTime: new Date(Date.now() - 1000 * 60 * 60),
    duration: 3600,
    size: 512000000,
    hasAlert: true,
    alertId: 'alert-002',
  },
];
