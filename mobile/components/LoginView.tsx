import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useFonts, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { getApiUrl, setTokens } from '@/src/services/auth';

const { width } = Dimensions.get('window');

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const SSO_BLUE = '#1B5E8A';
const INPUT_BG = 'rgba(255, 255, 255, 0.92)';
const OVERLAY = 'rgba(250, 252, 255, 0.52)';
const BLUE_LIGHT = '#7BA3C7';

type LoginViewProps = {
  onSuccess: () => void;
};

export default function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({ Montserrat_800ExtraBold });

  const handleLogin = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email or Student ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail.toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const d = data?.detail;
        let message = 'Sign in failed. Please try again.';
        if (typeof d === 'string') message = d;
        else if (d?.message) message = d.message;
        else if (data?.message) message = data.message;
        setError(message);
        return;
      }
      const payload = data?.data ?? data;
      const accessToken = payload?.access_token;
      const refreshToken = payload?.refresh_token;
      if (!accessToken || !refreshToken) {
        setError('Invalid response from server. Please try again.');
        return;
      }
      await setTokens(accessToken, refreshToken);
      onSuccess();
      router.replace('/(tabs)');
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/login-background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.glassCardOuter}>
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <View style={styles.glassCardInner}>
                  <View style={styles.brandingSection}>
                    <View style={styles.brandingRow}>
                      <Image
                        source={require('../assets/images/luna-icon-transparent.png')}
                        style={styles.lunaIllustration}
                        resizeMode="contain"
                      />
                      <View style={styles.brandingTextBlock}>
                        <Text style={styles.lunaTitle}>LUNA</Text>
                        <LinearGradient
                          colors={[HOWARD_BLUE, BLUE_LIGHT]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.lunaTitleUnderline}
                        />
                      </View>
                    </View>
                    <Text style={styles.lunaTagline}>Library utility and navigation assistant</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="user-o" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Student ID / Email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="lock" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <FontAwesome
                        name={showPassword ? 'eye' : 'eye-slash'}
                        size={18}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginButtonText}>Log In</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.forgotButton}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                  <View style={styles.signupRow}>
                    <Text style={styles.signupText}>First time here? </Text>
                    <TouchableOpacity onPress={() => router.push('/setup-account')}>
                      <Text style={styles.signupLink}>Set up account</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.ssoButton}>
                    <Text style={styles.ssoButtonText}>Sign in with HU Single Sign-On (SSO)</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  glassCardOuter: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.7)',
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
    borderRightColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassCardInner: {
    padding: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  brandingSection: { marginBottom: 26, alignItems: 'center' },
  brandingRow: { flexDirection: 'row', alignItems: 'center' },
  brandingTextBlock: { marginLeft: 4, alignItems: 'flex-start' },
  lunaIllustration: { width: 112, height: 112 },
  lunaTitle: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 28,
    color: HOWARD_BLUE,
    letterSpacing: 6,
  },
  lunaTitleUnderline: { marginTop: 2, height: 3, width: 72, borderRadius: 2 },
  lunaTagline: {
    marginTop: -10,
    fontSize: 13,
    lineHeight: 16,
    color: '#5a6b7d',
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 52,
    marginBottom: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: { marginRight: 12, width: 20, textAlign: 'center' },
  input: { flex: 1, fontSize: 15, color: '#333' },
  eyeButton: { padding: 6 },
  errorText: {
    fontSize: 13,
    color: HOWARD_RED,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
  },
  loginButton: {
    backgroundColor: HOWARD_RED,
    borderRadius: 30,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    shadowColor: HOWARD_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  forgotButton: { marginBottom: 16 },
  forgotText: { color: HOWARD_BLUE, fontSize: 14 },
  signupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  signupText: { color: '#555', fontSize: 14 },
  signupLink: { color: HOWARD_RED, fontSize: 14, fontWeight: '600' },
  ssoButton: {
    backgroundColor: SSO_BLUE,
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  ssoButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
