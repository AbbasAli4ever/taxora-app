import { authService } from './auth.service';
import { useAuthStore } from './store';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { getErrorMessage } from '@common/utils';

export const authController = {
  async login(dto: LoginDto): Promise<{ success: boolean; error?: string }> {
    const { setTokens, setUser } = useAuthStore.getState();
    try {
      const { user, tokens } = await authService.login(dto);
      await setTokens(tokens);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  async register(dto: RegisterDto): Promise<{ success: boolean; error?: string }> {
    const { setTokens, setUser } = useAuthStore.getState();
    try {
      const { confirmPassword: _, ...payload } = dto;
      const { user, tokens } = await authService.register(payload);
      await setTokens(tokens);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  async logout(): Promise<void> {
    const { clearSession } = useAuthStore.getState();
    try {
      await authService.logout();
    } finally {
      await clearSession();
    }
  },
};
