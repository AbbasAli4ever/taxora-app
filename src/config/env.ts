import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const ENV = {
  API_BASE_URL: extra.API_BASE_URL ?? 'http://localhost:3000/api/v1',
  APP_ENV: extra.APP_ENV ?? 'development',
  APP_VERSION: Constants.expoConfig?.version ?? '1.0.0',
  REQUEST_TIMEOUT: Number(extra.REQUEST_TIMEOUT ?? 15000),
} as const;

export const isDev = ENV.APP_ENV === 'development';
export const isProd = ENV.APP_ENV === 'production';
