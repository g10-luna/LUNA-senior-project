import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import { CATEGORIES } from '@/src/features/search/constants';
import { useSearchController } from '@/src/features/search/useSearchController';
import { SearchHeader } from '@/src/features/search/components/SearchHeader';
import { SearchResultsList } from '@/src/features/search/components/SearchResultsList';
import { SearchDiscoverSections } from '@/src/features/search/components/SearchDiscoverSections';

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
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
        >
          <SearchDiscoverSections
            recentSearches={recentSearches}
            onClearHistory={clearSearchHistory}
            onRunSearch={(q) => runSearch(q, 1)}
            popularLoading={popularLoading}
            popularBooks={popularBooks}
            onPressBook={(bookId) => router.push(`/book/${bookId}`)}
            categories={CATEGORIES}
            categoryCounts={categoryCounts}
          />
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { flexGrow: 1 },
});
