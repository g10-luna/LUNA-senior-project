import { Redirect } from 'expo-router';

/**
 * Login is shown in the My Account tab.
 * This route redirects so deep links to /login still work.
 */
export default function LoginScreen() {
  return <Redirect href="/(tabs)/my-account" />;
}
