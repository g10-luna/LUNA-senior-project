import React, { useCallback, useEffect, useState } from 'react';
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
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import BottomTabBar, { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import BookCard from '@/components/BookCard';
import { getBooks, type Book, BooksApiError } from '@/src/services/books';

const HOWARD_BLUE = '#003A63';
const HOWARD_GREEN = '#16a34a';
const CONTENT_PAD = 20;
const CARD_GAP = 12;
const PAGE_SIZE = 20;

export default function AvailableNowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasToken } = useAuth();
  const { width } = Dimensions.get('window');
  const columns = 2;
  const cardWidth = (width - CONTENT_PAD * 2 - CARD_GAP) / columns;

  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  const loadPage = useCallback(async (pageNum: number, isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await getBooks({
        page: pageNum,
        limit: PAGE_SIZE,
        status: 'AVAILABLE',
        sort: 'title',
        order: 'asc',
      });
      if (pageNum === 1) setBooks(res.items);
      else setBooks((prev) => [...prev, ...res.items]);
      setTotalPages(res.pagination?.total_pages ?? 1);
      setPage(pageNum);
    } catch (e) {
      const msg = e instanceof BooksApiError ? e.message : 'Could not load available books';
      setError(msg);
      if (pageNum === 1) setBooks([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const canLoadMore = page < totalPages && !loadingMore;

  const onEndReached = () => {
    if (!canLoadMore) return;
    loadPage(page + 1, false);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12} activeOpacity={0.8}>
        <FontAwesome name="arrow-left" size={22} color={HOWARD_BLUE} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>Available Now</Text>
        <Text style={styles.headerSub}>Ready to be requested</Text>
      </View>
      <View style={styles.headerRight} />
    </View>
  );

  const renderBook = ({ item }: { item: Book }) => (
    <View style={[styles.cardCell, { width: cardWidth }]}>
      <BookCard
        book={item}
        accentColor={HOWARD_GREEN}
        cardWidth={cardWidth}
        onPress={() => router.push(`/book/${item.id}`)}
      />
    </View>
  );

  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  return (
    <View style={styles.container}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header}
        {error ? (
          <View style={styles.centerFill}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadPage(1, false)} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={HOWARD_BLUE} />
            <Text style={styles.loadingText}>Loading Available Now…</Text>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(b) => b.id}
            numColumns={columns}
            renderItem={renderBook}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPage(1, true)} colors={[HOWARD_BLUE]} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={HOWARD_BLUE} />
                  <Text style={styles.footerLoadingText}>Loading more…</Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
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
  listContent: { paddingHorizontal: CONTENT_PAD, paddingTop: 16 },
  columnWrapper: { justifyContent: 'space-between' },
  cardCell: { marginBottom: 16 },
  footerLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
  footerLoadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
});

