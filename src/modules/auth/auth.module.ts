// Auth Module — barrel export for the auth feature slice
export { authController } from './auth.controller';
export { authService }    from './auth.service';
export { useAuthStore }   from './store';
export type { LoginDto }    from './dto/login.dto';
export type { RegisterDto } from './dto/register.dto';
export { loginSchema }    from './dto/login.dto';
export { registerSchema } from './dto/register.dto';
