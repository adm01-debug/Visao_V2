/**
 * Onda 197 — formulário da busca de faces.
 *
 * A tela é pessimista: valida o critério antes de consultar e mostra a recusa
 * como recusa. Nada aqui "conserta" o pedido do operador em silêncio.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Search, RotateCcw } from 'lucide-react';
import type { RawFaceSearchCriteria } from '@/lib/faces/faceSearch';

interface FaceSearchFiltersProps {
  isFetching: boolean;
  onSubmit: (raw: RawFaceSearchCriteria) => void;
  onReset: () => void;
}

const toLocalInput = (ms: number): string => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

const parseLocal = (value: string): number | null => {
  if (value.trim() === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export function FaceSearchFilters({ isFetching, onSubmit, onReset }: FaceSearchFiltersProps) {
  const now = Date.now();
  const [from, setFrom] = useState(() => toLocalInput(now - 24 * 60 * 60 * 1000));
  const [to, setTo] = useState(() => toLocalInput(now));
  const [similarity, setSimilarity] = useState(70);
  const [gender, setGender] = useState<'' | 'male' | 'female'>('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [includeSpoof, setIncludeSpoof] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      fromMs: parseLocal(from),
      toMs: parseLocal(to),
      minSimilarity: similarity / 100,
      includeSpoof,
      attributes: {
        gender: gender === '' ? null : gender,
        ageMin: ageMin.trim() === '' ? null : Number(ageMin),
        ageMax: ageMax.trim() === '' ? null : Number(ageMax),
      },
    });
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="face-search-from">Início</Label>
          <Input
            id="face-search-from"
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="face-search-to">Fim</Label>
          <Input
            id="face-search-to"
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Corte de semelhança: {similarity}%</Label>
          <Slider
            value={[similarity]}
            min={30}
            max={99}
            step={1}
            onValueChange={([v]) => setSimilarity(v ?? similarity)}
            aria-label="Corte de semelhança"
          />
          <p className="text-xs text-muted-foreground">
            Abaixo do corte a leitura vira candidata, nunca identificada.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="face-search-gender">Gênero estimado</Label>
          <select
            id="face-search-gender"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value as '' | 'male' | 'female')}
          >
            <option value="">Qualquer</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Filtrar por atributo exclui leituras sem estimativa.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="face-search-age-min">Idade mínima</Label>
          <Input
            id="face-search-age-min"
            inputMode="numeric"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value.replace(/\D/g, ''))}
            placeholder="—"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="face-search-age-max">Idade máxima</Label>
          <Input
            id="face-search-age-max"
            inputMode="numeric"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value.replace(/\D/g, ''))}
            placeholder="—"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div>
            <Label htmlFor="face-search-spoof">Incluir suspeitas de fraude</Label>
            <p className="text-xs text-muted-foreground">Nunca contam como identificação.</p>
          </div>
          <Switch id="face-search-spoof" checked={includeSpoof} onCheckedChange={setIncludeSpoof} />
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={handleSubmit} disabled={isFetching} className="flex-1">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            {isFetching ? 'Buscando…' : 'Buscar'}
          </Button>
          <Button variant="outline" onClick={onReset} aria-label="Limpar busca">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
