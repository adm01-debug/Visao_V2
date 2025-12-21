export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPlate = (plate: string): boolean => {
  // Brazilian plate format
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate.toUpperCase());
};

export const isValidRTSP = (url: string): boolean => {
  return url.startsWith('rtsp://');
};
