import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookReturnApiError, listReturnableBooks } from '@/src/services/bookReturns';
import type { Book } from '@/src/services/books';
import { SearchBookRow } from '@/src/features/search/components/SearchRow';
import { useAuth } from '@/contexts/AuthContext';

const HOWARD_BLUE = '#003A63';

export default function ReturnableBooksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasToken } = useAuth();
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { items: next } = await listReturnableBooks();
      setItems(next);
    } catch (e) {
      const msg =
        e instanceof BookReturnApiError ? e.message : 'Could not load returnable books.';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  const bottomPad = 28 + insets.bottom;

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome name="arrow-left" size={22} color={HOWARD_BLUE} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Return a book
        </Text>
        <View style={styles.topRight} />
      </View>

      <Text style={[styles.lead, { paddingHorizontal: 18 }]}>
        These are titles we have on record as checked out to you after a completed delivery. Tap a book to
        review the return steps, choose a pickup spot, and submit your return request.
      </Text>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={HOWARD_BLUE} />
        </View>
      ) : null}

      {error && !loading ? (
        <View style={styles.centerBox}>
          <FontAwesome name="exclamation-circle" size={40} color="#94a3b8" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: bottomPad }]}>
          <View style={styles.emptyIconCircle}>
            <FontAwesome name="reply" size={28} color={HOWARD_BLUE} />
          </View>
          <Text style={styles.emptyTitle}>No books to return right now</Text>
          <Text style={styles.emptySub}>
            After staff completes a pickup delivery and you confirm you received the book, it will show up
            here so you can start a return.
          </Text>
        </View>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HOWARD_BLUE} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>Your checked-out books ({items.length})</Text>
          </View>
          <View style={styles.listCard}>
            {items.map((book) => (
              <SearchBookRow
                key={book.id}
                book={book}
                onPress={() => router.push(`/return/start/${book.id}` as any)}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef2f7' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: '#eef2f7',
  },
  backBtn: { padding: 10, width: 44 },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  topRight: { width: 44 },
  lead: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 14,
  },
  leadEm: { fontWeight: '700', color: '#0f172a' },
  scroll: { flex: 1 },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: HOWARD_BLUE,
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  listHeaderRow: { paddingHorizontal: 18, marginBottom: 8 },
  listHeader: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  listCard: {
    marginHorizontal: 18,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
