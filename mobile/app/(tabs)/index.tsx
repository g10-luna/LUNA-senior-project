import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import HeaderWaveDivider from '@/components/HeaderWaveDivider';
import { getApiUrl, getAccessToken } from '@/src/services/auth';

const { width: screenWidth } = Dimensions.get('window');
const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const CARD_BG = '#f8fafc';
const INPUT_BG = '#f1f5f9';

const searchStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#333', marginBottom: 8 },
  placeholder: { fontSize: 15, color: '#888' },
});

function SearchScreen() {
  return (
    <View style={searchStyles.container}>
      <FontAwesome name="search" size={48} color="#ccc" style={searchStyles.icon} />
      <Text style={searchStyles.title}>Search</Text>
      <Text style={searchStyles.placeholder}>Search the catalog (coming soon)</Text>
    </View>
  );
}

export default function TabIndexScreen() {
  const { hasToken } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json().catch(() => ({}));
        const user = json?.data?.user ?? json?.user;
        if (cancelled || !user) return;
        const first = (user.first_name ?? '').trim();
        const last = (user.last_name ?? '').trim();
        const name = [first, last].filter(Boolean).join(' ') || (user.email ?? '').split('@')[0] || 'there';
        setDisplayName(name);
      } catch {
        setDisplayName('there');
      }
    })();
    return () => { cancelled = true; };
  }, [hasToken]);

  if (hasToken === null) return null;
  if (!hasToken) return <SearchScreen />;

  const greetingName = displayName || 'there';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header: gradient bar with curved bottom (single block, no separate lines) */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(0,58,99,0.92)', 'rgba(0,42,71,0.95)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoWrap}>
              <Image
                source={require('../../assets/images/luna-icon-transparent.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerBranding}>
              <Text style={styles.headerTitle}>LUNA</Text>
              <Text style={styles.headerSubtitle}>HOWARD UNIVERSITY LIBRARIES</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifButton} activeOpacity={0.7}>
              <FontAwesome name="bell" size={22} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <HeaderWaveDivider width={screenWidth} height={36} fill="#fff" variant="concave" />
      </View>

      {/* Greeting: profile + Hello, [name] 👋 + subtitle */}
      <View style={styles.greetingRow}>
        <TouchableOpacity style={styles.profileAvatar} activeOpacity={0.7}>
          <FontAwesome name="user-o" size={24} color={HOWARD_BLUE} />
        </TouchableOpacity>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>Hello, {greetingName} 👋</Text>
          <Text style={styles.greetingSubtitle}>Ready to explore the library?</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <FontAwesome name="search" size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search books..."
          placeholderTextColor="#94a3b8"
          editable={false}
        />
        <TouchableOpacity style={styles.searchFilterBtn}>
          <FontAwesome name="sliders" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status card: Delivery + Pickup */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBlock, styles.deliveryBlock]}>
            <FontAwesome name="automobile" size={28} color={HOWARD_BLUE} style={styles.statusIcon} />
            <Text style={styles.statusTitle}>Delivery in Progress</Text>
            <Text style={styles.statusSub}>Robot is on the way — Room 302</Text>
            <Text style={styles.statusTime}>Arriving in 2 min</Text>
            <TouchableOpacity style={styles.mapLink}>
              <Text style={styles.mapLinkText}>View on Library Map</Text>
              <FontAwesome name="chevron-down" size={12} color={HOWARD_BLUE} />
            </TouchableOpacity>
          </View>
          <View style={[styles.statusBlock, styles.pickupBlock]}>
            <FontAwesome name="book" size={24} color={HOWARD_RED} style={styles.statusIcon} />
            <Text style={styles.statusTitle}>Pickup Pending</Text>
            <Text style={styles.statusSub}>Ready for return at Desk 5A</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.requestBtn]}>
          <FontAwesome name="book" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Request a Book</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.returnBtn]}>
          <FontAwesome name="reply" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Return a Book</Text>
        </TouchableOpacity>
      </View>

      {/* Newly Arrived */}
      <Text style={styles.sectionTitle}>Newly Arrived</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bookList}
      >
        {[
          { title: 'Think Like a Robot', author: 'Jaron Rain Ha' },
          { title: 'The Alchemist\'s Code', author: 'Eric North' },
          { title: 'Quantum Computing for Everyone', author: 'Deni B.' },
          { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen' },
        ].map((book, i) => (
          <TouchableOpacity key={i} style={styles.bookCard}>
            <View style={styles.bookCover}>
              <FontAwesome name="book" size={32} color={HOWARD_BLUE} />
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
            <View style={styles.availableTag}>
              <Text style={styles.availableText}>Available</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24 },
  header: {
    marginHorizontal: -20,
    overflow: 'hidden',
    paddingBottom: 36,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingRight: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerLogo: { width: 28, height: 28 },
  headerBranding: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexShrink: 0,
    marginLeft: 8,
  },
  notifButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: HOWARD_RED,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 58, 99, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 58, 99, 0.15)',
  },
  greetingBlock: { flex: 1 },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 10,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#334155' },
  searchFilterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HOWARD_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 58, 99, 0.12)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  statusRow: { flexDirection: 'row' },
  statusBlock: {
    flex: 1,
    padding: 16,
    minHeight: 140,
  },
  deliveryBlock: { borderRightWidth: 1, borderRightColor: 'rgba(0, 58, 99, 0.1)' },
  pickupBlock: { backgroundColor: 'rgba(227, 24, 55, 0.08)' },
  statusIcon: { marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: HOWARD_BLUE, marginBottom: 4 },
  statusSub: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  statusTime: { fontSize: 12, fontWeight: '600', color: HOWARD_BLUE, marginBottom: 6 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLinkText: { fontSize: 12, color: HOWARD_BLUE, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  requestBtn: { backgroundColor: HOWARD_RED },
  returnBtn: { backgroundColor: HOWARD_BLUE },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  bookList: { paddingRight: 20 },
  bookCard: {
    width: 120,
    marginRight: 14,
  },
  bookCover: {
    width: 120,
    height: 160,
    backgroundColor: 'rgba(0, 58, 99, 0.08)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bookTitle: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 2 },
  bookAuthor: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  availableTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 58, 99, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availableText: { fontSize: 11, fontWeight: '600', color: HOWARD_BLUE },
});
