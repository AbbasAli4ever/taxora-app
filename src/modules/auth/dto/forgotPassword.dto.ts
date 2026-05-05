import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
