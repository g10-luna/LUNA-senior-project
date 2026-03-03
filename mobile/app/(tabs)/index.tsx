import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageBackground,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import HeaderWaveDivider from '@/components/HeaderWaveDivider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const WAVE_HEIGHT = 36;
const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const CARD_BG = '#f8fafc';

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
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  if (hasToken === null) return null;
  if (!hasToken) return <SearchScreen />;

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
      {/* Top header only: galaxy + wave divider */}
      <View style={styles.topThirdWrap}>
        <View style={styles.header}>
          <ImageBackground
            source={require('../../assets/images/galaxy.jpg')}
            style={styles.headerBgImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,58,99,0.55)', 'rgba(0,42,71,0.65)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.headerRow, { paddingTop: 12 + insets.top }]}>
            <View style={styles.headerLeft}>
              <View style={styles.headerBranding}>
                <Text style={styles.headerTitle}>LUNA</Text>
                <Text style={styles.headerSubtitle}>Library Utility and Navigation Assistant | Howard University </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.notifButton} activeOpacity={0.7}>
                <FontAwesome name="bell" size={22} color="#fff" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerProfileAvatar} activeOpacity={0.7}>
                <Image
                  source={require('../../assets/images/placeholder_profile.jpeg')}
                  style={styles.headerProfileAvatarImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          </View>
          <HeaderWaveDivider width={screenWidth} height={WAVE_HEIGHT} fill="#fff" variant="concave" />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrap}>
            <FontAwesome name="search" size={15} color={HOWARD_BLUE} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Books, authors, topics..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity style={styles.searchActionBtn} activeOpacity={0.7}>
            <FontAwesome name="microphone" size={16} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchActionBtn} activeOpacity={0.7}>
            <FontAwesome name="camera" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <FontAwesome name="sliders" size={15} color={HOWARD_BLUE} />
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 24 },
  topThirdWrap: {
    marginHorizontal: -20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    overflow: 'hidden',
    paddingBottom: WAVE_HEIGHT,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingRight: 12,
  },
  headerBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
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
  headerProfileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  headerProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 6,
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginLeft: 4,
  },
  searchIcon: { marginRight: 10 },
  searchActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  filterBtn: {
    width: 52,
    borderRadius: 16,
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
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
