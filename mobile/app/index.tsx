import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { hasToken } = useAuth();

  if (hasToken === null) return null;
  if (hasToken) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}
