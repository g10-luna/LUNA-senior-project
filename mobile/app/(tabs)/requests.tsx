import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Modal,
  AppState,
  useWindowDimensions,
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
import {
  formatReturnListLabel,
  getReturnPillColors,
  listMyBookReturns,
  type BookReturnItem,
} from '@/src/services/bookReturns';
import { getBook, type BookStatus } from '@/src/services/books';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const LIST_POLL_MS = 20_000;
const ADD_MENU_MAX_WIDTH = 300;
const ADD_MENU_GAP = 8;
/** Rough height for flip-above logic when near bottom */
const ADD_MENU_EST_HEIGHT = 268;

type AddMenuAnchor = { top: number; left: number; width: number; height: number };

function computeAddMenuPopover(
  anchor: AddMenuAnchor,
  windowWidth: number,
  windowHeight: number,
  bottomSafeReserve: number,
): { top: number; left: number; width: number } {
  const menuWidth = Math.min(ADD_MENU_MAX_WIDTH, windowWidth - 24);
  let left = anchor.left + anchor.width - menuWidth;
  left = Math.max(12, Math.min(left, windowWidth - menuWidth - 12));
  let top = anchor.top + anchor.height + ADD_MENU_GAP;
  if (top + ADD_MENU_EST_HEIGHT > windowHeight - bottomSafeReserve) {
    top = anchor.top - ADD_MENU_EST_HEIGHT - ADD_MENU_GAP;
    if (top < 12) top = 12;
  }
  return { top, left, width: menuWidth };
}
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

type MergedRow =
  | { kind: 'pickup'; item: BookRequestItem; sort: number }
  | { kind: 'return'; item: BookReturnItem; sort: number };

/**
 * Requests tab: pickup + book returns with navigation to activity timelines.
 */
export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [items, setItems] = useState<BookRequestItem[]>([]);
  const [returnItems, setReturnItems] = useState<BookReturnItem[]>([]);
  const [bookSummaries, setBookSummaries] = useState<Record<string, BookSummary>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<AddMenuAnchor | null>(null);
  const addMenuBtnRef = useRef<View>(null);
  const refreshLocked = useRef(false);

  const mergedRows = useMemo((): MergedRow[] => {
    const pickups: MergedRow[] = items.map((item) => ({
      kind: 'pickup' as const,
      item,
      sort: new Date(item.requested_at).getTime(),
    }));
    const returns: MergedRow[] = returnItems.map((item) => ({
      kind: 'return' as const,
      item,
      sort: new Date(item.initiated_at).getTime(),
    }));
    return [...pickups, ...returns].sort((a, b) => b.sort - a.sort);
  }, [items, returnItems]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const out = await listMyBookRequests({ limit: 50 });
      setItems(out.items);

      let ret: BookReturnItem[] = [];
      try {
        const rout = await listMyBookReturns({ limit: 50 });
        ret = rout.items;
      } catch {
        ret = [];
      }
      setReturnItems(ret);
      setLastUpdated(new Date().toISOString());

      const ids = [...new Set([...out.items.map((r) => r.book_id), ...ret.map((r) => r.book_id)])];
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
      setReturnItems([]);
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

  const closeAddMenu = useCallback(() => {
    setAddMenuOpen(false);
    setAddMenuAnchor(null);
  }, []);

  const openAddMenu = useCallback(() => {
    addMenuBtnRef.current?.measureInWindow((x, y, width, height) => {
      setAddMenuAnchor({ top: y, left: x, width, height });
      setAddMenuOpen(true);
    });
  }, []);

  const goRequestPickup = useCallback(() => {
    closeAddMenu();
    router.push('/(tabs)/search');
  }, [router, closeAddMenu]);

  const goReturnBook = useCallback(() => {
    closeAddMenu();
    router.push('/return' as any);
  }, [router, closeAddMenu]);

  const addMenuPopoverLayout =
    addMenuAnchor != null
      ? computeAddMenuPopover(
          addMenuAnchor,
          windowWidth,
          windowHeight,
          BOTTOM_TAB_BAR_HEIGHT + insets.bottom + 8,
        )
      : null;

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
          <View ref={addMenuBtnRef} collapsable={false} style={styles.heroAddBtnHitArea}>
            <TouchableOpacity
              style={styles.heroAddBtn}
              activeOpacity={0.75}
              onPress={openAddMenu}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Add — request pickup or return a book"
            >
              <FontAwesome name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <FontAwesome name="paper-plane-o" size={24} color="#fff" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroEyebrow}>LUNA delivery</Text>
              <Text style={styles.title}>Your requests</Text>
              <Text style={styles.sub}>
                Pickup requests and book returns appear here. Tap <Text style={styles.subEm}>+</Text> to request pickup or start a return.
                Staff approve, the robot run is simulated, then you confirm handoff. Pull down to refresh.
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

        {!loading && !loadError && mergedRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome name="inbox" size={32} color={HOWARD_BLUE} />
            </View>
            <Text style={styles.emptyTitle}>No delivery activity yet</Text>
            <Text style={styles.emptySub}>
              Tap <Text style={styles.emptyBold}>+</Text> at the top to <Text style={styles.emptyBold}>request pickup</Text> (browse the catalog)
              or <Text style={styles.emptyBold}>return a book</Text> (choose from books we have checked out to you).
            </Text>
          </View>
        ) : null}

        {mergedRows.length > 0 ? (
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>Your activity ({mergedRows.length})</Text>
            {summariesLoading ? <ActivityIndicator size="small" color={HOWARD_BLUE} /> : null}
          </View>
        ) : null}

        {mergedRows.map((row) => {
          if (row.kind === 'pickup') {
            const req = row.item;
            const summary = bookSummaries[req.book_id];
            const pill = getRequestPillColors(req);
            return (
              <Pressable
                key={`p-${req.id}`}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/request/${req.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Pickup: ${summary?.title ?? 'request'}`}
              >
                <View style={styles.kindBadgeRow}>
                  <View style={styles.kindBadgePickup}>
                    <Text style={styles.kindBadgeText}>Pickup</Text>
                  </View>
                </View>
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
                  <Text style={styles.cardMetaSmall}>Requested {formatUpdatedLabel(req.requested_at)}</Text>
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
                  <Text style={styles.cardHint}>View pickup activity</Text>
                </View>
              </Pressable>
            );
          }
          const req = row.item;
          const summary = bookSummaries[req.book_id];
          const pill = getReturnPillColors(req);
          return (
            <Pressable
              key={`r-${req.id}`}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/return/${req.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`Return: ${summary?.title ?? 'book'}`}
            >
              <View style={styles.kindBadgeRow}>
                <View style={styles.kindBadgeReturn}>
                  <Text style={styles.kindBadgeText}>Return</Text>
                </View>
              </View>
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
                    <Text style={[styles.statusPillText, { color: pill.text }]}>{formatReturnListLabel(req)}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#cbd5e1" style={styles.cardChevron} />
                </View>
              </View>
              <View style={styles.cardRow}>
                <FontAwesome name="map-marker" size={14} color="#64748b" style={styles.cardRowIcon} />
                <Text style={styles.cardMeta}>{req.pickup_location}</Text>
              </View>
              <View style={styles.cardRow}>
                <FontAwesome name="clock-o" size={14} color="#94a3b8" style={styles.cardRowIcon} />
                <Text style={styles.cardMetaSmall}>Started {formatUpdatedLabel(req.initiated_at)}</Text>
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
                <Text style={styles.cardHint}>View return activity</Text>
              </View>
            </Pressable>
          );
        })}

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

      <Modal
        visible={addMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAddMenu}
      >
        <View style={styles.addMenuRoot}>
          <Pressable style={styles.addMenuBackdrop} onPress={closeAddMenu} />
          {addMenuPopoverLayout ? (
            <View
              style={[
                styles.addMenuPopover,
                {
                  top: addMenuPopoverLayout.top,
                  left: addMenuPopoverLayout.left,
                  width: addMenuPopoverLayout.width,
                },
              ]}
            >
              <View style={styles.addMenuSheet}>
                <Text style={styles.addMenuTitle}>Start something new</Text>
                <TouchableOpacity
                  style={styles.addMenuRow}
                  activeOpacity={0.85}
                  onPress={goRequestPickup}
                  accessibilityRole="button"
                  accessibilityLabel="Request pickup — browse catalog for available books"
                >
                  <View style={[styles.addMenuIconWrap, styles.addMenuIconPickup]}>
                    <FontAwesome name="hand-o-right" size={20} color={HOWARD_BLUE} />
                  </View>
                  <View style={styles.addMenuTextCol}>
                    <Text style={styles.addMenuRowTitle}>Request pickup</Text>
                    <Text style={styles.addMenuRowSub}>Find an available book and have it delivered to you</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="#cbd5e1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addMenuRow, styles.addMenuRowDivider]}
                  activeOpacity={0.85}
                  onPress={goReturnBook}
                  accessibilityRole="button"
                  accessibilityLabel="Return a book — books checked out to you"
                >
                  <View style={[styles.addMenuIconWrap, styles.addMenuIconReturn]}>
                    <FontAwesome name="reply" size={20} color="#b45309" />
                  </View>
                  <View style={styles.addMenuTextCol}>
                    <Text style={styles.addMenuRowTitle}>Return a book</Text>
                    <Text style={styles.addMenuRowSub}>
                      Pick from books we delivered to you, then tap Return book on the book page
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="#cbd5e1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMenuCancel}
                  onPress={closeAddMenu}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.addMenuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
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
    position: 'relative',
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
  heroAddBtnHitArea: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
  },
  heroAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: HOWARD_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: HOWARD_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 5,
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
  kindBadgeRow: { marginBottom: 8 },
  kindBadgePickup: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kindBadgeReturn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kindBadgeText: { fontSize: 11, fontWeight: '800', color: '#334155', letterSpacing: 0.6 },
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
  subEm: { fontWeight: '800', color: HOWARD_BLUE },
  addMenuRoot: { flex: 1 },
  addMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  addMenuPopover: {
    position: 'absolute',
    zIndex: 2,
  },
  addMenuSheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  addMenuTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 6,
  },
  addMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  addMenuRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
    paddingTop: 16,
  },
  addMenuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMenuIconPickup: { backgroundColor: '#e8f0fe' },
  addMenuIconReturn: { backgroundColor: '#fef3c7' },
  addMenuTextCol: { flex: 1, minWidth: 0 },
  addMenuRowTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addMenuRowSub: { fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 18 },
  addMenuCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  addMenuCancelText: { fontSize: 16, fontWeight: '600', color: HOWARD_BLUE },
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
