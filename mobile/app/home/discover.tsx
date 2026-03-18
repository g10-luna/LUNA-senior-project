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
  getRandomBooks,
  type Book,
  BooksApiError,
} from '@/src/services/books';

const HOWARD_BLUE = '#003A63';
const HOWARD_ORANGE = '#f59e0b';
const CONTENT_PAD = 20;
const CARD_GAP = 12;
const PAGE_SIZE = 24;

export default function DiscoverListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { width } = Dimensions.get('window');
  const columns = 2;
  const cardWidth = (width - CONTENT_PAD * 2 - CARD_GAP) / columns;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandom = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const items = await getRandomBooks(PAGE_SIZE);
      setBooks(items);
    } catch (e) {
      const msg = e instanceof BooksApiError ? e.message : 'Could not load Discover';
      setError(msg);
      setBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRandom(false);
  }, [fetchRandom]);

  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12} activeOpacity={0.8}>
        <FontAwesome name="arrow-left" size={22} color={HOWARD_BLUE} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSub}>Random picks from the catalog</Text>
      </View>
      <View style={styles.headerRight} />
    </View>
  );

  const renderBook = ({ item }: { item: Book }) => (
    <View style={[styles.cardCell, { width: cardWidth }]}>
      <BookCard
        book={item}
        accentColor={HOWARD_ORANGE}
        cardWidth={cardWidth}
        onPress={() => router.push(`/book/${item.id}`)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {header}
        {error ? (
          <View style={styles.centerFill}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchRandom(false)} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={HOWARD_BLUE} />
            <Text style={styles.loadingText}>Loading Discover…</Text>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(b) => b.id}
            numColumns={columns}
            renderItem={renderBook}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomPadding },
              books.length === 0 ? { flexGrow: 1 } : null,
            ]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRandom(true)} colors={[HOWARD_BLUE]} />}
            ListEmptyComponent={
              <View style={styles.centerFill}>
                <Text style={styles.emptyText}>No books found</Text>
              </View>
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
  emptyText: { fontSize: 15, color: '#64748b' },
});

