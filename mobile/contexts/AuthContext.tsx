import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAccessToken } from '@/src/services/auth';

type AuthContextValue = {
  hasToken: boolean | null;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const refreshAuth = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ hasToken, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
