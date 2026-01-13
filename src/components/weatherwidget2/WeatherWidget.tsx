import React from 'react';
import { cn } from '@/lib/utils';
import { CloudRain, Cloud, Sun, Wind, Droplets, Thermometer } from 'lucide-react';

interface WeatherWidgetProps { city: string; temp: number; condition: 'sunny' | 'cloudy' | 'rainy' | 'windy'; humidity?: number; wind?: number; className?: string; }

const icons = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, windy: Wind };
const bgs = { sunny: 'from-yellow-400 to-orange-500', cloudy: 'from-gray-400 to-gray-600', rainy: 'from-blue-400 to-blue-600', windy: 'from-teal-400 to-cyan-500' };

export function WeatherWidget({ city, temp, condition, humidity, wind, className }: WeatherWidgetProps) {
  const Icon = icons[condition];
  return (
    <div className={cn('p-6 rounded-xl text-white bg-gradient-to-br', bgs[condition], className)}>
      <p className="text-lg opacity-90 mb-2">{city}</p>
      <div className="flex items-center justify-between">
        <div><p className="text-5xl font-bold">{temp}°</p><p className="opacity-80 capitalize">{condition === 'sunny' ? 'Ensolarado' : condition === 'cloudy' ? 'Nublado' : condition === 'rainy' ? 'Chuvoso' : 'Ventoso'}</p></div>
        <Icon className="h-16 w-16 opacity-80" />
      </div>
      {(humidity || wind) && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
          {humidity && <span className="flex items-center gap-1 text-sm"><Droplets className="h-4 w-4" />{humidity}%</span>}
          {wind && <span className="flex items-center gap-1 text-sm"><Wind className="h-4 w-4" />{wind} km/h</span>}
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
