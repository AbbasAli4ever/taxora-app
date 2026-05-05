// Storage layer — AsyncStorage for Expo Go compatibility.
// Interface matches MMKV API exactly so the swap to MMKV is one-line when
// switching to a dev/production build.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@common/constants';

// ─── Synchronous in-memory cache ─────────────────────────────────────────────
// AsyncStorage is async; we keep a hot cache so auth reads are synchronous
// (same behaviour you'd get from MMKV in a native build).
const cache: Record<string, string> = {};

export async function hydrateCache(): Promise<void> {
  const keys = [
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.COMPANY,
  ];
  const pairs = await AsyncStorage.multiGet(keys);
  pairs.forEach(([k, v]) => {
    if (v) cache[k] = v;
  });
}

// ─── Sync reads (from cache) ──────────────────────────────────────────────────
export const getToken = (): string | null => cache[STORAGE_KEYS.ACCESS_TOKEN] ?? null;
export const getRefreshToken = (): string | null => cache[STORAGE_KEYS.REFRESH_TOKEN] ?? null;

// ─── Writes ───────────────────────────────────────────────────────────────────
export const saveTokens = (access: string, refresh: string): void => {
  cache[STORAGE_KEYS.ACCESS_TOKEN] = access;
  cache[STORAGE_KEYS.REFRESH_TOKEN] = refresh;
  AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
  AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
};

export const clearTokens = (): void => {
  delete cache[STORAGE_KEYS.ACCESS_TOKEN];
  delete cache[STORAGE_KEYS.REFRESH_TOKEN];
  delete cache[STORAGE_KEYS.USER];
  delete cache[STORAGE_KEYS.COMPANY];
  AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.COMPANY,
  ]);
};

export const saveUser = (user: object): void => {
  const json = JSON.stringify(user);
  cache[STORAGE_KEYS.USER] = json;
  AsyncStorage.setItem(STORAGE_KEYS.USER, json);
};

export const getUser = <T>(): T | null => {
  const raw = cache[STORAGE_KEYS.USER];
  return raw ? (JSON.parse(raw) as T) : null;
};

export const saveCompany = (company: object): void => {
  const json = JSON.stringify(company);
  cache[STORAGE_KEYS.COMPANY] = json;
  AsyncStorage.setItem(STORAGE_KEYS.COMPANY, json);
};

export const getCompany = <T>(): T | null => {
  const raw = cache[STORAGE_KEYS.COMPANY];
  return raw ? (JSON.parse(raw) as T) : null;
};
