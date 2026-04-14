import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  type AppStateStatus,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookReturnApiError,
  confirmReturnHandoff,
  fetchReturnActivity,
  formatReturnListLabel,
  getReturnPillColors,
  type BookReturnItem,
} from '@/src/services/bookReturns';
import type { DeliveryTaskItem } from '@/src/services/deliveryTasks';
import { getBook, type BookStatus } from '@/src/services/books';
import { buildReturnJourneyLines } from '@/src/features/returns/buildReturnJourneyLines';
import { ReturnJourneyTimeline } from '@/src/features/returns/returnJourneyTimeline';
import { useAuth } from '@/contexts/AuthContext';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';
const POLL_MS = 12_000;
const STUDENT_CONFIRM_MIN_MS = 5 * 60 * 1000;

function getStudentConfirmDeadlineMs(task: DeliveryTaskItem | null): number | null {
  if (!task?.completed_at) return null;
  if (task.student_confirm_deadline_at) {
    const d = new Date(task.student_confirm_deadline_at).getTime();
    if (!Number.isNaN(d)) return d;
  }
  const t = new Date(task.completed_at).getTime();
  if (Number.isNaN(t)) return null;
  return t + STUDENT_CONFIRM_MIN_MS;
}

function formatCountdownTo(ms: number): string {
  const left = Math.max(0, ms - Date.now());
  const totalSec = Math.floor(left / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatBookStatusLabel(status: BookStatus | null): string {
  if (!status) return '—';
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

export default function ReturnActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ret, setRet] = useState<BookReturnItem | null>(null);
  const [task, setTask] = useState<DeliveryTaskItem | null>(null);
  const [tasks, setTasks] = useState<DeliveryTaskItem[]>([]);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [bookStatus, setBookStatus] = useState<BookStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [, setNowTick] = useState(0);
  const { hasToken } = useAuth();
  const handoffPromptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    handoffPromptKeyRef.current = null;
  }, [id]);

  const outboundTask = tasks.find((t) => t.return_pickup_leg === 'outbound');
  const showConfirmBookOnRobot =
    !!ret && ret.status === 'AWAITING_STUDENT_LOAD' && outboundTask?.status === 'COMPLETED';
  const bookLoadDeadlineMs = outboundTask ? getStudentConfirmDeadlineMs(outboundTask) : null;
  const confirmBookWindowOpen =
    showConfirmBookOnRobot && bookLoadDeadlineMs != null && Date.now() < bookLoadDeadlineMs;

  const showConfirmLegacyHandoff =
    !!ret && ret.status === 'PICKED_UP' && task?.status === 'COMPLETED';
  const legacyDeadlineMs = task ? getStudentConfirmDeadlineMs(task) : null;
  const confirmLegacyWindowOpen =
    showConfirmLegacyHandoff && legacyDeadlineMs != null && Date.now() < legacyDeadlineMs;

  useEffect(() => {
    const needTick =
      (showConfirmBookOnRobot && bookLoadDeadlineMs != null) ||
      (showConfirmLegacyHandoff && legacyDeadlineMs != null);
    if (!needTick) return;
    const tickId = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(tickId);
  }, [
    showConfirmBookOnRobot,
    bookLoadDeadlineMs,
    showConfirmLegacyHandoff,
    legacyDeadlineMs,
  ]);

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing return');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const activity = await fetchReturnActivity(id);
      setRet(activity.ret);
      setTask(activity.task);
      setTasks(activity.tasks);
      try {
        const b = await getBook(activity.ret.book_id);
        setBookTitle(b.title);
        setBookStatus(b.status);
      } catch {
        setBookTitle(null);
        setBookStatus(null);
      }
    } catch (e) {
      const msg =
        e instanceof BookReturnApiError ? e.message : 'Could not load this return.';
      setError(msg);
      setRet(null);
      setTask(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let appState: AppStateStatus = AppState.currentState;
    const tick = () => {
      if (cancelled || appState !== 'active') return;
      void load();
    };
    const interval = setInterval(tick, POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      appState = next;
      if (next === 'active') tick();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [id, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onConfirmHandoff = useCallback(async () => {
    if (!id) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmReturnHandoff(id);
      await load();
    } catch (e) {
      const msg =
        e instanceof BookReturnApiError ? e.message : 'Could not confirm return.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  }, [id, load]);

  const onConfirmRef = useRef(onConfirmHandoff);
  onConfirmRef.current = onConfirmHandoff;

  useEffect(() => {
    if (loading || !ret) return;

    if (
      ret.status === 'AWAITING_STUDENT_LOAD' &&
      outboundTask?.status === 'COMPLETED' &&
      confirmBookWindowOpen
    ) {
      const key = `book-${outboundTask.id}`;
      if (handoffPromptKeyRef.current === key) return;
      handoffPromptKeyRef.current = key;
      Alert.alert(
        'Robot at pickup point (simulated)',
        'Place the book on the robot, then confirm here. You have about 5 minutes.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Book is on the robot',
            onPress: () => void onConfirmRef.current(),
          },
        ],
        { cancelable: true },
      );
      return;
    }

    if (ret.status === 'PICKED_UP' && task?.status === 'COMPLETED' && confirmLegacyWindowOpen) {
      const key = `legacy-${task.id}`;
      if (handoffPromptKeyRef.current === key) return;
      handoffPromptKeyRef.current = key;
      Alert.alert(
        'Robot arrived (simulated)',
        'Confirm that you handed the book to the robot. You have about 5 minutes.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'I handed in my book',
            onPress: () => void onConfirmRef.current(),
          },
        ],
        { cancelable: true },
      );
    }
  }, [
    loading,
    ret,
    task,
    outboundTask,
    confirmBookWindowOpen,
    confirmLegacyWindowOpen,
  ]);

  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  const lines = ret ? buildReturnJourneyLines(ret, tasks) : [];
  const summaryPillStyle = ret ? getReturnPillColors(ret) : { bg: '#e8f0fe', text: HOWARD_BLUE };
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
          Book return
        </Text>
        <View style={styles.topRight} />
      </View>

      {loading ? (
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

      {ret && !loading && !error ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 18 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HOWARD_BLUE} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>LUNA return</Text>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {bookTitle ?? 'Your book'}
            </Text>
            <View style={styles.summaryPillRow}>
              <View style={[styles.summaryPill, { backgroundColor: summaryPillStyle.bg }]}>
                <Text style={[styles.summaryPillText, { color: summaryPillStyle.text }]}>
                  {formatReturnListLabel(ret)}
                </Text>
              </View>
              <Text style={styles.summaryLocation} numberOfLines={1}>
                {ret.pickup_location}
              </Text>
            </View>
            <View style={styles.summaryBookStatusRow}>
              <Text style={styles.summaryBookStatusLabel}>Book in catalog</Text>
              <Text style={styles.summaryBookStatusValue}>{formatBookStatusLabel(bookStatus)}</Text>
            </View>
          </View>

          {showConfirmBookOnRobot && bookLoadDeadlineMs != null ? (
            <View style={styles.confirmUrgentBanner} accessibilityRole="alert">
              <FontAwesome name="clock-o" size={18} color={HOWARD_RED} />
              <View style={styles.confirmUrgentTextWrap}>
                <Text style={styles.confirmUrgentTitle}>Confirm book on robot</Text>
                <Text style={styles.confirmUrgentBody}>
                  {confirmBookWindowOpen
                    ? `You have ${formatCountdownTo(bookLoadDeadlineMs)} left to confirm the book is on the robot at ${ret.pickup_location}. Staff will then send it back to the desk.`
                    : 'The confirmation window has ended.'}
                </Text>
              </View>
            </View>
          ) : null}

          {showConfirmLegacyHandoff && legacyDeadlineMs != null ? (
            <View style={styles.confirmUrgentBanner} accessibilityRole="alert">
              <FontAwesome name="clock-o" size={18} color={HOWARD_RED} />
              <View style={styles.confirmUrgentTextWrap}>
                <Text style={styles.confirmUrgentTitle}>Confirm handoff</Text>
                <Text style={styles.confirmUrgentBody}>
                  {confirmLegacyWindowOpen
                    ? `You have ${formatCountdownTo(legacyDeadlineMs)} left to confirm you handed the book to the robot at ${ret.pickup_location}.`
                    : 'The confirmation window has ended.'}
                </Text>
              </View>
            </View>
          ) : null}

          {ret.status === 'AWAITING_ADMIN_CONFIRM' ? (
            <View style={styles.infoBanner}>
              <FontAwesome name="info-circle" size={18} color={HOWARD_BLUE} style={styles.infoBannerIcon} />
              <Text style={styles.infoBannerText}>
                Your book is back with staff. When the desk confirms receipt, this return will close and you will see a
                notification in the app.
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Return progress</Text>
          <View style={styles.timelineWrap}>
            <ReturnJourneyTimeline lines={lines} />
          </View>

          {showConfirmBookOnRobot ? (
            <TouchableOpacity
              style={[
                styles.primaryConfirmBtn,
                (confirming || !confirmBookWindowOpen) && styles.primaryConfirmBtnDisabled,
              ]}
              activeOpacity={0.88}
              disabled={confirming || !confirmBookWindowOpen}
              onPress={() => void onConfirmHandoff()}
            >
              <FontAwesome name="check-circle" size={18} color="#fff" style={styles.secondaryIcon} />
              <Text style={styles.primaryConfirmText}>
                {confirming
                  ? 'Saving…'
                  : confirmBookWindowOpen
                    ? 'Book is on the robot'
                    : 'Confirmation closed'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {showConfirmLegacyHandoff ? (
            <TouchableOpacity
              style={[
                styles.primaryConfirmBtn,
                (confirming || !confirmLegacyWindowOpen) && styles.primaryConfirmBtnDisabled,
              ]}
              activeOpacity={0.88}
              disabled={confirming || !confirmLegacyWindowOpen}
              onPress={() => void onConfirmHandoff()}
            >
              <FontAwesome name="check-circle" size={18} color="#fff" style={styles.secondaryIcon} />
              <Text style={styles.primaryConfirmText}>
                {confirming
                  ? 'Saving…'
                  : confirmLegacyWindowOpen
                    ? 'I handed in my book'
                    : 'Confirmation closed'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/book/${ret.book_id}`)}
          >
            <FontAwesome name="book" size={18} color={HOWARD_BLUE} style={styles.secondaryIcon} />
            <Text style={styles.secondaryBtnText}>View book details</Text>
            <FontAwesome name="chevron-right" size={12} color="#94a3b8" />
          </TouchableOpacity>
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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: HOWARD_RED,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  summaryPillRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  summaryPill: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 8,
  },
  summaryPillText: { fontSize: 12, fontWeight: '700', color: HOWARD_BLUE },
  summaryLocation: { flex: 1, minWidth: 120, fontSize: 14, color: '#64748b' },
  summaryBookStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
  },
  summaryBookStatusLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  summaryBookStatusValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  confirmUrgentBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: 'rgba(227, 24, 55, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  confirmUrgentTextWrap: { flex: 1 },
  confirmUrgentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  confirmUrgentBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#e8f0fe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  infoBannerIcon: { marginTop: 2 },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1e3a5f',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  timelineWrap: { marginBottom: 20 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryIcon: { marginRight: 10 },
  secondaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: HOWARD_BLUE,
  },
  primaryConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOWARD_BLUE,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  primaryConfirmBtnDisabled: { opacity: 0.65 },
  primaryConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
