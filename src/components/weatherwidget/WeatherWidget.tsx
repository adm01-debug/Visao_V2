import React from 'react';
import { cn } from '@/lib/utils';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

interface WeatherWidgetProps {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'windy';
  location?: string;
  humidity?: number;
  wind?: number;
  className?: string;
}

const weatherIcons = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning, windy: Wind };
const weatherLabels = { sunny: 'Ensolarado', cloudy: 'Nublado', rainy: 'Chuvoso', snowy: 'Nevando', stormy: 'Tempestade', windy: 'Ventando' };

export function WeatherWidget({ temperature, condition, location, humidity, wind, className }: WeatherWidgetProps) {
  const Icon = weatherIcons[condition];

  return (
    <div className={cn('p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold">{temperature}°C</p>
          <p className="text-sm text-muted-foreground">{weatherLabels[condition]}</p>
          {location && <p className="text-xs text-muted-foreground mt-1">{location}</p>}
        </div>
        <Icon className="h-16 w-16 text-blue-500" />
      </div>
      {(humidity !== undefined || wind !== undefined) && (
        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
          {humidity !== undefined && <span>Umidade: {humidity}%</span>}
          {wind !== undefined && <span>Vento: {wind} km/h</span>}
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
