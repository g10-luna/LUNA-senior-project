import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useFonts, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { getApiUrl } from '@/src/services/auth';

const { width } = Dimensions.get('window');

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const INPUT_BG = 'rgba(255, 255, 255, 0.92)';
const OVERLAY = 'rgba(250, 252, 255, 0.52)';

export default function SetupAccountScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({ Montserrat_800ExtraBold });

  const validate = (): boolean => {
    setError(null);
    if (!firstName.trim()) {
      setError('First name is required.');
      return false;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || undefined,
          role: 'STUDENT',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let message = 'Registration failed. Please try again.';
        const d = data?.detail;
        if (typeof d === 'string') message = d;
        else if (d?.message) message = d.message;
        else if (Array.isArray(d) && d[0]?.msg) message = d.map((x: { msg?: string }) => x.msg).join('. ');
        else if (data?.message) message = data.message;
        setError(message);
        return;
      }
      Alert.alert(
        'Account created',
        'You can now sign in with your email and password.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err) {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
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
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome name="arrow-left" size={20} color={HOWARD_BLUE} />
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>

            <View style={styles.glassCardOuter}>
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <View style={styles.glassCardInner}>
                  <Text style={styles.title}>Set up account</Text>
                  <Text style={styles.subtitle}>Create your LUNA student account</Text>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <View style={styles.inputWrapper}>
                    <FontAwesome name="user-o" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First name"
                      placeholderTextColor="#999"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="user-o" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor="#999"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="envelope-o" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email (Student ID / university email)"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="phone" size={18} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone (optional)"
                      placeholderTextColor="#999"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="lock" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password (min 8 characters)"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
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
                  <View style={styles.inputWrapper}>
                    <FontAwesome name="lock" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <FontAwesome
                        name={showConfirmPassword ? 'eye' : 'eye-slash'}
                        size={18}
                        color="#888"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Create account</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.signInLink} onPress={() => router.back()}>
                    <Text style={styles.signInText}>Already have an account? </Text>
                    <Text style={styles.signInLinkText}>Sign in</Text>
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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backLabel: {
    fontSize: 16,
    color: HOWARD_BLUE,
    marginLeft: 8,
    fontWeight: '500',
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
  title: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 22,
    color: HOWARD_BLUE,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#5a6b7d',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: HOWARD_RED,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
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
  inputIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  eyeButton: { padding: 6 },
  submitButton: {
    backgroundColor: HOWARD_RED,
    borderRadius: 30,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: HOWARD_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signInLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInText: { color: '#555', fontSize: 14 },
  signInLinkText: { color: HOWARD_RED, fontSize: 14, fontWeight: '600' },
});
