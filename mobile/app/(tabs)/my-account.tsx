import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { clearTokens, getMe, type MeUser } from '@/src/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

export default function MyAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasToken, refreshAuth } = useAuth();
  const [user, setUser] = useState<MeUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = React.useCallback(() => {
    if (!hasToken) return;
    setProfileLoading(true);
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setProfileLoading(false));
  }, [hasToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    React.useCallback(() => {
      if (hasToken) getMe().then(setUser).catch(() => setUser(null));
    }, [hasToken])
  );

  const handleSignOut = async () => {
    await clearTokens();
    await refreshAuth();
    router.replace('/login');
  };

  if (hasToken === null) return null;

  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;
  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() || 'My Account' : 'My Account';
  const isStudent = user?.role === 'STUDENT';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. User Info Card */}
        <View style={styles.section}>
          <View style={styles.userCard}>
            <LinearGradient
              colors={[HOWARD_BLUE + '12', HOWARD_BLUE + '06', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.userCardRow}>
              <View style={styles.avatarWrap}>
                <ExpoImage
                  source={require('../../assets/images/placeholder_profile.jpeg')}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </View>
              <View style={styles.userInfo}>
                {profileLoading ? (
                  <ActivityIndicator size="small" color={HOWARD_BLUE} style={{ marginVertical: 8 }} />
                ) : (
                  <>
                    <Text style={styles.userName}>{fullName}</Text>
                    <Text style={styles.userMeta}>Howard University{isStudent ? ' • Student' : ''}</Text>
                    {isStudent && (
                      <View style={styles.verifiedBadge}>
                        <FontAwesome name="check-circle" size={14} color="#16a34a" />
                        <Text style={styles.verifiedText}>Verified student</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
              <TouchableOpacity style={styles.studentIdCta} onPress={() => {}} activeOpacity={0.7}>
                <FontAwesome name="qrcode" size={48} color={HOWARD_BLUE} />
                <Text style={styles.studentIdLabel}>Student ID</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => {}} activeOpacity={0.7}>
                <FontAwesome name="qrcode" size={24} color={HOWARD_BLUE} />
                <Text style={styles.quickActionLabel}>My QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => {}} activeOpacity={0.7}>
                <View>
                  <FontAwesome name="bell-o" size={24} color={HOWARD_BLUE} />
                  <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>0</Text></View>
                </View>
                <Text style={styles.quickActionLabel}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => {}} activeOpacity={0.7}>
                <FontAwesome name="automobile" size={24} color={HOWARD_BLUE} />
                <Text style={styles.quickActionLabel}>Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => {}} activeOpacity={0.7}>
                <FontAwesome name="question-circle-o" size={24} color={HOWARD_BLUE} />
                <Text style={styles.quickActionLabel}>Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. Active Delivery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Delivery</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.noDeliveryContent}>
              <FontAwesome name="automobile" size={32} color="#cbd5e1" />
              <Text style={styles.noDeliveryTitle}>No deliveries in progress</Text>
              <Text style={styles.noDeliverySub}>When you request a book, your robot delivery will appear here.</Text>
            </View>
          </View>
        </View>

        {/* 3. My Books */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My Books</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.myBooksSummary}>0 Borrowed Books</Text>
            <Text style={styles.placeholderSub}>Borrowed books and due dates will appear here.</Text>
          </View>
        </View>

        {/* 4. Requests History */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Requests History</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.placeholderSub}>Your recent requests will appear here.</Text>
          </View>
        </View>

        {/* 5. Saved & Favorites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved & Favorites</Text>
          <View style={styles.card}>
            <Text style={styles.savedSummary}>0 books saved for later</Text>
            <Text style={styles.placeholderSub}>Save books from search to see them here.</Text>
          </View>
        </View>

        {/* 6. Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Books read this month</Text>
              <Text style={styles.activityValue}>0</Text>
            </View>
            <View style={[styles.activityRow, styles.activityRowBorder]}>
              <Text style={styles.activityLabel}>Requests made</Text>
              <Text style={styles.activityValue}>0</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Favorite category</Text>
              <Text style={styles.activityValue}>—</Text>
            </View>
          </View>
        </View>

        {/* 7. Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuRow, styles.menuRowBorder]} onPress={() => router.push('/account-info')} activeOpacity={0.7}>
              <FontAwesome name="user-o" size={18} color={HOWARD_BLUE} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Account info</Text>
              <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, styles.menuRowBorder]} onPress={() => {}} activeOpacity={0.7}>
              <FontAwesome name="bell-o" size={18} color={HOWARD_BLUE} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Notifications</Text>
              <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, styles.menuRowBorder]} onPress={() => {}} activeOpacity={0.7}>
              <FontAwesome name="automobile" size={18} color={HOWARD_BLUE} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Delivery preferences</Text>
              <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => {}} activeOpacity={0.7}>
              <FontAwesome name="lock" size={18} color={HOWARD_BLUE} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Privacy</Text>
              <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <FontAwesome name="sign-out" size={18} color={HOWARD_RED} style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>LUNA · Library Utility and Navigation Assistant</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  seeAll: { fontSize: 14, fontWeight: '600', color: HOWARD_BLUE },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: HOWARD_BLUE + '20',
    borderWidth: 2,
    borderColor: HOWARD_BLUE + '30',
  },
  avatar: { width: '100%', height: '100%' },
  userInfo: { flex: 1, marginLeft: 16, minWidth: 0 },
  userName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  userMeta: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  studentIdCta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  studentIdLabel: { fontSize: 13, fontWeight: '600', color: HOWARD_BLUE, marginTop: 6 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionBtn: { alignItems: 'center', flex: 1 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 8 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: HOWARD_RED,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  noDeliveryContent: { alignItems: 'center' },
  noDeliveryTitle: { fontSize: 16, fontWeight: '700', color: '#64748b', marginTop: 12 },
  noDeliverySub: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  myBooksSummary: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  savedSummary: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  placeholderSub: { fontSize: 14, color: '#94a3b8' },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  activityRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0' },
  activityLabel: { fontSize: 15, color: '#64748b' },
  activityValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1e293b' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  signOutIcon: { marginRight: 8 },
  signOutText: { fontSize: 16, fontWeight: '600', color: HOWARD_RED },
  footer: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
});
