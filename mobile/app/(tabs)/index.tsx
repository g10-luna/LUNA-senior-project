import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageBackground,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import HeaderWaveDivider from '@/components/HeaderWaveDivider';
import {
  getDiscoverOverview,
  getBooks,
  getTopAuthors,
  type Book,
  type AuthorCount,
  type PublisherCount,
  type DiscoverOverview,
  BooksApiError,
} from '@/src/services/books';

const { width: screenWidth } = Dimensions.get('window');
const WAVE_HEIGHT = 36;
const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const CONTENT_PAD = 20;
const CARD_GAP = 12;
const AUTHOR_CARD_WIDTH = 150;
const ALL_BOOKS_PAGE_SIZE = 20;

function statusLabel(status: Book['status']): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'CHECKED_OUT':
      return 'Checked Out';
    case 'RESERVED':
      return 'Reserved';
    case 'UNAVAILABLE':
      return 'Unavailable';
    default:
      return String(status);
  }
}

function statusColor(status: Book['status']): string {
  switch (status) {
    case 'AVAILABLE':
      return 'rgba(22,163,74,0.85)';
    case 'CHECKED_OUT':
    case 'UNAVAILABLE':
      return 'rgba(220,38,38,0.85)';
    case 'RESERVED':
      return 'rgba(234,179,8,0.85)';
    default:
      return 'rgba(100,116,139,0.85)';
  }
}

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

const GRID_CARD_WIDTH = (screenWidth - CONTENT_PAD * 2 - 2 * CARD_GAP) / 3;

function BookCard({
  book,
  accentColor,
  cardWidth,
}: {
  book: Book;
  accentColor: string;
  cardWidth?: number;
}) {
  const hasCover = Boolean(book.cover_image_url?.trim());
  const w = cardWidth ?? 130;
  const h = cardWidth ? Math.round(w * (175 / 130)) : 175;
  return (
    <TouchableOpacity style={[styles.bookCard, cardWidth ? { width: w } : undefined]} activeOpacity={0.85}>
      <View style={[styles.bookCover, { width: w, height: h, backgroundColor: accentColor + '15' }]}>
        {hasCover ? (
          <Image
            source={{ uri: book.cover_image_url! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <>
            <LinearGradient
              colors={[accentColor + '30', accentColor + '08']}
              style={StyleSheet.absoluteFill}
            />
            <FontAwesome name="book" size={28} color={accentColor} />
          </>
        )}
        <View style={[styles.availableTag, { backgroundColor: statusColor(book.status) }]}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>{statusLabel(book.status)}</Text>
        </View>
      </View>
      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AuthorCard({ item, accentColor }: { item: AuthorCount; accentColor: string }) {
  const initial = item.author.trim() ? item.author.trim()[0].toUpperCase() : '?';
  const hasImage = Boolean(item.author_image_url?.trim());
  return (
    <TouchableOpacity
      style={[styles.authorCard, { width: AUTHOR_CARD_WIDTH }]}
      activeOpacity={0.85}
    >
      <View style={[styles.authorCardCover, { backgroundColor: hasImage ? 'transparent' : accentColor + '18' }]}>
        {hasImage ? (
          <Image
            source={{ uri: item.author_image_url! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <>
            <LinearGradient
              colors={[accentColor + '35', accentColor + '0c']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.authorCardInitialText, { color: accentColor }]}>{initial}</Text>
          </>
        )}
      </View>
      <Text style={styles.authorCardName} numberOfLines={2}>{item.author}</Text>
      <Text style={styles.authorCardCount}>
        {item.count} {item.count === 1 ? 'book' : 'books'}
      </Text>
    </TouchableOpacity>
  );
}

function PublisherCard({ item, accentColor }: { item: PublisherCount; accentColor: string }) {
  const trimmed = item.publisher.trim();
  const initials = trimmed.length >= 2
    ? (trimmed[0] + trimmed[1]).toUpperCase()
    : trimmed.length === 1
      ? trimmed[0].toUpperCase()
      : '?';
  return (
    <TouchableOpacity
      style={[styles.authorCard, { width: AUTHOR_CARD_WIDTH }]}
      activeOpacity={0.85}
    >
      <View style={styles.publisherCardCover}>
        <Text style={[styles.publisherCardInitials, { color: accentColor }]}>{initials}</Text>
      </View>
      <Text style={styles.authorCardName} numberOfLines={2}>{item.publisher}</Text>
      <Text style={styles.authorCardCount}>
        {item.count} {item.count === 1 ? 'book' : 'books'}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabIndexScreen() {
  const { hasToken, refreshAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState<DiscoverOverview | null>(null);
  const [topAuthors, setTopAuthors] = useState<AuthorCount[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [availableNow, setAvailableNow] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [allBooksPage, setAllBooksPage] = useState(1);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const [loadingMoreBooks, setLoadingMoreBooks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false, retry = false) => {
    if (__DEV__) console.log('[home] loadData', { isRefresh, retry });
    if (isRefresh) {
      setRefreshing(true);
      setAllBooks([]);
      setAllBooksPage(1);
      setHasMoreBooks(true);
    } else if (!retry) setLoading(true);
    setError(null);
    try {
      if (!retry) await refreshAuth();
      const overviewRes = await getDiscoverOverview(12, 5);
      setOverview(overviewRes);
      try {
        const authors = await getTopAuthors(20);
        setTopAuthors(authors);
      } catch (authorsErr) {
        if (__DEV__) console.warn('[home] Top authors failed', authorsErr instanceof BooksApiError ? { message: authorsErr.message } : authorsErr);
        setTopAuthors(overviewRes?.top_authors ?? []);
      }
      try {
        const listRes = await getBooks({ sort: 'created_at', order: 'desc', limit: 12 });
        setNewArrivals(listRes.items);
      } catch (listErr) {
        if (__DEV__) console.warn('[home] New Arrivals list failed', listErr instanceof BooksApiError ? { message: listErr.message } : listErr);
        setNewArrivals([]);
      }
      try {
        const availableRes = await getBooks({ status: 'AVAILABLE', limit: 12, sort: 'title', order: 'asc' });
        setAvailableNow(availableRes.items);
      } catch (availErr) {
        if (__DEV__) console.warn('[home] Available Now list failed', availErr instanceof BooksApiError ? { message: availErr.message } : availErr);
        setAvailableNow([]);
      }
      try {
        const allRes = await getBooks({ page: 1, limit: ALL_BOOKS_PAGE_SIZE, sort: 'title', order: 'asc' });
        setAllBooks(allRes.items);
        setAllBooksPage(2);
        setHasMoreBooks(2 <= (allRes.pagination?.total_pages ?? 1));
      } catch (allErr) {
        if (__DEV__) console.warn('[home] All books first page failed', allErr instanceof BooksApiError ? { message: allErr.message } : allErr);
        setAllBooks([]);
        setHasMoreBooks(false);
      }
    } catch (e) {
      if (__DEV__) console.warn('[home] loadData error', e instanceof BooksApiError ? { message: e.message, status: e.status } : e);
      const is401 = e instanceof BooksApiError && e.status === 401;
      const isNotAuth =
        is401 &&
        (e.message === 'Not authenticated' ||
          e.message === 'Invalid or expired token' ||
          e.message === 'Please log in again');
      if (isNotAuth && !retry) {
        await refreshAuth();
        await loadData(isRefresh, true);
        return;
      }
      const message = e instanceof BooksApiError ? e.message : 'Couldn’t load catalog';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshAuth]);

  const loadMoreBooks = useCallback(async () => {
    if (loadingMoreBooks || !hasMoreBooks) return;
    setLoadingMoreBooks(true);
    try {
      const res = await getBooks({
        page: allBooksPage,
        limit: ALL_BOOKS_PAGE_SIZE,
        sort: 'title',
        order: 'asc',
      });
      setAllBooks((prev) => [...prev, ...res.items]);
      const nextPage = allBooksPage + 1;
      setAllBooksPage(nextPage);
      setHasMoreBooks(nextPage <= (res.pagination?.total_pages ?? 1));
    } catch (e) {
      if (__DEV__) console.warn('[home] loadMoreBooks failed', e);
    } finally {
      setLoadingMoreBooks(false);
    }
  }, [allBooksPage, hasMoreBooks, loadingMoreBooks]);

  useEffect(() => {
    if (hasToken) loadData();
  }, [hasToken, loadData]);

  if (hasToken === null) return null;
  if (!hasToken) return <SearchScreen />;

  const listHeader = (
    <>
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

        {loading && !overview ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HOWARD_BLUE} />
            <Text style={styles.loadingText}>Loading catalog…</Text>
          </View>
        ) : error && !overview ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={() => loadData()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {/* 1. Discover / For you */}
            <View style={styles.section}>
              <SectionHeader title="Discover" onSeeAll={() => {}} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookList}>
                {(overview?.random_books ?? []).length === 0 ? (
                  <Text style={styles.emptySection}>No books right now</Text>
                ) : (
                  (overview?.random_books ?? []).map((book) => (
                    <BookCard key={book.id} book={book} accentColor="#f59e0b" />
                  ))
                )}
              </ScrollView>
            </View>

            {/* 2. New arrivals */}
            <View style={styles.section}>
              <SectionHeader title="New Arrivals" onSeeAll={() => {}} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookList}>
                {newArrivals.length === 0 ? (
                  <Text style={styles.emptySection}>No new arrivals</Text>
                ) : (
                  newArrivals.map((book) => <BookCard key={book.id} book={book} accentColor="#06b6d4" />)
                )}
              </ScrollView>
            </View>

            {/* 3. Available now (separate list so it differs from Discover) */}
            <View style={styles.section}>
              <SectionHeader title="Available Now" onSeeAll={() => {}} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookList}>
                {availableNow.length === 0 ? (
                  <Text style={styles.emptySection}>No books right now</Text>
                ) : (
                  availableNow.map((book) => (
                    <BookCard key={book.id} book={book} accentColor="#16a34a" />
                  ))
                )}
              </ScrollView>
            </View>

            {/* 4. Browse by author – horizontal scroll */}
            <View style={styles.section}>
              <SectionHeader title="Browse by Author" onSeeAll={() => {}} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.authorCardScroll}
              >
                {((topAuthors.length > 0 ? topAuthors : overview?.top_authors) ?? []).length === 0 ? (
                  <Text style={styles.emptySection}>No authors yet</Text>
                ) : (
                  (topAuthors.length > 0 ? topAuthors : overview?.top_authors ?? []).map((item, i) => (
                    <AuthorCard key={`${item.author}-${i}`} item={item} accentColor="#8b5cf6" />
                  ))
                )}
              </ScrollView>
            </View>

            {/* 5. Browse by publisher */}
            <View style={styles.section}>
              <SectionHeader title="Browse by Publisher" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.authorCardScroll}
              >
                {(overview?.top_publishers ?? []).length === 0 ? (
                  <Text style={styles.emptySection}>No publishers yet</Text>
                ) : (
                  (overview?.top_publishers ?? []).map((item, i) => (
                    <PublisherCard key={`${item.publisher}-${i}`} item={item} accentColor="#0ea5e9" />
                  ))
                )}
              </ScrollView>
            </View>

            {/* All books – infinite list below */}
            <View style={styles.section}>
              <SectionHeader title="All books" />
            </View>
          </>
        )}
    </>
  );

  const listFooter = (
    <>
      {loadingMoreBooks && (
        <View style={styles.loadingMoreWrap}>
          <ActivityIndicator size="small" color={HOWARD_BLUE} />
          <Text style={styles.loadingMoreText}>Loading more…</Text>
        </View>
      )}
      <View style={styles.section}>
        <SectionHeader title="Browse by Year" />
        <View style={styles.chipRow}>
          {(overview?.top_years ?? []).length === 0 ? (
            <Text style={styles.emptySection}>No years yet</Text>
          ) : (
            (overview?.top_years ?? []).map((item, i) => (
              <TouchableOpacity key={`${item.year}-${i}`} style={styles.chip} activeOpacity={0.8}>
                <Text style={styles.chipText}>{item.year}</Text>
                <Text style={styles.chipCount}>{item.count}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
      {overview?.stats && (
        <View style={styles.statsWrap}>
          <Text style={styles.statsTitle}>Catalog</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{overview.stats.total_books} total</Text>
            <Text style={styles.statsText}>{overview.stats.available_books} available</Text>
          </View>
        </View>
      )}
    </>
  );

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        {/* Fixed header (galaxy + arc) – does not scroll */}
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
        <FlatList
        data={allBooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.allBooksCardWrap}>
            <BookCard book={item} accentColor="#64748b" cardWidth={GRID_CARD_WIDTH} />
          </View>
        )}
        numColumns={3}
        columnWrapperStyle={styles.allBooksRow}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReached={loadMoreBooks}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[styles.content, allBooks.length === 0 && !loading && overview ? { paddingBottom: 24 } : undefined]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[HOWARD_BLUE]} />
        }
        style={styles.flatList}
      />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flatList: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 24 },
  topThirdWrap: {
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: HOWARD_BLUE,
    zIndex: 1,
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
    paddingHorizontal: 24,
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
    backgroundColor: HOWARD_BLUE,
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
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  errorWrap: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: HOWARD_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#b91c1c',
    marginRight: 12,
  },
  emptySection: {
    fontSize: 14,
    color: '#94a3b8',
    paddingVertical: 16,
  },
  allBooksRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  allBooksCardWrap: {
    width: GRID_CARD_WIDTH,
  },
  loadingMoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#64748b',
  },
  authorCardScroll: {
    flexDirection: 'row',
    paddingRight: CONTENT_PAD,
  },
  authorCard: {
    marginRight: CARD_GAP,
  },
  authorCardCover: {
    width: AUTHOR_CARD_WIDTH,
    height: AUTHOR_CARD_WIDTH,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  publisherCardCover: {
    width: AUTHOR_CARD_WIDTH,
    height: AUTHOR_CARD_WIDTH,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  publisherCardInitials: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  authorCardInitialText: {
    fontSize: 48,
    fontWeight: '700',
  },
  authorCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
    lineHeight: 18,
  },
  authorCardCount: {
    fontSize: 12,
    color: '#64748b',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: 200,
  },
  chipTextWide: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: 240,
  },
  chipCount: {
    fontSize: 12,
    color: '#64748b',
  },
  statsWrap: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#475569',
  },
});
