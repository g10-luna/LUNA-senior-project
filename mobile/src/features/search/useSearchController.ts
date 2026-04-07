import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BooksApiError,
  getBooks,
  getRandomBooks,
  getSearchSuggestions,
  type Book,
  type SearchSuggestion,
} from '@/src/services/books';
import { CATEGORIES, POPULAR_LIMIT, RECENT_MAX, SEARCH_PAGE_SIZE, SUGGEST_DEBOUNCE_MS } from './constants';

export type UseSearchController = ReturnType<typeof useSearchController>;

export function useSearchController() {
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
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPopularLoading(true);
    getRandomBooks(POPULAR_LIMIT)
      .then((books) => {
        if (!cancelled) setPopularBooks(books);
      })
      .catch(() => {
        if (!cancelled) setPopularBooks([]);
      })
      .finally(() => {
        if (!cancelled) setPopularLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      CATEGORIES.map((cat) =>
        getBooks({ q: cat.label, page: 1, limit: 1, sort: 'title', order: 'asc' })
          .then((res) => ({ label: cat.label, total: res.pagination?.total ?? 0 }))
          .catch(() => ({ label: cat.label, total: 0 }))
      )
    ).then((counts) => {
      if (cancelled) return;
      setCategoryCounts(
        counts.reduce<Record<string, number>>((acc, { label, total }) => {
          acc[label] = total;
          return acc;
        }, {})
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(
    async (q: string, pageNum: number = 1, isRefresh = false) => {
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
        const res = await getBooks({
          q: trimmed,
          page: pageNum,
          limit: SEARCH_PAGE_SIZE,
          sort: 'title',
          order: 'asc',
        });

        if (pageNum === 1) {
          setResults(res.items);
          setPage(2);
          setTotalPages(res.pagination?.total_pages ?? 1);
          setRecentSearches((prev) => [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, RECENT_MAX));
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
    },
    []
  );

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) runSearch(trimmed, 1);
  }, [query, runSearch]);

  const loadMore = useCallback(() => {
    if (!submittedQuery || loadingMore || page > totalPages) return;
    runSearch(submittedQuery, page);
  }, [submittedQuery, loadingMore, page, runSearch, totalPages]);

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

  const selectSuggestion = useCallback(
    (s: SearchSuggestion) => {
      setQuery(s.label);
      setSuggestions([]);
      runSearch(s.label, 1);
    },
    [runSearch]
  );

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

  return {
    query,
    setQuery,
    submittedQuery,
    results,
    page,
    totalPages,
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
    setSuggestions,
    setSubmittedQuery,
  };
}

