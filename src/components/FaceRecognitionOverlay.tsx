/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: FaceRecognitionOverlay
 * 
 * Overlay para exibição de faces detectadas e reconhecidas sobre o vídeo.
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DetectedFace,
  RecognitionResult,
  getListTypeColor,
  getListTypeLabel,
} from '@/types/faceRecognition';
import {
  User,
  UserCheck,
  UserX,
  AlertTriangle,
  Star,
  Ban,
  Shield,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface FaceRecognitionOverlayProps {
  /** Resultados de reconhecimento */
  results: RecognitionResult[];
  
  /** Faces detectadas (sem matching) */
  detectedFaces?: DetectedFace[];
  
  /** Mostrar atributos */
  showAttributes?: boolean;
  
  /** Mostrar similaridade */
  showSimilarity?: boolean;
  
  /** Mostrar landmarks */
  showLandmarks?: boolean;
  
  /** Animação de pulso em alertas */
  pulseOnAlert?: boolean;
  
  /** Callback ao clicar em uma face */
  onFaceClick?: (result: RecognitionResult) => void;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// FACE BOX COMPONENT
// ============================================

function FaceBox({
  result,
  showAttributes,
  showSimilarity,
  showLandmarks,
  pulseOnAlert,
  onClick,
}: {
  result: RecognitionResult;
  showAttributes?: boolean;
  showSimilarity?: boolean;
  showLandmarks?: boolean;
  pulseOnAlert?: boolean;
  onClick?: () => void;
}) {
  const { face, bestMatch, isKnown, shouldAlert, action } = result;
  const { boundingBox, attributes, landmarks, quality, confidence } = face;

  // Determinar cor do box
  const getBoxColor = () => {
    if (shouldAlert && action === 'block') return 'border-red-500 bg-red-500/20';
    if (shouldAlert) return 'border-yellow-500 bg-yellow-500/20';
    if (bestMatch?.listType === 'blacklist') return 'border-red-500 bg-red-500/10';
    if (bestMatch?.listType === 'vip') return 'border-yellow-400 bg-yellow-400/10';
    if (isKnown) return 'border-green-500 bg-green-500/10';
    return 'border-blue-400 bg-blue-400/10';
  };

  // Ícone
  const getIcon = () => {
    if (bestMatch?.listType === 'blacklist') return Ban;
    if (bestMatch?.listType === 'vip') return Star;
    if (shouldAlert) return AlertTriangle;
    if (isKnown) return UserCheck;
    return User;
  };

  const Icon = getIcon();

  return (
    <div
      className={cn(
        'absolute border-2 rounded-lg transition-all duration-300 cursor-pointer',
        getBoxColor(),
        shouldAlert && pulseOnAlert && 'animate-pulse'
      )}
      style={{
        left: `${boundingBox.x}%`,
        top: `${boundingBox.y}%`,
        width: `${boundingBox.width}%`,
        height: `${boundingBox.height}%`,
      }}
      onClick={onClick}
    >
      {/* Label superior */}
      <div className="absolute -top-7 left-0 flex items-center gap-1">
        <Badge
          className={cn(
            'text-white border-0 text-xs px-1.5 py-0.5 flex items-center gap-1',
            isKnown && bestMatch
              ? getListTypeColor(bestMatch.listType)
              : shouldAlert
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          )}
        >
          <Icon className="w-3 h-3" />
          {isKnown && bestMatch ? (
            <span className="truncate max-w-[100px]">{bestMatch.personName}</span>
          ) : (
            <span>Desconhecido</span>
          )}
        </Badge>

        {/* Similaridade */}
        {showSimilarity && bestMatch && (
          <Badge variant="outline" className="text-xs bg-background/80">
            {Math.round(bestMatch.similarity * 100)}%
          </Badge>
        )}
      </div>

      {/* Label inferior com atributos */}
      {showAttributes && attributes && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center gap-1 text-[10px]">
          {attributes.age && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              {attributes.age} anos
            </Badge>
          )}
          {attributes.gender && attributes.gender !== 'unknown' && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              {attributes.gender === 'male' ? '♂' : '♀'}
            </Badge>
          )}
          {attributes.emotion && attributes.emotion !== 'neutral' && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              {attributes.emotion}
            </Badge>
          )}
          {attributes.mask && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              Máscara
            </Badge>
          )}
          {attributes.glasses && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              Óculos
            </Badge>
          )}
        </div>
      )}

      {/* Landmarks */}
      {showLandmarks && landmarks && (
        <>
          <LandmarkDot
            x={(landmarks.leftEye.x - boundingBox.x) / boundingBox.width * 100}
            y={(landmarks.leftEye.y - boundingBox.y) / boundingBox.height * 100}
            color="cyan"
          />
          <LandmarkDot
            x={(landmarks.rightEye.x - boundingBox.x) / boundingBox.width * 100}
            y={(landmarks.rightEye.y - boundingBox.y) / boundingBox.height * 100}
            color="cyan"
          />
          <LandmarkDot
            x={(landmarks.nose.x - boundingBox.x) / boundingBox.width * 100}
            y={(landmarks.nose.y - boundingBox.y) / boundingBox.height * 100}
            color="green"
          />
          <LandmarkDot
            x={(landmarks.leftMouth.x - boundingBox.x) / boundingBox.width * 100}
            y={(landmarks.leftMouth.y - boundingBox.y) / boundingBox.height * 100}
            color="red"
          />
          <LandmarkDot
            x={(landmarks.rightMouth.x - boundingBox.x) / boundingBox.width * 100}
            y={(landmarks.rightMouth.y - boundingBox.y) / boundingBox.height * 100}
            color="red"
          />
        </>
      )}

      {/* Indicador de qualidade */}
      <div className="absolute bottom-1 right-1">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            quality > 0.7 ? 'bg-green-500' :
            quality > 0.4 ? 'bg-yellow-500' :
            'bg-red-500'
          )}
          title={`Qualidade: ${Math.round(quality * 100)}%`}
        />
      </div>
    </div>
  );
}

// ============================================
// LANDMARK DOT
// ============================================

function LandmarkDot({
  x,
  y,
  color,
}: {
  x: number;
  y: number;
  color: string;
}) {
  return (
    <div
      className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}`,
      }}
    />
  );
}

// ============================================
// DETECTED FACE BOX (sem matching)
// ============================================

function DetectedFaceBox({
  face,
  showAttributes,
}: {
  face: DetectedFace;
  showAttributes?: boolean;
}) {
  const { boundingBox, confidence, quality, attributes } = face;

  return (
    <div
      className="absolute border-2 border-dashed border-gray-400 bg-gray-400/10 rounded-lg"
      style={{
        left: `${boundingBox.x}%`,
        top: `${boundingBox.y}%`,
        width: `${boundingBox.width}%`,
        height: `${boundingBox.height}%`,
      }}
    >
      <div className="absolute -top-6 left-0">
        <Badge variant="outline" className="text-xs bg-background/80">
          <User className="w-3 h-3 mr-1" />
          Face detectada
        </Badge>
      </div>

      {showAttributes && attributes && (
        <div className="absolute -bottom-5 left-0 flex gap-1 text-[10px]">
          {attributes.age && (
            <Badge variant="outline" className="bg-background/80 px-1 py-0">
              ~{attributes.age}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function FaceRecognitionOverlay({
  results,
  detectedFaces = [],
  showAttributes = true,
  showSimilarity = true,
  showLandmarks = false,
  pulseOnAlert = true,
  onFaceClick,
  className,
}: FaceRecognitionOverlayProps) {
  // Faces que já têm resultado (não duplicar)
  const resultFaceIds = new Set(results.map(r => r.face.id));
  const unprocessedFaces = detectedFaces.filter(f => !resultFaceIds.has(f.id));

  if (results.length === 0 && unprocessedFaces.length === 0) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-10', className)}>
      {/* Faces com resultado de reconhecimento */}
      {results.map((result, index) => (
        <div key={result.face.id || index} className="pointer-events-auto">
          <FaceBox
            result={result}
            showAttributes={showAttributes}
            showSimilarity={showSimilarity}
            showLandmarks={showLandmarks}
            pulseOnAlert={pulseOnAlert}
            onClick={() => onFaceClick?.(result)}
          />
        </div>
      ))}

      {/* Faces detectadas sem matching (apenas detecção) */}
      {unprocessedFaces.map((face, index) => (
        <DetectedFaceBox
          key={face.id || `detected-${index}`}
          face={face}
          showAttributes={showAttributes}
        />
      ))}

      {/* Contador de faces */}
      <div className="absolute top-2 right-2 pointer-events-auto">
        <Badge variant="secondary" className="gap-1.5">
          <User className="w-3 h-3" />
          {results.length + unprocessedFaces.length} face(s)
        </Badge>
      </div>

      {/* Alerta visual se houver blacklist */}
      {results.some(r => r.bestMatch?.listType === 'blacklist') && (
        <div className="absolute inset-0 border-4 border-red-500 rounded-lg animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export default FaceRecognitionOverlay;
