import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMe, updateMe, type MeUser } from '@/src/services/auth';
import BottomTabBar, { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';

const HOWARD_BLUE = '#003A63';

export default function AccountInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [phone_number, setPhone_number] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setFirst_name(u.first_name ?? '');
          setLast_name(u.last_name ?? '');
          setPhone_number(u.phone_number ?? '');
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setError(null);
    const fn = first_name.trim();
    const ln = last_name.trim();
    if (!fn) {
      setError('First name is required');
      return;
    }
    if (!ln) {
      setError('Last name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMe({
        first_name: fn || null,
        last_name: ln || null,
        phone_number: phone_number.trim() || null,
      });
      setUser(updated);
      Alert.alert('Saved', 'Your account info has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <FontAwesome name="arrow-left" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account info</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={HOWARD_BLUE} />
        </View>
      </View>
    );
  }

  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <FontAwesome name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account info</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email ?? ''}
              editable={false}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>Email cannot be changed here.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={first_name}
              onChangeText={setFirst_name}
              placeholder="First name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={last_name}
              onChangeText={setLast_name}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone number (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone_number}
              onChangeText={setPhone_number}
              placeholder="Phone number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: { fontSize: 14, color: '#b91c1c', fontWeight: '500' },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  saveBtn: {
    backgroundColor: HOWARD_BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
