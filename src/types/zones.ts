/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Tipos para Zonas de Interesse (GAP #5)
 * 
 * Define estruturas para:
 * - Criação de zonas (polígonos, retângulos, linhas)
 * - Regras por zona
 * - Detecção de eventos em zonas
 * - Contagem e ocupação
 */

// ============================================
// TIPOS DE ZONA
// ============================================

/** Tipo de forma da zona */
export type ZoneShape = 
  | 'polygon'    // Polígono livre
  | 'rectangle'  // Retângulo
  | 'circle'     // Círculo
  | 'line';      // Linha (tripwire)

/** Tipo de zona por função */
export type ZoneType = 
  | 'restricted'    // Área restrita
  | 'counting'      // Contagem de pessoas
  | 'tripwire'      // Linha de cruzamento
  | 'dwell'         // Tempo de permanência
  | 'occupancy'     // Ocupação máxima
  | 'parking'       // Vaga de estacionamento
  | 'queue'         // Fila
  | 'safety'        // Zona de segurança (EPI)
  | 'custom';       // Personalizada

/** Direção para tripwire */
export type TripwireDirection = 
  | 'both'          // Ambas direções
  | 'left-to-right' // Esquerda para direita
  | 'right-to-left' // Direita para esquerda
  | 'top-to-bottom' // Cima para baixo
  | 'bottom-to-top';// Baixo para cima

// ============================================
// PONTO E GEOMETRIA
// ============================================

/** Ponto 2D (percentuais 0-100) */
export interface Point {
  x: number;
  y: number;
}

/** Geometria da zona */
export interface ZoneGeometry {
  /** Tipo de forma */
  shape: ZoneShape;
  
  /** Pontos do polígono/linha */
  points: Point[];
  
  /** Centro (para círculo) */
  center?: Point;
  
  /** Raio (para círculo, em % da largura) */
  radius?: number;
}

// ============================================
// ZONA DE INTERESSE
// ============================================

export interface Zone {
  /** ID único */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da zona */
  name: string;
  
  /** Descrição */
  description?: string;
  
  /** Tipo de zona */
  type: ZoneType;
  
  /** Geometria */
  geometry: ZoneGeometry;
  
  /** Cor da zona (hex) */
  color: string;
  
  /** Opacidade (0-1) */
  opacity: number;
  
  /** Habilitada */
  enabled: boolean;
  
  /** Configurações específicas por tipo */
  config: ZoneConfig;
  
  /** Regras associadas */
  rules: ZoneRule[];
  
  /** Estatísticas em tempo real */
  stats?: ZoneStats;
  
  /** Criado em */
  createdAt: Date;
  
  /** Atualizado em */
  updatedAt: Date;
}

// ============================================
// CONFIGURAÇÃO POR TIPO DE ZONA
// ============================================

export interface ZoneConfig {
  // Tripwire
  tripwireDirection?: TripwireDirection;
  
  // Occupancy / Counting
  maxOccupancy?: number;
  minOccupancy?: number;
  
  // Dwell time
  maxDwellTime?: number; // segundos
  minDwellTime?: number;
  
  // Queue
  maxQueueLength?: number;
  maxWaitTime?: number; // segundos
  
  // Parking
  isOccupied?: boolean;
  vehicleType?: 'car' | 'motorcycle' | 'truck' | 'any';
  
  // Safety
  requirePPE?: boolean;
  ppeTypes?: ('helmet' | 'vest' | 'glasses' | 'gloves' | 'boots')[];
  
  // Alertas
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  alertOnDwell?: boolean;
  alertCooldown?: number; // segundos
  
  // Schedule
  activeSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: number[];
  };
}

// ============================================
// REGRAS DE ZONA
// ============================================

export interface ZoneRule {
  /** ID da regra */
  id: string;
  
  /** Nome */
  name: string;
  
  /** Tipo de evento */
  eventType: ZoneEventType;
  
  /** Condição */
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    value: number;
    value2?: number; // Para 'between'
  };
  
  /** Ação */
  action: 'alert' | 'log' | 'notify' | 'trigger_recording';
  
  /** Severidade */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Habilitada */
  enabled: boolean;
}

/** Tipos de evento de zona */
export type ZoneEventType = 
  | 'enter'           // Entrou na zona
  | 'exit'            // Saiu da zona
  | 'cross_line'      // Cruzou linha
  | 'dwell_time'      // Tempo de permanência
  | 'occupancy'       // Ocupação
  | 'count_in'        // Contagem entrada
  | 'count_out'       // Contagem saída
  | 'crowd_density'   // Densidade
  | 'loitering'       // Vadiagem
  | 'wrong_direction' // Direção errada
  | 'ppe_violation';  // Violação de EPI

// ============================================
// ESTATÍSTICAS DA ZONA
// ============================================

export interface ZoneStats {
  /** Ocupação atual */
  currentOccupancy: number;
  
  /** Contagem de entrada (total) */
  countIn: number;
  
  /** Contagem de saída (total) */
  countOut: number;
  
  /** Tempo médio de permanência (segundos) */
  avgDwellTime: number;
  
  /** Máximo de ocupação do dia */
  maxOccupancyToday: number;
  
  /** Alertas gerados hoje */
  alertsToday: number;
  
  /** Última detecção */
  lastDetectionAt?: Date;
  
  /** Objetos atualmente na zona */
  currentObjects: TrackedObject[];
}

// ============================================
// OBJETO RASTREADO
// ============================================

export interface TrackedObject {
  /** ID do objeto */
  id: string;
  
  /** Tipo */
  type: 'person' | 'vehicle' | 'object';
  
  /** Posição atual */
  position: Point;
  
  /** Bounding box */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Momento de entrada na zona */
  enteredAt: Date;
  
  /** Tempo na zona (segundos) */
  dwellTime: number;
  
  /** Caminho percorrido */
  path?: Point[];
}

// ============================================
// EVENTO DE ZONA
// ============================================

export interface ZoneEvent {
  /** ID do evento */
  id: string;
  
  /** ID da zona */
  zoneId: string;
  
  /** Nome da zona */
  zoneName: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Tipo de evento */
  eventType: ZoneEventType;
  
  /** Objeto que gerou */
  object?: TrackedObject;
  
  /** Valor (ocupação, contagem, etc) */
  value?: number;
  
  /** Regra violada */
  violatedRule?: ZoneRule;
  
  /** Gerou alerta */
  alertGenerated: boolean;
  
  /** Snapshot */
  snapshot?: string;
  
  /** Timestamp */
  timestamp: Date;
}

// ============================================
// CONFIGURAÇÃO DE DETECÇÃO
// ============================================

export interface ZoneDetectionConfig {
  /** Intervalo de detecção (ms) */
  detectionInterval: number;
  
  /** Sensibilidade de entrada/saída (0-1) */
  enterExitSensitivity: number;
  
  /** Overlap mínimo para considerar dentro (0-1) */
  minOverlapThreshold: number;
  
  /** Habilitar tracking entre frames */
  enableTracking: boolean;
  
  /** Máximo de objetos rastreados */
  maxTrackedObjects: number;
  
  /** Tempo para considerar objeto "perdido" (ms) */
  objectLostTimeout: number;
}

export const defaultZoneDetectionConfig: ZoneDetectionConfig = {
  detectionInterval: 500,
  enterExitSensitivity: 0.5,
  minOverlapThreshold: 0.3,
  enableTracking: true,
  maxTrackedObjects: 50,
  objectLostTimeout: 3000,
};

// ============================================
// EVENTOS DO HOOK
// ============================================

export interface ZoneEvents {
  /** Objeto entrou na zona */
  onEnter?: (zone: Zone, object: TrackedObject) => void;
  
  /** Objeto saiu da zona */
  onExit?: (zone: Zone, object: TrackedObject, dwellTime: number) => void;
  
  /** Cruzou linha */
  onLineCross?: (zone: Zone, object: TrackedObject, direction: string) => void;
  
  /** Ocupação mudou */
  onOccupancyChange?: (zone: Zone, count: number, delta: number) => void;
  
  /** Alerta de ocupação máxima */
  onMaxOccupancy?: (zone: Zone, count: number) => void;
  
  /** Alerta de tempo de permanência */
  onDwellAlert?: (zone: Zone, object: TrackedObject, dwellTime: number) => void;
  
  /** Regra violada */
  onRuleViolation?: (zone: Zone, rule: ZoneRule, event: ZoneEvent) => void;
  
  /** Alerta gerado */
  onAlert?: (zone: Zone, event: ZoneEvent) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Verifica se ponto está dentro de polígono
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Verifica se retângulo está dentro/sobreposto à zona
 */
export function isBoxInZone(
  box: { x: number; y: number; width: number; height: number },
  zone: Zone,
  minOverlap: number = 0.3
): boolean {
  const boxCenter: Point = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  
  // Para polígono/retângulo, verificar centro
  if (zone.geometry.shape === 'polygon' || zone.geometry.shape === 'rectangle') {
    return isPointInPolygon(boxCenter, zone.geometry.points);
  }
  
  // Para círculo
  if (zone.geometry.shape === 'circle' && zone.geometry.center && zone.geometry.radius) {
    const dx = boxCenter.x - zone.geometry.center.x;
    const dy = boxCenter.y - zone.geometry.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= zone.geometry.radius;
  }
  
  return false;
}

/**
 * Calcula área do polígono
 */
export function calculatePolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area / 2);
}

/**
 * Verifica se linha foi cruzada
 */
export function didCrossLine(
  prevPos: Point,
  currPos: Point,
  lineStart: Point,
  lineEnd: Point
): { crossed: boolean; direction: string } {
  // Algoritmo de interseção de segmentos
  const d1 = direction(lineStart, lineEnd, prevPos);
  const d2 = direction(lineStart, lineEnd, currPos);
  const d3 = direction(prevPos, currPos, lineStart);
  const d4 = direction(prevPos, currPos, lineEnd);
  
  const crossed = ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                  ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  
  let dir = 'unknown';
  if (crossed) {
    // Determinar direção baseado no movimento
    const dx = currPos.x - prevPos.x;
    const dy = currPos.y - prevPos.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'left-to-right' : 'right-to-left';
    } else {
      dir = dy > 0 ? 'top-to-bottom' : 'bottom-to-top';
    }
  }
  
  return { crossed, direction: dir };
}

function direction(a: Point, b: Point, c: Point): number {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

/**
 * Gera cor aleatória para zona
 */
export function generateZoneColor(): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Formata tipo de zona
 */
export function getZoneTypeLabel(type: ZoneType): string {
  const labels: Record<ZoneType, string> = {
    restricted: 'Área Restrita',
    counting: 'Contagem',
    tripwire: 'Linha de Cruzamento',
    dwell: 'Tempo de Permanência',
    occupancy: 'Ocupação',
    parking: 'Estacionamento',
    queue: 'Fila',
    safety: 'Segurança/EPI',
    custom: 'Personalizada',
  };
  return labels[type];
}
