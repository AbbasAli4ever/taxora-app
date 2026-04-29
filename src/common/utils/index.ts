// ─── String helpers ───────────────────────────────────────────────────────────

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const formatFullName = (first: string, last: string): string =>
  `${capitalize(first)} ${capitalize(last)}`;

export const truncate = (str: string, length: number): string =>
  str.length > length ? `${str.slice(0, length)}…` : str;

// ─── Validation helpers ───────────────────────────────────────────────────────

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─── Async helpers ────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── Object helpers ───────────────────────────────────────────────────────────

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result as Omit<T, K>;
};

// ─── Error helpers ────────────────────────────────────────────────────────────

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
};
