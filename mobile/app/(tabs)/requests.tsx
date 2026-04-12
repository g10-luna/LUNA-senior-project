import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  AppState,
  type AppStateStatus,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookRequestApiError,
  formatRequestListLabel,
  getRequestPillColors,
  listMyBookRequests,
  type BookRequestItem,
} from '@/src/services/bookRequests';
import { getBook, type BookStatus } from '@/src/services/books';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const LIST_POLL_MS = 20_000;

function formatUpdatedLabel(iso: string | null): string {
  if (!iso) return 'Not loaded yet';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type BookSummary = { title: string; author: string; status: BookStatus };

async function loadBookSummaries(bookIds: string[]): Promise<Record<string, BookSummary>> {
  const unique = [...new Set(bookIds)];
  const results = await Promise.allSettled(unique.map((id) => getBook(id)));
  const map: Record<string, BookSummary> = {};
  results.forEach((r, i) => {
    const id = unique[i];
    if (r.status === 'fulfilled') {
      map[id] = { title: r.value.title, author: r.value.author, status: r.value.status };
    }
  });
  return map;
}

function formatBookStatusShort(status: BookStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'CHECKED_OUT':
      return 'Checked out';
    case 'RESERVED':
      return 'Reserved';
    case 'UNAVAILABLE':
      return 'Unavailable';
    default:
      return String(status);
  }
}

/**
 * Requests tab: book delivery requests with titles, status, and navigation to activity timeline.
 */
export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [items, setItems] = useState<BookRequestItem[]>([]);
  const [bookSummaries, setBookSummaries] = useState<Record<string, BookSummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshLocked = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const out = await listMyBookRequests({ limit: 50 });
      setItems(out.items);
      setLastUpdated(new Date().toISOString());

      const ids = out.items.map((r) => r.book_id);
      if (ids.length > 0) {
        setSummariesLoading(true);
        try {
          const summaries = await loadBookSummaries(ids);
          setBookSummaries(summaries);
        } finally {
          setSummariesLoading(false);
        }
      } else {
        setBookSummaries({});
      }
    } catch (e) {
      const msg =
        e instanceof BookRequestApiError
          ? e.message
          : 'Could not load requests. Check connection and API URL.';
      setLoadError(msg);
      setItems([]);
      setBookSummaries({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let appState: AppStateStatus = AppState.currentState;
      const run = () => {
        if (cancelled || appState !== 'active') return;
        void load();
      };
      run();
      const interval = setInterval(run, LIST_POLL_MS);
      const sub = AppState.addEventListener('change', (next) => {
        appState = next;
        if (next === 'active') run();
      });
      return () => {
        cancelled = true;
        clearInterval(interval);
        sub.remove();
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshLocked.current) return;
    refreshLocked.current = true;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
      refreshLocked.current = false;
    }
  }, [load]);

  const bottomPad = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;
  const topPad = Math.max(insets.top, 12) + 8;

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scrollInner, { paddingTop: topPad, paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HOWARD_BLUE} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <FontAwesome name="paper-plane-o" size={24} color="#fff" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroEyebrow}>LUNA delivery</Text>
              <Text style={styles.title}>Your requests</Text>
              <Text style={styles.sub}>
                Staff approve and prepare books for pickup. This list also refreshes automatically while you stay on
                this tab — pull down anytime for an immediate update.
              </Text>
            </View>
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={HOWARD_BLUE} style={styles.centerSpinner} />
        ) : null}

        {loadError ? (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={18} color="#b91c1c" />
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : null}

        {!loading && !loadError && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome name="inbox" size={32} color={HOWARD_BLUE} />
            </View>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySub}>
              Browse the catalog and tap <Text style={styles.emptyBold}>Request Book</Text> on any available title to start a delivery.
            </Text>
          </View>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>Your requests ({items.length})</Text>
            {summariesLoading ? <ActivityIndicator size="small" color={HOWARD_BLUE} /> : null}
          </View>
        ) : null}

        {items.map((req) => {
          const summary = bookSummaries[req.book_id];
          const pill = getRequestPillColors(req);
          return (
            <Pressable
              key={req.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/request/${req.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Delivery progress for ${summary?.title ?? 'request'}`}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {summary?.title ?? 'Book'}
                  </Text>
                  {summary ? (
                    <Text style={styles.cardAuthor} numberOfLines={1}>
                      {summary.author}
                    </Text>
                  ) : summariesLoading ? (
                    <Text style={styles.cardAuthorMuted}>Loading title…</Text>
                  ) : (
                    <Text style={styles.cardAuthorMuted}>Book ID {req.book_id.slice(0, 8)}…</Text>
                  )}
                </View>
                <View style={styles.cardRightCol}>
                  <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.statusPillText, { color: pill.text }]}>
                      {formatRequestListLabel(req)}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#cbd5e1" style={styles.cardChevron} />
                </View>
              </View>
              <View style={styles.cardRow}>
                <FontAwesome name="map-marker" size={14} color="#64748b" style={styles.cardRowIcon} />
                <Text style={styles.cardMeta}>{req.request_location}</Text>
              </View>
              <View style={styles.cardRow}>
                <FontAwesome name="clock-o" size={14} color="#94a3b8" style={styles.cardRowIcon} />
                <Text style={styles.cardMetaSmall}>
                  Requested {formatUpdatedLabel(req.requested_at)}
                </Text>
              </View>
              {summary ? (
                <View style={styles.cardRow}>
                  <FontAwesome name="book" size={14} color="#64748b" style={styles.cardRowIcon} />
                  <Text style={styles.cardMetaSmall}>
                    Book status: <Text style={styles.cardMetaEm}>{formatBookStatusShort(summary.status)}</Text>
                  </Text>
                </View>
              ) : null}
              <View style={styles.cardFooterHint}>
                <FontAwesome name="list-ul" size={12} color="#94a3b8" />
                <Text style={styles.cardHint}>View activity and delivery status</Text>
              </View>
            </Pressable>
          );
        })}

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/search')}
        >
          <FontAwesome name="search" size={18} color="#fff" style={styles.primaryBtnIcon} />
          <Text style={styles.primaryBtnText}>Find books</Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <FontAwesome name="clock-o" size={14} color="#94a3b8" style={styles.metaIcon} />
          <Text style={styles.metaText}>Last refreshed: {formatUpdatedLabel(lastUpdated)}</Text>
        </View>

        {refreshing ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={HOWARD_BLUE} />
            <Text style={styles.inlineLoadingText}>Updating…</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef2f7' },
  scrollInner: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingHorizontal: 18,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: HOWARD_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextCol: { flex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: HOWARD_RED,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  centerSpinner: { marginVertical: 24 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: HOWARD_BLUE, marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#64748b', textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  emptyBold: { fontWeight: '700', color: '#334155' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, color: '#991b1b', fontSize: 14, lineHeight: 20 },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listHeader: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8ecf1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { opacity: 0.94 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitleBlock: { flex: 1, marginRight: 10 },
  cardRightCol: { alignItems: 'flex-end' },
  cardChevron: { marginTop: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  cardAuthor: { fontSize: 14, color: '#64748b', marginTop: 4 },
  cardAuthorMuted: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardRowIcon: { marginRight: 8 },
  cardMeta: { fontSize: 14, color: '#475569', flex: 1 },
  cardMetaSmall: { fontSize: 12, color: '#94a3b8' },
  cardMetaEm: { fontWeight: '700', color: '#475569' },
  cardFooterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardHint: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginLeft: 6 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: HOWARD_BLUE,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: HOWARD_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnIcon: { marginRight: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  metaIcon: { marginRight: 6 },
  metaText: { fontSize: 13, color: '#94a3b8' },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  inlineLoadingText: { fontSize: 13, color: '#64748b', marginLeft: 8 },
});
