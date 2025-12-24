export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPhone = (phone: string): boolean => {
  const regex = /^\+?[\d\s()-]{10,}$/;
  return regex.test(phone);
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/<[^>]*>/g, "").trim();
};
