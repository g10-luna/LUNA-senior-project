import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import BookCard from '@/components/BookCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  getBooks,
  getSearchSuggestions,
  getRandomBooks,
  type Book,
  type BookStatus,
  type SearchSuggestion,
  BooksApiError,
} from '@/src/services/books';
import { getCoverUrl } from '@/src/utils/covers';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const SEARCH_PAGE_SIZE = 20;
const RECENT_MAX = 10;
const SUGGEST_DEBOUNCE_MS = 300;

const POPULAR_LIMIT = 4;

const CATEGORIES = [
  { label: 'Science', icon: 'flask' as const, color: '#06b6d4', bg: '#ecfeff' },
  { label: 'Fiction', icon: 'magic' as const, color: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'Technology', icon: 'microchip' as const, color: HOWARD_BLUE, bg: '#eff6ff' },
  { label: 'History', icon: 'globe' as const, color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Biography', icon: 'user' as const, color: '#10b981', bg: '#ecfdf5' },
  { label: 'Art & Design', icon: 'paint-brush' as const, color: HOWARD_RED, bg: '#fff1f2' },
];

function statusLabel(s: BookStatus): string {
  switch (s) {
    case 'AVAILABLE': return 'Available';
    case 'CHECKED_OUT': return 'Checked Out';
    case 'RESERVED': return 'Reserved';
    case 'UNAVAILABLE': return 'Unavailable';
    default: return String(s);
  }
}

function statusColor(s: BookStatus): string {
  switch (s) {
    case 'AVAILABLE': return 'rgba(22,163,74,0.9)';
    case 'CHECKED_OUT':
    case 'UNAVAILABLE': return 'rgba(220,38,38,0.9)';
    case 'RESERVED': return 'rgba(234,179,8,0.9)';
    default: return '#64748b';
  }
}

function SearchBookRow({
  book,
  onPress,
}: {
  book: Book;
  onPress: () => void;
}) {
  const hasCover = Boolean(book.cover_image_url?.trim());
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.resultCover}>
        {hasCover ? (
          <Image
            source={{ uri: getCoverUrl(book.cover_image_url, 'thumbnail')! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            recyclingKey={book.id}
          />
        ) : (
          <LinearGradient colors={[HOWARD_BLUE + '30', HOWARD_BLUE + '08']} style={StyleSheet.absoluteFill}>
            <FontAwesome name="book" size={24} color={HOWARD_BLUE} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.resultAuthor} numberOfLines={1}>{book.author}</Text>
        <View style={[styles.resultBadge, { backgroundColor: statusColor(book.status) }]}>
          <Text style={styles.resultBadgeText}>{statusLabel(book.status)}</Text>
        </View>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [results, setResults] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPopularLoading(true);
    getRandomBooks(POPULAR_LIMIT)
      .then((books) => { if (!cancelled) setPopularBooks(books); })
      .catch(() => { if (!cancelled) setPopularBooks([]); })
      .finally(() => { if (!cancelled) setPopularLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback(async (q: string, pageNum: number = 1, isRefresh = false) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (pageNum === 1) {
      setSubmittedQuery(trimmed);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const res = await getBooks({ q: trimmed, page: pageNum, limit: SEARCH_PAGE_SIZE, sort: 'title', order: 'asc' });
      if (pageNum === 1) {
        setResults(res.items);
        setPage(2);
        setTotalPages(res.pagination?.total_pages ?? 1);
        setRecentSearches((prev) => {
          const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, RECENT_MAX);
          return next;
        });
      } else {
        setResults((prev) => [...prev, ...res.items]);
        setPage((p) => p + 1);
      }
    } catch (e) {
      const msg = e instanceof BooksApiError ? e.message : 'Search failed';
      setError(msg);
      if (pageNum === 1) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (trimmed) runSearch(trimmed, 1);
  }, [query, runSearch]);

  useEffect(() => {
    const t = query.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(() => {
      getSearchSuggestions(t, 10)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
      suggestTimerRef.current = null;
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [query]);

  const loadMore = useCallback(() => {
    if (!submittedQuery || loadingMore || page > totalPages) return;
    runSearch(submittedQuery, page);
  }, [submittedQuery, page, totalPages, loadingMore, runSearch]);

  const clearSearchHistory = useCallback(() => {
    setRecentSearches([]);
    setQuery('');
    setSubmittedQuery(null);
    setResults([]);
    setError(null);
    setPage(1);
    setTotalPages(1);
    setSuggestions([]);
  }, []);

  const showResults = Boolean(submittedQuery?.trim());
  const showDiscover = !showResults;
  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.heading}>Search</Text>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={15} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Books, authors, topics..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity style={styles.actionBtn} onPress={handleSubmit}>
            <FontAwesome name="search" size={15} color={HOWARD_BLUE} />
          </TouchableOpacity>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestList}>
            {suggestions.slice(0, 8).map((s, i) => (
              <TouchableOpacity
                key={`${s.label}-${s.type}-${i}`}
                style={styles.suggestItem}
                onPress={() => {
                  setQuery(s.label);
                  setSuggestions([]);
                  runSearch(s.label, 1);
                }}
              >
                <FontAwesome name={s.type === 'author' ? 'user' : 'book'} size={14} color="#64748b" />
                <Text style={styles.suggestText} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {showResults ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchBookRow book={item} onPress={() => router.push(`/book/${item.id}`)} />
          )}
          ListHeaderComponent={
            <>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => submittedQuery && runSearch(submittedQuery, 1)}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {recentSearches.length > 0 ? (
                <View style={styles.resultsClearHistoryRow}>
                  <TouchableOpacity
                    onPress={clearSearchHistory}
                    style={styles.resultsClearHistoryBtn}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="trash-o" size={13} color="#64748b" />
                    <Text style={styles.resultsClearHistoryText}>Clear search history</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="large" color={HOWARD_BLUE} />
                <Text style={styles.emptySub}>Searching…</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <FontAwesome name="search" size={40} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No books found</Text>
                <Text style={styles.emptySub}>Try a different search for “{submittedQuery}”</Text>
              </View>
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={HOWARD_BLUE} />
              </View>
            ) : loadingMore ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={HOWARD_BLUE} />
                <Text style={styles.loadingMoreText}>Loading more…</Text>
              </View>
            ) : results.length > 0 ? (
              <View style={[styles.footerPad, { height: bottomPadding }]} />
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => submittedQuery && runSearch(submittedQuery, 1, true)}
              colors={[HOWARD_BLUE]}
            />
          }
          contentContainerStyle={results.length === 0 && !loading ? styles.listContent : undefined}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.body, { paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearchHistory}
                  style={styles.clearHistoryButton}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="trash-o" size={14} color="#64748b" />
                  <Text style={styles.clearHistoryText}>Clear search history</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.chipRow}>
              {recentSearches.length === 0 ? (
                <Text style={styles.hintText}>Search for books to see recent terms here.</Text>
              ) : (
                recentSearches.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.chip}
                    activeOpacity={0.75}
                    onPress={() => runSearch(s, 1)}
                  >
                    <FontAwesome name="history" size={12} color="#64748b" />
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Right Now</Text>
            {popularLoading ? (
              <View style={styles.popularLoadingWrap}>
                <ActivityIndicator size="small" color={HOWARD_RED} />
              </View>
            ) : popularBooks.length === 0 ? (
              <Text style={styles.hintText}>No books in the catalog yet.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularBookList}
              >
                {popularBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    accentColor={HOWARD_RED}
                    onPress={() => router.push(`/book/${book.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.catCard, { backgroundColor: cat.bg }]}
                  activeOpacity={0.8}
                  onPress={() => runSearch(cat.label, 1)}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <FontAwesome name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 6,
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginHorizontal: 8 },
  input: { flex: 1, fontSize: 15, color: '#1e293b' },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  suggestList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  suggestText: { flex: 1, fontSize: 15, color: '#334155' },
  body: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  clearHistoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearHistoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  resultsClearHistoryRow: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  resultsClearHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultsClearHistoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  hintText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularLoadingWrap: { paddingVertical: 16, alignItems: 'center' },
  popularBookList: { paddingRight: 20, gap: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  popularChip: { borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  popularChipText: { color: HOWARD_RED },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 15, fontWeight: '700' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  resultCover: {
    width: 48,
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  resultInfo: { flex: 1, marginLeft: 14 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  resultAuthor: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  resultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 14, color: '#b91c1c', marginRight: 12 },
  retryText: { fontSize: 14, fontWeight: '600', color: HOWARD_BLUE },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  loadingMoreText: { fontSize: 14, color: '#64748b' },
  listContent: { flexGrow: 1 },
  footerPad: {},
});
