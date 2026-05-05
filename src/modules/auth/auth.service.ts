import { apiService } from '@common/services/api.service';
import { API_ENDPOINTS } from '@common/constants';
import { User, Company, AuthTokens, LoginResponse } from '@common/types';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';

export const authService = {
  // §4.1 — returns one of three shapes; caller discriminates
  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await apiService.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, dto);
    return res.data;
  },

  // §4.2 — after company-selection shape
  async selectCompany(
    companyId: string,
    tempToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
    company: Company;
  }> {
    const res = await apiService.post(API_ENDPOINTS.AUTH.SELECT_COMPANY, { companyId, tempToken });
    return res.data as { accessToken: string; refreshToken: string; user: User; company: Company };
  },

  // §4.4
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await apiService.post<AuthTokens>(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return res.data;
  },

  // §4.7
  async logout(refreshToken: string): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  },

  // §4.5 — called in parallel on app launch
  async getMe(): Promise<User> {
    const res = await apiService.get<User>(API_ENDPOINTS.AUTH.ME);
    return res.data;
  },

  async getMyPermissions(): Promise<string[]> {
    const res = await apiService.get<{ permissions: string[] }>(API_ENDPOINTS.AUTH.MY_PERMISSIONS);
    return res.data?.permissions ?? [];
  },

  async getMyCompanies(): Promise<Company[]> {
    const res = await apiService.get<any>(API_ENDPOINTS.AUTH.MY_COMPANIES);
    const d = res.data;
    // handle both { companies: [...] } and bare array
    return Array.isArray(d?.companies) ? d.companies : Array.isArray(d) ? d : [];
  },

  // §4.6
  async switchCompany(companyId: string): Promise<AuthTokens> {
    const res = await apiService.post<AuthTokens>(API_ENDPOINTS.AUTH.SWITCH_COMPANY, { companyId });
    return res.data;
  },

  // §4.8
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, dto);
  },

  async validateResetToken(token: string): Promise<boolean> {
    const res = await apiService.get<{ valid: boolean }>(
      `${API_ENDPOINTS.AUTH.VALIDATE_RESET}?token=${token}`,
    );
    return res.data.valid;
  },

  async resetPassword(dto: Omit<ResetPasswordDto, 'confirmPassword'>): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, dto);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, { currentPassword, newPassword });
  },

  async verifyMFA(tempToken: string, code: string): Promise<LoginResponse> {
    const res = await apiService.post<LoginResponse>(API_ENDPOINTS.AUTH.VERIFY_2FA, {
      tempToken,
      token: code,
    });
    return res.data;
  },

  async resend2FA(tempToken: string): Promise<{ sent: boolean; retryAfter: number }> {
    const res = await apiService.post<{ sent: boolean; retryAfter: number }>(
      API_ENDPOINTS.AUTH.RESEND_2FA,
      { tempToken },
    );
    return res.data;
  },
};
