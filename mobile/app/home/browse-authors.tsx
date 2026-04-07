import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomTabBar, { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import BookCard from '@/components/BookCard';
import {
  getTopAuthors,
  getBooks,
  type AuthorCount,
  type Book,
  BooksApiError,
} from '@/src/services/books';

const HOWARD_BLUE = '#003A63';
const ACCENT = '#8b5cf6';
const CONTENT_PAD = 20;
const CARD_GAP = 12;
const PAGE_SIZE = 20;

export default function BrowseAuthorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const columns = 2;
  const cardWidth = (width - CONTENT_PAD * 2 - CARD_GAP) / columns;

  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  const [authors, setAuthors] = useState<AuthorCount[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [authorsError, setAuthorsError] = useState<string | null>(null);
  const [authorsRefreshing, setAuthorsRefreshing] = useState(false);

  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingMoreBooks, setLoadingMoreBooks] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [booksRefreshing, setBooksRefreshing] = useState(false);

  const loadAuthors = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setAuthorsRefreshing(true);
    else setAuthorsLoading(true);
    setAuthorsError(null);
    try {
      const items = await getTopAuthors(30);
      setAuthors(items);
    } catch (e) {
      const msg = e instanceof BooksApiError ? e.message : 'Could not load authors';
      setAuthorsError(msg);
      setAuthors([]);
    } finally {
      setAuthorsLoading(false);
      setAuthorsRefreshing(false);
    }
  }, []);

  const loadAuthorBooks = useCallback(async (author: string, pageNum: number, isRefresh: boolean) => {
    if (isRefresh) setBooksRefreshing(true);
    else if (pageNum === 1) setLoadingBooks(true);
    else setLoadingMoreBooks(true);
    setBooksError(null);
    try {
      const res = await getBooks({
        page: pageNum,
        limit: PAGE_SIZE,
        sort: 'title',
        order: 'asc',
        author,
      });
      if (pageNum === 1) setBooks(res.items);
      else setBooks((prev) => [...prev, ...res.items]);
      setTotalPages(res.pagination?.total_pages ?? 1);
      setPage(pageNum);
    } catch (e) {
      const msg = e instanceof BooksApiError ? e.message : 'Could not load author books';
      setBooksError(msg);
      if (pageNum === 1) setBooks([]);
    } finally {
      setLoadingBooks(false);
      setLoadingMoreBooks(false);
      setBooksRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuthors(false);
  }, [loadAuthors]);

  useEffect(() => {
    if (!selectedAuthor) return;
    setPage(1);
    setTotalPages(1);
    setBooks([]);
    loadAuthorBooks(selectedAuthor, 1, false);
  }, [selectedAuthor, loadAuthorBooks]);

  const canLoadMore = page < totalPages && !loadingMoreBooks;

  const onEndReached = () => {
    if (!selectedAuthor) return;
    if (!canLoadMore) return;
    loadAuthorBooks(selectedAuthor, page + 1, false);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => (selectedAuthor ? setSelectedAuthor(null) : router.back())}
        style={styles.backBtn}
        hitSlop={12}
        activeOpacity={0.8}
      >
        <FontAwesome name="arrow-left" size={22} color={HOWARD_BLUE} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>{selectedAuthor ? 'Author Books' : 'Browse by Author'}</Text>
        <Text style={styles.headerSub}>
          {selectedAuthor ? selectedAuthor : 'Top authors in the catalog'}
        </Text>
      </View>
      <View style={styles.headerRight} />
    </View>
  );

  const renderAuthor = ({ item }: { item: AuthorCount }) => {
    const initials = item.author.trim().length >= 2 ? (item.author.trim()[0] + item.author.trim()[1]).toUpperCase() : item.author.trim()[0]?.toUpperCase() ?? '?';
    return (
      <TouchableOpacity
        style={styles.authorRow}
        onPress={() => setSelectedAuthor(item.author)}
        activeOpacity={0.75}
      >
        <View style={[styles.authorAvatar, { backgroundColor: ACCENT + '18' }]}>
          <Text style={[styles.authorAvatarText, { color: ACCENT }]}>{initials}</Text>
        </View>
        <View style={styles.authorTextWrap}>
          <Text style={styles.authorName} numberOfLines={1}>
            {item.author}
          </Text>
          <Text style={styles.authorMeta}>
            {item.count} {item.count === 1 ? 'book' : 'books'}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  const renderBook = ({ item }: { item: Book }) => (
    <View style={[styles.cardCell, { width: cardWidth }]}>
      <BookCard
        book={item}
        accentColor={ACCENT}
        cardWidth={cardWidth}
        onPress={() => router.push(`/book/${item.id}`)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header}

        {!selectedAuthor ? (
          authorsLoading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator size="large" color={HOWARD_BLUE} />
              <Text style={styles.loadingText}>Loading authors…</Text>
            </View>
          ) : authorsError ? (
            <View style={styles.centerFill}>
              <Text style={styles.errorText}>{authorsError}</Text>
              <TouchableOpacity onPress={() => loadAuthors(false)} style={styles.retryBtn} activeOpacity={0.8}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={authors}
              keyExtractor={(a) => a.author}
              renderItem={renderAuthor}
              contentContainerStyle={{ paddingHorizontal: CONTENT_PAD, paddingBottom: bottomPadding, paddingTop: 12 }}
              refreshControl={<RefreshControl refreshing={authorsRefreshing} onRefresh={() => loadAuthors(true)} colors={[HOWARD_BLUE]} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.centerFill}><Text style={styles.emptyText}>No authors yet</Text></View>}
            />
          )
        ) : (
          <FlatList
            data={books}
            keyExtractor={(b) => b.id}
            numColumns={columns}
            renderItem={renderBook}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            refreshControl={
              <RefreshControl
                refreshing={booksRefreshing}
                onRefresh={() => loadAuthorBooks(selectedAuthor, 1, true)}
                colors={[HOWARD_BLUE]}
              />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              booksError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{booksError}</Text>
                  <TouchableOpacity onPress={() => selectedAuthor && loadAuthorBooks(selectedAuthor, 1, false)} style={styles.retryMiniBtn} activeOpacity={0.8}>
                    <Text style={styles.retryMiniBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            ListEmptyComponent={
              loadingBooks ? (
                <View style={styles.centerFill}><ActivityIndicator size="large" color={HOWARD_BLUE} /></View>
              ) : (
                <View style={styles.centerFill}><Text style={styles.emptyText}>No books for this author</Text></View>
              )
            }
            ListFooterComponent={
              loadingMoreBooks ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={HOWARD_BLUE} />
                  <Text style={styles.footerLoadingText}>Loading more…</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerRight: { width: 40 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748b', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#b91c1c', textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  retryBtn: { backgroundColor: HOWARD_BLUE, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 15, color: '#64748b' },
  authorRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  authorAvatarText: { fontSize: 14, fontWeight: '800' },
  authorTextWrap: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  authorMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  columnWrapper: { justifyContent: 'space-between' },
  cardCell: { marginBottom: 16 },
  listContent: { paddingHorizontal: CONTENT_PAD, paddingTop: 16 },
  footerLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
  footerLoadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  errorBanner: {
    marginHorizontal: CONTENT_PAD,
    marginTop: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#b91c1c' },
  retryMiniBtn: { backgroundColor: HOWARD_BLUE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  retryMiniBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

