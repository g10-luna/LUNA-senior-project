import React, { useCallback } from 'react';
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
import BookCard from '@/components/BookCard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type Book, type BookStatus } from '@/src/services/books';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import { CATEGORIES, HOWARD_BLUE, HOWARD_RED } from '@/src/features/search/constants';
import { useSearchController } from '@/src/features/search/useSearchController';
import { SearchHeader } from '@/src/features/search/components/SearchHeader';
import { SearchResultsList } from '@/src/features/search/components/SearchResultsList';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    query,
    setQuery,
    submittedQuery,
    results,
    loading,
    loadingMore,
    refreshing,
    error,
    recentSearches,
    suggestions,
    popularBooks,
    popularLoading,
    categoryCounts,
    runSearch,
    submit,
    loadMore,
    clearSearchHistory,
    selectSuggestion,
  } = useSearchController();

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    submit();
  }, [submit]);

  const showResults = Boolean(submittedQuery?.trim());
  const showDiscover = !showResults;
  const bottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <SearchHeader
        query={query}
        onChangeQuery={setQuery}
        onSubmit={handleSubmit}
        suggestions={suggestions}
        onPickSuggestion={selectSuggestion}
      />

      {showResults ? (
        <SearchResultsList
          submittedQuery={submittedQuery}
          results={results}
          loading={loading}
          loadingMore={loadingMore}
          refreshing={refreshing}
          error={error}
          recentSearches={recentSearches}
          bottomPadding={bottomPadding}
          onRetry={() => submittedQuery && runSearch(submittedQuery, 1)}
          onClearHistory={clearSearchHistory}
          onLoadMore={loadMore}
          onRefresh={() => submittedQuery && runSearch(submittedQuery, 1, true)}
          onPressBook={(bookId) => router.push(`/book/${bookId}`)}
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
                  <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                    <FontAwesome name={cat.icon} size={22} color={cat.color} />
                  </View>
                  <View style={styles.catTextWrap}>
                    <Text style={[styles.catLabel, { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
                    <Text style={styles.catSubtitle} numberOfLines={1}>{cat.subtitle}</Text>
                    <View style={styles.catDetailRow}>
                      <FontAwesome name="check" size={10} color="#22c55e" style={styles.catDetailIcon} />
                      <Text style={styles.catDetail} numberOfLines={1}>
                        {categoryCounts[cat.label] !== undefined
                          ? `${categoryCounts[cat.label]} ${categoryCounts[cat.label] === 1 ? 'book' : 'books'}`
                          : '…'}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={cat.color} style={styles.catArrow} />
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
  body: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  clearHistoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearHistoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTextWrap: { flex: 1, minWidth: 0 },
  catLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  catSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  catDetailRow: { flexDirection: 'row', alignItems: 'center' },
  catDetailIcon: { marginRight: 4 },
  catDetail: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  catArrow: { marginLeft: 4 },
  listContent: { flexGrow: 1 },
});
