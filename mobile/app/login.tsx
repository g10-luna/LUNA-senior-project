import React from 'react';
import { Redirect } from 'expo-router';
import LoginView from '@/components/LoginView';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Full-screen sign-in (no tab bar). Deep links to /login land here.
 */
export default function LoginScreen() {
  const { hasToken, refreshAuth } = useAuth();

  if (hasToken === null) return null;
  if (hasToken) return <Redirect href="/(tabs)" />;

  return <LoginView onSuccess={refreshAuth} />;
}
