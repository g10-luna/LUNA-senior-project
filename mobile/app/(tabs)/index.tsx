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

const { width: screenWidth } = Dimensions.get('window');
const WAVE_HEIGHT = 36;
const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

const CATEGORIES = [
  {
    id: 'new',
    title: 'New Arrivals',
    icon: 'star',
    color: '#f59e0b',
    books: [
      { title: 'Think Like a Robot', author: 'Jaron Rain Ha', available: true, isNew: true },
      { title: "The Alchemist's Code", author: 'Eric North', available: true, isNew: true },
      { title: 'Quantum Minds', author: 'Sara Lin', available: false, isNew: true },
      { title: 'Digital Futures', author: 'K. Ahmed', available: true, isNew: true },
    ],
  },
  {
    id: 'trending',
    title: 'Trending Today',
    icon: 'fire',
    color: '#ef4444',
    books: [
      { title: 'The Midnight Library', author: 'Matt Haig', available: true, isNew: false },
      { title: 'Atomic Habits', author: 'James Clear', available: false, isNew: false },
      { title: 'Deep Work', author: 'Cal Newport', available: true, isNew: false },
      { title: 'The Power of Now', author: 'E. Tolle', available: true, isNew: false },
    ],
  },
  {
    id: 'science',
    title: 'Science',
    icon: 'flask',
    color: '#06b6d4',
    books: [
      { title: 'A Brief History of Time', author: 'S. Hawking', available: true, isNew: false },
      { title: 'The Gene', author: 'Siddhartha Mukherjee', available: true, isNew: false },
      { title: 'Cosmos', author: 'Carl Sagan', available: false, isNew: false },
      { title: 'The Selfish Gene', author: 'R. Dawkins', available: true, isNew: false },
    ],
  },
  {
    id: 'fiction',
    title: 'Fiction',
    icon: 'magic',
    color: '#8b5cf6',
    books: [
      { title: '1984', author: 'George Orwell', available: true, isNew: false },
      { title: 'Dune', author: 'Frank Herbert', available: false, isNew: false },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', available: true, isNew: false },
      { title: 'Neuromancer', author: 'William Gibson', available: true, isNew: false },
    ],
  },
  {
    id: 'tech',
    title: 'Technology',
    icon: 'microchip',
    color: '#003A63',
    books: [
      { title: 'Clean Code', author: 'Robert C. Martin', available: true, isNew: false },
      { title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', available: false, isNew: false },
      { title: 'Intro to Algorithms', author: 'Cormen et al.', available: true, isNew: false },
      { title: 'Designing Data-Intensive Apps', author: 'M. Kleppmann', available: true, isNew: false },
    ],
  },
];

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


      {CATEGORIES.map((cat) => (
        <View key={cat.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: cat.color + '18' }]}>
                <FontAwesome name={cat.icon as any} size={14} color={cat.color} />
              </View>
              <Text style={styles.sectionTitle}>{cat.title}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookList}
          >
            {cat.books.map((book, i) => (
              <TouchableOpacity key={i} style={styles.bookCard} activeOpacity={0.85}>
                <View style={[styles.bookCover, { backgroundColor: cat.color + '15' }]}>
                  <LinearGradient
                    colors={[cat.color + '30', cat.color + '08']}
                    style={StyleSheet.absoluteFill}
                  />
                  <FontAwesome name="book" size={28} color={cat.color} />
                  {book.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                  <View style={[styles.availableTag, { backgroundColor: book.available ? 'rgba(22,163,74,0.85)' : 'rgba(220,38,38,0.85)' }]}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableText}>
                      {book.available ? 'Available' : 'Checked Out'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}
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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: HOWARD_BLUE,
  },
  bookList: {
    paddingRight: 20,
    gap: 12,
  },
  bookCard: {
    width: 130,
  },
  bookCover: {
    width: 130,
    height: 175,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
    lineHeight: 18,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  availableTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 5,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  availableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
