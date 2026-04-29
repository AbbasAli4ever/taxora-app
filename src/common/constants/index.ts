export const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@taxora/access_token',
  REFRESH_TOKEN: '@taxora/refresh_token',
  USER:          '@taxora/user',
  THEME:         '@taxora/theme',
  ONBOARDED:     '@taxora/onboarded',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN:    '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT:   '/auth/logout',
    REFRESH:  '/auth/refresh',
    ME:       '/auth/me',
  },
  USERS: {
    PROFILE:    '/users/me',
    UPDATE:     '/users/me',
    UPLOAD_AVT: '/users/me/avatar',
  },
} as const;

export const QUERY_KEYS = {
  USER_PROFILE: ['user', 'profile'],
} as const;
