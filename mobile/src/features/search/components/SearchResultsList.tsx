import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Book } from '@/src/services/books';
import { HOWARD_BLUE } from '../constants';
import { SearchBookRow } from './SearchRow';

export function SearchResultsList({
  submittedQuery,
  results,
  loading,
  loadingMore,
  refreshing,
  error,
  recentSearches,
  bottomPadding,
  onRetry,
  onClearHistory,
  onLoadMore,
  onRefresh,
  onPressBook,
}: {
  submittedQuery: string | null;
  results: Book[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  recentSearches: string[];
  bottomPadding: number;
  onRetry: () => void;
  onClearHistory: () => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onPressBook: (bookId: string) => void;
}) {
  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SearchBookRow book={item} onPress={() => onPressBook(item.id)} />}
      ListHeaderComponent={
        <>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRetry}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {recentSearches.length > 0 ? (
            <View style={styles.resultsClearHistoryRow}>
              <TouchableOpacity
                onPress={onClearHistory}
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
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[HOWARD_BLUE]} />
      }
      contentContainerStyle={results.length === 0 && !loading ? styles.listContent : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
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
  resultsClearHistoryRow: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  resultsClearHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultsClearHistoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: { fontSize: 14, color: '#64748b' },
  listContent: { flexGrow: 1 },
  footerPad: {},
});

