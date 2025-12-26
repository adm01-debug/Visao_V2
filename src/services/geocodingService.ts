/**
 * Geocoding Service
 * Address to coordinates conversion
 */
export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  components?: { type: string; value: string }[];
}

class GeocodingService {
  private apiKey = '';

  configure(apiKey: string) { this.apiKey = apiKey; }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'VisaoApp/1.0' } }
    );
    const data = await response.json();
    if (!data[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'VisaoApp/1.0' } }
    );
    const data = await response.json();
    if (!data.display_name) return null;
    return { lat, lng, formattedAddress: data.display_name };
  }

  async autocomplete(query: string): Promise<GeocodingResult[]> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'User-Agent': 'VisaoApp/1.0' } }
    );
    const data = await response.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      formattedAddress: item.display_name,
    }));
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
