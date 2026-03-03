import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { hasToken } = useAuth();

  if (hasToken === null) return null;
  // First screen: My Account tab (shows login when not signed in). Other tabs (Search, E-Resources, Map) don't require login.
  if (hasToken) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(tabs)/my-account" />;
}
