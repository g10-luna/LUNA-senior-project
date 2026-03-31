import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import BottomTabBar, { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookRequestApiError,
  formatRequestStatus,
  listMyBookRequests,
  type BookRequestItem,
} from '@/src/services/bookRequests';

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

/**
 * Requests tab: lists book delivery requests from GET /api/v1/requests/ (FS-04).
 */
export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [items, setItems] = useState<BookRequestItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshLocked = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const out = await listMyBookRequests({ limit: 50 });
      setItems(out.items);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      const msg =
        e instanceof BookRequestApiError
          ? e.message
          : 'Could not load requests. Check connection and API URL.';
      setLoadError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#003A63" />
        }
      >
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.sub}>
          Track robot delivery requests. Staff approves and prepares your book; status updates here after
          refresh.
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#003A63" style={{ marginVertical: 24 }} />
        ) : null}

        {loadError ? (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={18} color="#b91c1c" />
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : null}

        {!loading && !loadError && items.length === 0 ? (
          <View style={styles.emptyBlock}>
            <FontAwesome name="inbox" size={48} color="#cbd5e1" style={styles.icon} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySub}>Search for a book and tap Request Book to start a delivery.</Text>
          </View>
        ) : null}

        {items.map((req) => (
          <View key={req.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Book · {req.book_id.slice(0, 8)}…</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{formatRequestStatus(req.status)}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>Deliver to: {req.request_location}</Text>
            <Text style={styles.cardMetaSmall}>
              Requested {formatUpdatedLabel(req.requested_at)}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/search')}
        >
          <FontAwesome name="search" size={16} color="#fff" style={styles.primaryBtnIcon} />
          <Text style={styles.primaryBtnText}>Find books</Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <FontAwesome name="clock-o" size={14} color="#94a3b8" style={styles.metaIcon} />
          <Text style={styles.metaText}>Last refreshed: {formatUpdatedLabel(lastUpdated)}</Text>
        </View>

        {refreshing && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color="#003A63" />
            <Text style={styles.inlineLoadingText}>Updating…</Text>
          </View>
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  scrollInner: {
    flexGrow: 1,
    alignItems: 'stretch',
    padding: 24,
    paddingTop: 48,
  },
  icon: { marginBottom: 16, alignSelf: 'center' },
  emptyBlock: { alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#334155', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 320, lineHeight: 20 },
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', flex: 1 },
  statusPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '600', color: '#0369a1' },
  cardMeta: { fontSize: 14, color: '#475569', marginBottom: 4 },
  cardMetaSmall: { fontSize: 12, color: '#94a3b8' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
    alignSelf: 'center',
  },
  sub: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
    alignSelf: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#003A63',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  primaryBtnIcon: { marginRight: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { marginRight: 6 },
  metaText: { fontSize: 13, color: '#94a3b8' },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  inlineLoadingText: { fontSize: 13, color: '#64748b', marginLeft: 8 },
});
