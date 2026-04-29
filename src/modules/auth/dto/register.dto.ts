import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName:  z.string().min(2, 'Last name is required'),
  email:     z.string().email('Invalid email address'),
  password:  z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export type RegisterDto = z.infer<typeof registerSchema>;
