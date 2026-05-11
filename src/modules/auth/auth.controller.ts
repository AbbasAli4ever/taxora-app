import { authService } from './auth.service';
import { useAuthStore } from './store';
import { LoginDto } from './dto/login.dto';
import { getApiErrorMessage } from '@common/utils/apiError';
import { getRefreshToken, saveTokens, clearTokens } from '@common/utils/storage';
import { LoginResponseDirect } from '@common/types';

export type CompanyItem = {
  companyId: string;
  companyName: string;
  userId?: string;
  role?: { code: string; name: string } | null;
  isPrimaryAdmin?: boolean;
  lastLoginAt?: string | null;
  isActive?: boolean;
  isCurrentCompany?: boolean;
};

export type LoginResult =
  | { type: 'success' }
  | { type: 'mfa'; tempToken: string }
  | { type: 'company'; tempToken: string; companies: CompanyItem[] }
  | { type: 'error'; message: string };

export const authController = {
  async login(dto: LoginDto): Promise<LoginResult> {
    try {
      const response = await authService.login(dto);

      // Shape B — MFA required
      if ('requires2fa' in response) {
        return { type: 'mfa', tempToken: response.tempToken };
      }

      // Shape C — multi-company selection
      if ('requiresCompanySelection' in response) {
        return {
          type: 'company',
          tempToken: response.tempToken,
          companies: response.companies as CompanyItem[],
        };
      }

      // Shape A — direct success
      const r = response as LoginResponseDirect;
      saveTokens(r.accessToken, r.refreshToken);
      useAuthStore.getState().setAuth(r.user, r.company, (r as any).permissions ?? []);

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
      useAuthStore.getState().setAuth(r.user, r.company, (r as any).permissions ?? []);
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
    isBackupCode?: boolean,
  ): Promise<
    | { type: 'success' }
    | { type: 'company'; tempToken: string; companies: CompanyItem[] }
    | { type: 'error'; message: string }
  > {
    try {
      const response = await authService.verifyMFA(tempToken, code, isBackupCode);

      if ('requiresCompanySelection' in response) {
        return {
          type: 'company',
          tempToken: response.tempToken,
          companies: response.companies as CompanyItem[],
        };
      }

      const r = response as LoginResponseDirect;
      saveTokens(r.accessToken, r.refreshToken);
      useAuthStore.getState().setAuth(r.user, r.company, (r as any).permissions ?? []);
      return { type: 'success' };
    } catch (err) {
      return { type: 'error', message: getApiErrorMessage(err) };
    }
  },

  async bootSession(): Promise<'success' | 'needs-company' | 'fail'> {
    try {
      const [meData, permissions] = await Promise.all([
        authService.getMe(),
        authService.getMyPermissions(),
      ]);

      const company = (meData as any).company ?? null;
      if (!company) {
        useAuthStore.getState().setAuth(meData, { id: '', name: '' }, permissions);
        return 'needs-company';
      }

      useAuthStore.getState().setAuth(meData, company, permissions);
      return 'success';
    } catch {
      clearTokens();
      useAuthStore.getState().clearAuth();
      return 'fail';
    }
  },
};
