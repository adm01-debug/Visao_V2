/**
 * Weather Service
 * Weather data integration
 */
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  sunrise?: Date;
  sunset?: Date;
}

class WeatherService {
  private apiKey = '';

  configure(apiKey: string) { this.apiKey = apiKey; }

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`
    );
    const data = await response.json();
    const current = data.current;
    return {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      description: this.getWeatherDescription(current.weather_code),
      icon: this.getWeatherIcon(current.weather_code),
    };
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Céu limpo', 1: 'Principalmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Neblina', 48: 'Neblina com geada', 51: 'Garoa leve', 53: 'Garoa moderada',
      55: 'Garoa intensa', 61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte',
      71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve forte', 95: 'Tempestade',
    };
    return descriptions[code] || 'Desconhecido';
  }

  private getWeatherIcon(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌧️';
    if (code <= 65) return '🌧️';
    if (code <= 75) return '❄️';
    return '⛈️';
  }
}

export const weatherService = new WeatherService();
export default weatherService;
