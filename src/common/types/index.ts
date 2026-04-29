// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data:    T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ApiError {
  message:    string;
  statusCode: number;
  errors?:    Record<string, string[]>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  avatar?:   string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';
export type InputVariant  = 'default' | 'error' | 'success';

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  App:  undefined;
};

export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home:     undefined;
  Profile:  undefined;
  Settings: undefined;
};
