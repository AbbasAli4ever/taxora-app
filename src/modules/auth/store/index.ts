import { create } from 'zustand';
import { User, Company, AuthTokens } from '@common/types';
import {
  getToken,
  getUser,
  getCompany,
  saveTokens,
  saveUser,
  saveCompany,
  clearTokens,
} from '@common/utils/storage';

// Exact shape from MOBILE_RN_SETUP_GUIDE §5
interface AuthState {
  user: User | null;
  company: Company | null;
  permissions: string[];
  isAuthenticated: boolean;

  setAuth: (user: User, company: Company, permissions: string[]) => void;
  clearAuth: () => void;
  hasPermission: (perm: string) => boolean;
  setTokens: (tokens: AuthTokens) => void;
  hydrateSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  permissions: [],
  isAuthenticated: false,

  setAuth: (user, company, permissions) => {
    saveUser(user);
    saveCompany(company);
    set({ user, company, permissions, isAuthenticated: true });
  },

  clearAuth: () => {
    clearTokens();
    set({ user: null, company: null, permissions: [], isAuthenticated: false });
  },

  // §5: "Usage in any component: const canCreate = useAuthStore(s => s.hasPermission(...))"
  hasPermission: (perm) => get().permissions.includes(perm),

  setTokens: (tokens) => saveTokens(tokens.accessToken, tokens.refreshToken),

  hydrateSession: () => {
    const token = getToken();
    if (!token) return;

    const user = getUser<User>();
    const company = getCompany<Company>();
    set({
      user,
      company,
      isAuthenticated: !!user,
      // Permissions are always re-fetched on boot from /auth/my-permissions
      permissions: [],
    });
  },
}));
