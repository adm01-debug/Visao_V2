import { logger } from "@/lib/logger";
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Upload, 
  Camera, 
  Shield, 
  HardHat, 
  Activity,
  AlertTriangle,
  Users,
  Eye,
  Loader2
} from 'lucide-react';
import { useImageAnalysis, AnalysisType, SecurityAnalysis, SafetyAnalysis, ProductivityAnalysis } from '@/hooks/useImageAnalysis';
import { useMLModels } from '@/hooks/useMLModels';

const severityColors = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
};

export function AIAnalysisPanel() {
  const { analyzeFromFile, isAnalyzing, lastAnalysis } = useImageAnalysis();
  const [analysisType, setAnalysisType] = useState<AnalysisType>('security');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook de detecção ML para objetos em tempo real
  const {
    loadModel,
    detectObjects,
    isLoading: isMLLoading,
    isModelLoaded,
    detectedObjects,
  } = useMLModels();

  // Carregar modelo ML quando componente montar
  useEffect(() => {
    if (!isModelLoaded && !isMLLoading) {
      loadModel("coco-ssd").catch((e) => logger.error("Model load error", e));
    }
  }, [isModelLoaded, isMLLoading, loadModel]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze
    await analyzeFromFile(file, analysisType);
  };

  const renderSecurityAnalysis = (analysis: SecurityAnalysis) => (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card/50 rounded-lg p-3 text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-2xl font-bold">{analysis.people_count}</div>
          <div className="text-xs text-muted-foreground">Pessoas</div>
        </div>
        <div className="bg-card/50 rounded-lg p-3 text-center">
          <Eye className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-2xl font-bold">{analysis.detections?.length || 0}</div>
          <div className="text-xs text-muted-foreground">Detecções</div>
        </div>
        <div className="bg-card/50 rounded-lg p-3 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-2xl font-bold">{analysis.alerts?.length || 0}</div>
          <div className="text-xs text-muted-foreground">Alertas</div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card/50 rounded-lg p-3">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Resumo da Análise
        </h4>
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </div>

      {/* Detections */}
      {analysis.detections && analysis.detections.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Detecções</h4>
          <div className="space-y-2">
            {analysis.detections.map((detection, i) => (
              <div key={i} className="bg-card/50 rounded-lg p-3 flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{detection.label}</div>
                  <div className="text-xs text-muted-foreground">{detection.description}</div>
                  {detection.position?.area && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Área: {detection.position.area}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={severityColors[detection.severity]}>
                    {detection.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(detection.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {analysis.alerts && analysis.alerts.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Alertas</h4>
          <div className="space-y-2">
            {analysis.alerts.map((alert, i) => (
              <div key={i} className={`rounded-lg p-3 border ${severityColors[alert.severity]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">{alert.message}</span>
                </div>
                <p className="text-xs opacity-80">{alert.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSafetyAnalysis = (analysis: SafetyAnalysis) => (
    <div className="space-y-4">
      {/* PPE Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {analysis.ppe_compliance?.compliant || 0}
          </div>
          <div className="text-xs text-green-400/70">Em conformidade</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">
            {analysis.ppe_compliance?.non_compliant || 0}
          </div>
          <div className="text-xs text-red-400/70">Não conformes</div>
        </div>
      </div>

      {/* Missing PPE */}
      {analysis.ppe_compliance?.missing_items && analysis.ppe_compliance.missing_items.length > 0 && (
        <div className="bg-card/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">EPIs Faltando</h4>
          <div className="flex flex-wrap gap-1">
            {analysis.ppe_compliance.missing_items.map((item, i) => (
              <Badge key={i} variant="outline" className="bg-red-500/10">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Hazards */}
      {analysis.hazards && analysis.hazards.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Riscos Identificados</h4>
          <div className="space-y-2">
            {analysis.hazards.map((hazard, i) => (
              <div key={i} className={`rounded-lg p-3 border ${severityColors[hazard.severity]}`}>
                <div className="font-medium text-sm">{hazard.type}</div>
                <div className="text-xs opacity-80">{hazard.description}</div>
                <div className="text-xs opacity-60 mt-1">Local: {hazard.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card/50 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </div>
    </div>
  );

  const renderProductivityAnalysis = (analysis: ProductivityAnalysis) => (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{analysis.working_count || 0}</div>
          <div className="text-xs text-green-400/70">Trabalhando</div>
        </div>
        <div className="bg-yellow-500/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{analysis.idle_count || 0}</div>
          <div className="text-xs text-yellow-400/70">Ociosos</div>
        </div>
      </div>

      {/* Occupancy */}
      <div className="bg-card/50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm">Taxa de Ocupação</span>
          <span className="font-bold">{analysis.occupancy_rate || 0}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${analysis.occupancy_rate || 0}%` }}
          />
        </div>
      </div>

      {/* Observations */}
      {analysis.observations && analysis.observations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Observações</h4>
          <ul className="space-y-1">
            {analysis.observations.map((obs, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card/50 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </div>
    </div>
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Vision Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selector */}
        <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="security" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="safety" className="text-xs">
              <HardHat className="h-3 w-3 mr-1" />
              EPI
            </TabsTrigger>
            <TabsTrigger value="productivity" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Produtividade
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Upload Area */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {previewImage ? (
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-32 mx-auto rounded-lg mb-2"
            />
          ) : (
            <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            Clique para enviar uma imagem
          </p>
        </div>

        <Button 
          className="w-full" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Analisar Imagem
            </>
          )}
        </Button>

        {/* Results */}
        {lastAnalysis && (
          <ScrollArea className="h-[400px] pr-4">
            {analysisType === 'security' && renderSecurityAnalysis(lastAnalysis as SecurityAnalysis)}
            {analysisType === 'safety' && renderSafetyAnalysis(lastAnalysis as SafetyAnalysis)}
            {analysisType === 'productivity' && renderProductivityAnalysis(lastAnalysis as ProductivityAnalysis)}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
