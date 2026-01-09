// Geocoding Service - Projeto VISÃO
// Serviço de geocodificação com tipagem forte

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface GeoAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  formatted: string;
}

export interface GeocodingResult {
  coordinates: GeoCoordinates;
  address: GeoAddress;
  confidence: number;
  placeId?: string;
}

export interface ReverseGeocodingResult {
  address: GeoAddress;
  coordinates: GeoCoordinates;
}

export interface GeocodingOptions {
  language?: string;
  region?: string;
  bounds?: {
    northeast: GeoCoordinates;
    southwest: GeoCoordinates;
  };
}

export interface GeocodingService {
  geocode: (address: string, options?: GeocodingOptions) => Promise<GeocodingResult[]>;
  reverseGeocode: (coordinates: GeoCoordinates) => Promise<ReverseGeocodingResult>;
  calculateDistance: (from: GeoCoordinates, to: GeoCoordinates) => number;
}

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

export const calculateDistance = (from: GeoCoordinates, to: GeoCoordinates): number => {
  const R = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const geocode = async (address: string, options?: GeocodingOptions): Promise<GeocodingResult[]> => {
  const params = new URLSearchParams({
    address,
    language: options?.language || 'pt-BR',
  });
  
  const response = await fetch(`/api/geocode?${params}`);
  const data = await response.json();
  return data.results || [];
};

export const reverseGeocode = async (coordinates: GeoCoordinates): Promise<ReverseGeocodingResult> => {
  const params = new URLSearchParams({
    lat: coordinates.lat.toString(),
    lng: coordinates.lng.toString(),
  });
  
  const response = await fetch(`/api/reverse-geocode?${params}`);
  return response.json();
};

export const geocodingService: GeocodingService = {
  geocode,
  reverseGeocode,
  calculateDistance,
};

export default geocodingService;
