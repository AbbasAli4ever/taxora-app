import { authService } from './auth.service';
import { useAuthStore } from './store';
import { LoginDto } from './dto/login.dto';
import { getApiErrorMessage } from '@common/utils/apiError';
import { getRefreshToken, saveTokens, clearTokens } from '@common/utils/storage';
import { LoginResponseDirect, LoginResponseMFA } from '@common/types';

export type LoginResult =
  | { type: 'success' }
  | { type: 'mfa'; tempToken: string; method: 'totp' | 'email' }
  | { type: 'company'; tempToken: string; companies: { id: string; name: string }[] }
  | { type: 'error'; message: string };

export const authController = {
  async login(dto: LoginDto): Promise<LoginResult> {
    try {
      const response = await authService.login(dto);

      // Shape B — MFA required
      if ('requires2fa' in response) {
        const r = response as LoginResponseMFA;
        return { type: 'mfa', tempToken: r.tempToken, method: r.method };
      }

      // Shape C — multi-company selection
      if ('requiresCompanySelection' in response) {
        const r = response as any;
        return {
          type: 'company',
          tempToken: r.tempToken,
          companies: (r.companies ?? []).map((c: any) => ({
            id: c.id ?? c.companyId,
            name: c.name ?? c.companyName,
          })),
        };
      }

      // Shape A — direct success
      const r = response as LoginResponseDirect;
      saveTokens(r.accessToken, r.refreshToken);

      // Fetch permissions in parallel with setAuth
      const permissions = await authService.getMyPermissions();
      useAuthStore.getState().setAuth(r.user, r.company, permissions);

      return { type: 'success' };
    } catch (err) {
      return { type: 'error', message: getApiErrorMessage(err) };
    }
  },

  async selectCompany(
    companyId: string,
    tempToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const r = await authService.selectCompany(companyId, tempToken);
      saveTokens(r.accessToken, r.refreshToken);
      const permissions = await authService.getMyPermissions();
      useAuthStore.getState().setAuth(r.user, r.company, permissions);
      return { success: true };
    } catch (err) {
      return { success: false, error: getApiErrorMessage(err) };
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    const { clearAuth } = useAuthStore.getState();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      clearTokens();
      clearAuth();
    }
  },

  async verifyMFA(
    tempToken: string,
    code: string,
  ): Promise<
    | { type: 'success' }
    | { type: 'company'; tempToken: string; companies: { id: string; name: string }[] }
    | { type: 'error'; message: string }
  > {
    try {
      const response = await authService.verifyMFA(tempToken, code);

      if ('requiresCompanySelection' in response) {
        const r = response as any;
        return {
          type: 'company',
          tempToken: r.tempToken,
          companies: (r.companies ?? []).map((c: any) => ({
            id: c.id ?? c.companyId,
            name: c.name ?? c.companyName,
          })),
        };
      }

      const r = response as LoginResponseDirect;
      saveTokens(r.accessToken, r.refreshToken);
      const permissions = await authService.getMyPermissions();
      useAuthStore.getState().setAuth(r.user, r.company, permissions);
      return { type: 'success' };
    } catch (err) {
      return { type: 'error', message: getApiErrorMessage(err) };
    }
  },

  // §4.5 — called on Splash screen in parallel
  async bootSession(): Promise<boolean> {
    try {
      const [user, permissions] = await Promise.all([
        authService.getMe(),
        authService.getMyPermissions(),
      ]);
      const { company } = useAuthStore.getState();
      if (company) {
        useAuthStore.getState().setAuth(user, company, permissions);
      }
      return true;
    } catch {
      clearTokens();
      useAuthStore.getState().clearAuth();
      return false;
    }
  },
};
