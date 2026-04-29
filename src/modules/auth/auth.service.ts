import { apiService } from '@common/services/api.service';
import { API_ENDPOINTS } from '@common/constants';
import { User, AuthTokens } from '@common/types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface LoginResponse {
  user:   User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user:   User;
  tokens: AuthTokens;
}

export const authService = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await apiService.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, dto);
    return res.data;
  },

  async register(dto: Omit<RegisterDto, 'confirmPassword'>): Promise<RegisterResponse> {
    const res = await apiService.post<RegisterResponse>(API_ENDPOINTS.AUTH.REGISTER, dto);
    return res.data;
  },

  async logout(): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  async getMe(): Promise<User> {
    const res = await apiService.get<User>(API_ENDPOINTS.AUTH.ME);
    return res.data;
  },
};
