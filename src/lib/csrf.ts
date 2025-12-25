const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  return token;
};

export const getCSRFToken = (): string | null => {
  return sessionStorage.getItem(CSRF_TOKEN_KEY);
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken !== null && storedToken === token;
};

export const addCSRFHeader = (headers: Headers): Headers => {
  const token = getCSRFToken();
  if (token) {
    headers.set(CSRF_HEADER, token);
  }
  return headers;
};

export const initCSRF = (): void => {
  if (!getCSRFToken()) {
    generateCSRFToken();
  }
};
