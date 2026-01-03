/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ImageAnalysis Component
 */

import { memo, useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Camera, 
  Scan, 
  User, 
  Car,
  AlertTriangle,
  Loader2,
  X,
  Download,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface DetectionResult {
  type: 'face' | 'person' | 'vehicle' | 'object' | 'plate';
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface AnalysisResult {
  detections: DetectionResult[];
  processingTime: number;
  imageWidth: number;
  imageHeight: number;
}

interface ImageAnalysisProps {
  onAnalyze: (imageData: string) => Promise<AnalysisResult>;
  onSaveResult?: (result: AnalysisResult) => void;
  className?: string;
}

function ImageAnalysisComponent({
  onAnalyze,
  onSaveResult,
  className
}: ImageAnalysisProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState('image');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageData(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageData) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysisResult = await onAnalyze(imageData);
      setResult(analysisResult);
      setActiveTab('results');
    } catch (err) {
      setError('Erro ao analisar imagem');
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageData, onAnalyze]);

  const handleClear = useCallback(() => {
    setImageData(null);
    setResult(null);
    setError(null);
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getDetectionIcon = (type: DetectionResult['type']) => {
    switch (type) {
      case 'face':
      case 'person':
        return User;
      case 'vehicle':
      case 'plate':
        return Car;
      default:
        return Scan;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-500';
    if (confidence >= 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  const detectionCounts = result?.detections.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          Análise de Imagem
        </CardTitle>
        <CardDescription>
          Faça upload de uma imagem para detectar pessoas, veículos e objetos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!imageData ? (
          /* Upload Area */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">Arraste uma imagem ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground">PNG, JPG ou JPEG até 10MB</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="image">Imagem</TabsTrigger>
                <TabsTrigger value="results" disabled={!result}>
                  Resultados {result && `(${result.detections.length})`}
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="image" className="mt-0">
              <div className="relative overflow-auto rounded-lg border bg-muted/30 max-h-96">
                <img
                  src={imageData}
                  alt="Imagem para análise"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                  className="transition-transform"
                />
                
                {/* Detection overlays */}
                {result && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                  >
                    {result.detections.map((detection, i) => (
                      <g key={i}>
                        <rect
                          x={detection.boundingBox.x}
                          y={detection.boundingBox.y}
                          width={detection.boundingBox.width}
                          height={detection.boundingBox.height}
                          fill="none"
                          stroke={detection.type === 'face' ? '#22c55e' : '#3b82f6'}
                          strokeWidth={2}
                        />
                        <text
                          x={detection.boundingBox.x}
                          y={detection.boundingBox.y - 5}
                          fill={detection.type === 'face' ? '#22c55e' : '#3b82f6'}
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {detection.label} ({Math.round(detection.confidence * 100)}%)
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            </TabsContent>

            <TabsContent value="results" className="mt-0">
              {result && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-secondary text-center">
                      <div className="text-2xl font-bold">{result.detections.length}</div>
                      <div className="text-xs text-muted-foreground">Detecções</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary text-center">
                      <div className="text-2xl font-bold">{result.processingTime}ms</div>
                      <div className="text-xs text-muted-foreground">Tempo</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary text-center">
                      <div className="text-2xl font-bold">{result.imageWidth}x{result.imageHeight}</div>
                      <div className="text-xs text-muted-foreground">Resolução</div>
                    </div>
                  </div>

                  {/* Detection list */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.detections.map((detection, i) => {
                      const Icon = getDetectionIcon(detection.type);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Icon className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">{detection.label}</div>
                            <div className="text-xs text-muted-foreground">{detection.type}</div>
                          </div>
                          <div className={cn("font-medium", getConfidenceColor(detection.confidence))}>
                            {Math.round(detection.confidence * 100)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {onSaveResult && (
                    <Button onClick={() => onSaveResult(result)} className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Salvar Resultado
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {imageData && !result && (
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                Analisar Imagem
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export const ImageAnalysis = memo(ImageAnalysisComponent);
