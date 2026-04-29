import React from 'react';
import { useAuthStore } from '@modules/auth/store';

interface AuthGuardProps {
  children:    React.ReactNode;
  fallback:    React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <>{isAuthenticated ? children : fallback}</>;
}
