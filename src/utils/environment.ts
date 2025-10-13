// Environment utilities for detecting development vs production mode

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

export const isProduction = (): boolean => {
  return import.meta.env.PROD || import.meta.env.MODE === 'production';
};

export const getEnvironment = (): 'development' | 'production' | 'unknown' => {
  if (isDevelopment()) return 'development';
  if (isProduction()) return 'production';
  return 'unknown';
};

// Debug logging for tracking issues in development
export const debugLog = (message: string, ...args: unknown[]): void => {
  if (isDevelopment()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};