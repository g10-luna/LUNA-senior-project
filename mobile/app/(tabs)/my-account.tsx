import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { clearTokens } from '@/src/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import LoginView from '@/components/LoginView';

const HOWARD_BLUE = '#003A63';

export default function MyAccountScreen() {
  const { hasToken, refreshAuth } = useAuth();

  const handleSignOut = async () => {
    await clearTokens();
    await refreshAuth();
  };

  if (hasToken === null) return null;

  if (!hasToken) {
    return <LoginView onSuccess={refreshAuth} />;
  }

  return (
    <View style={styles.container}>
      <FontAwesome name="user-o" size={48} color={HOWARD_BLUE} style={styles.icon} />
      <Text style={styles.title}>My Account</Text>
      <Text style={styles.placeholder}>Profile and settings (coming soon)</Text>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#333', marginBottom: 8 }, // Screen title when logged in
  placeholder: { fontSize: 15, color: '#888', marginBottom: 24 },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: { color: '#888', fontSize: 15 },
});
