import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecognitionAnalytics } from '@/components/RecognitionAnalytics';
import { useI18n } from '@/contexts/i18n';

export default function RecognitionAnalyticsPage() {
  const { t } = useI18n();

  const [dateRange, setDateRange] = useState(7);

  return (
    <>
      <Helmet>
        <title>Analytics de Reconhecimento | VISÃO</title>
        <meta name="description" content="Analytics e estatísticas de reconhecimento facial" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Analytics de Reconhecimento
                </h1>
                <p className="text-muted-foreground">
                  Padrões e estatísticas de detecção facial
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={dateRange.toString()}
                onValueChange={(v) => setDateRange(parseInt(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analytics */}
          <RecognitionAnalytics dateRange={dateRange} />
        </div>
      </div>
    </>
  );
}
