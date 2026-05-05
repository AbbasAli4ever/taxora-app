export * from './storage';
export * from './apiError';

// ─── String helpers ───────────────────────────────────────────────────────────
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const formatFullName = (first: string, last: string): string =>
  `${capitalize(first)} ${capitalize(last)}`;

export const truncate = (str: string, length: number): string =>
  str.length > length ? `${str.slice(0, length)}…` : str;

export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

// ─── Number / Currency helpers ────────────────────────────────────────────────
export const formatCurrency = (amount: number, currencyCode = 'USD', locale = 'en-US'): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);

// ─── Date helpers ─────────────────────────────────────────────────────────────
export const toISODate = (date: Date): string => date.toISOString().split('T')[0]; // YYYY-MM-DD

export const formatDisplayDate = (iso: string, locale = 'en-US'): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDisplayDate(iso);
};

// ─── Async helpers ────────────────────────────────────────────────────────────
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── Object helpers ───────────────────────────────────────────────────────────
export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result as Omit<T, K>;
};
