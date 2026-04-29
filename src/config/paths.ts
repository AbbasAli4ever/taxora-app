export const ROUTES = {
  // Auth stack
  AUTH:     'Auth',
  LOGIN:    'Login',
  REGISTER: 'Register',

  // App stack
  APP:     'App',
  HOME:    'Home',
  PROFILE: 'Profile',
  SETTINGS:'Settings',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteName = (typeof ROUTES)[RouteKey];
