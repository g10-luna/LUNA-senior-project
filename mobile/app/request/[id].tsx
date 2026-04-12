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
  BookRequestApiError,
  confirmDeliveryReceipt,
  fetchRequestActivity,
  formatRequestListLabel,
  getRequestPillColors,
  type BookRequestItem,
} from '@/src/services/bookRequests';
import type { DeliveryTaskItem, TaskStatusEventItem } from '@/src/services/deliveryTasks';
import { getBook, type BookStatus } from '@/src/services/books';
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

function taskDeliveryEtaIso(task: DeliveryTaskItem): string | null | undefined {
  return task.delivery_eta_at ?? task.simulated_eta_at ?? null;
}

/** User-facing line e.g. "ETA Dec 5, 3:45 PM" — not a countdown. */
function formatDeliveryEtaLine(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = formatWhen(iso);
  return t ? `ETA ${t}` : null;
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

type LineState = 'complete' | 'active' | 'upcoming' | 'issue';

interface ActivityLine {
  key: string;
  title: string;
  subtitle?: string;
  timeLabel: string | null;
  state: LineState;
}

function historyEventCopy(ev: TaskStatusEventItem): { title: string; subtitle?: string } {
  const r = ev.reason ?? '';
  if (r === 'robot_run_started' || r === 'simulated_robot_started') {
    return {
      title: 'Pickup in progress',
      subtitle: 'Robot run started — pickup and delivery underway.',
    };
  }
  if (r === 'robot_run_complete' || r === 'simulated_robot_complete') {
    return {
      title: 'Robot run finished',
      subtitle: 'Your book should be at the pickup location.',
    };
  }
  if (r === 'task_created') {
    return {
      title: 'Pickup task created',
      subtitle: 'Library staff opened fulfillment for your book.',
    };
  }
  if (r === 'book_placed') {
    return {
      title: 'Book ready in queue',
      subtitle: 'Confirmed on shelf — entering the robot queue.',
    };
  }
  switch (ev.new_status) {
    case 'IN_PROGRESS':
      return {
        title: 'Robot en route',
        subtitle: 'The robot is moving your book toward pickup.',
      };
    case 'COMPLETED':
      return {
        title: 'Delivered to pickup point',
        subtitle: 'Your book should be at the desk you selected.',
      };
    case 'QUEUED':
      return {
        title: 'Queued for robot',
        subtitle: 'Waiting for the next delivery run.',
      };
    case 'ASSIGNED':
      return {
        title: 'Robot assigned',
        subtitle: 'A robot is linked to this delivery.',
      };
    case 'PENDING':
      return {
        title: 'Pickup task pending',
        subtitle: 'Staff are preparing this job.',
      };
    case 'FAILED':
      return {
        title: 'Delivery issue',
        subtitle: 'Something went wrong during the run. Ask staff for help.',
      };
    case 'CANCELLED':
      return {
        title: 'Delivery run cancelled',
        subtitle: 'This robot run was cancelled. Talk to the desk if you still need the book.',
      };
    default:
      return {
        title: `Status update: ${ev.new_status}`,
        subtitle: ev.reason ?? undefined,
      };
  }
}

function syntheticTaskLines(task: DeliveryTaskItem): ActivityLine[] {
  const lines: ActivityLine[] = [
    {
      key: 'task_created',
      title: 'Pickup task opened',
      subtitle: `${task.source_location} → ${task.destination_location}`,
      timeLabel: formatWhen(task.created_at),
      state: 'complete',
    },
  ];

  if (!task.book_placed) {
    lines.push({
      key: 'book_prep',
      title: 'Staff preparing your book',
      subtitle: 'The book is being fetched and confirmed for robot pickup.',
      timeLabel: null,
      state: 'active',
    });
  } else {
    lines.push({
      key: 'book_placed',
      title: 'Book confirmed for robot pickup',
      subtitle: 'Your title is ready for the delivery run.',
      timeLabel: formatWhen(task.book_placed_at ?? undefined),
      state: 'complete',
    });
  }

  const robotIssue = task.status === 'FAILED' || task.status === 'CANCELLED';
  const robotDone = task.status === 'COMPLETED';

  if (robotIssue) {
    lines.push({
      key: 'robot_issue',
      title: task.status === 'FAILED' ? 'Delivery run failed' : 'Delivery run cancelled',
      subtitle: 'Talk to desk staff if you still need this book.',
      timeLabel: formatWhen(task.completed_at ?? undefined),
      state: 'issue',
    });
  } else if (robotDone) {
    lines.push({
      key: 'robot_done',
      title: 'Dropped off at pickup point',
      subtitle: `Pickup: ${task.destination_location}`,
      timeLabel: formatWhen(task.completed_at ?? undefined),
      state: 'complete',
    });
  } else if (task.status === 'IN_PROGRESS') {
    const etaLine = formatDeliveryEtaLine(taskDeliveryEtaIso(task));
    lines.push({
      key: 'robot_transit',
      title: 'Pickup in progress',
      subtitle: etaLine
        ? `${etaLine} for this delivery run.`
        : 'An ETA will show here when the run is scheduled.',
      timeLabel: formatWhen(task.started_at ?? undefined),
      state: 'active',
    });
  } else if (task.status === 'ASSIGNED') {
    lines.push({
      key: 'robot_assigned',
      title: 'Robot assigned',
      subtitle: 'A robot is assigned to your delivery.',
      timeLabel: null,
      state: 'active',
    });
  } else if (task.status === 'QUEUED') {
    lines.push({
      key: 'robot_queued',
      title: 'In line for robot pickup',
      subtitle: 'Your delivery is queued for the next available run.',
      timeLabel: null,
      state: 'active',
    });
  } else {
    lines.push({
      key: 'robot_pending',
      title: 'Waiting for robot queue',
      subtitle: 'Staff will release this job when the book is ready.',
      timeLabel: null,
      state: task.book_placed ? 'active' : 'upcoming',
    });
  }

  return lines;
}

function buildActivityLines(req: BookRequestItem, task: DeliveryTaskItem | null): ActivityLine[] {
  const lines: ActivityLine[] = [];

  lines.push({
    key: 'submitted',
    title: 'Request sent to library',
    subtitle: 'We notified staff about your delivery request.',
    timeLabel: formatWhen(req.requested_at),
    state: 'complete',
  });

  if (req.status === 'CANCELLED') {
    lines.push({
      key: 'cancelled',
      title: 'Request cancelled',
      subtitle: 'This delivery request is no longer active.',
      timeLabel: formatWhen(req.completed_at ?? undefined),
      state: 'issue',
    });
    return lines;
  }

  if (req.status === 'PENDING') {
    lines.push({
      key: 'approval',
      title: 'Waiting for staff approval',
      subtitle: 'A librarian will review and approve your request.',
      timeLabel: null,
      state: 'active',
    });
    lines.push({
      key: 'robot_future',
      title: 'Robot pickup',
      subtitle: 'Updates appear here automatically as your delivery moves along.',
      timeLabel: null,
      state: 'upcoming',
    });
    return lines;
  }

  lines.push({
    key: 'approved',
    title: 'Staff approved your request',
    subtitle: 'Your title is cleared for pickup preparation.',
    timeLabel: formatWhen(req.approved_at ?? undefined),
    state: 'complete',
  });

  if (req.status === 'APPROVED' && !task) {
    lines.push({
      key: 'pre_pickup',
      title: 'Pickup not started yet',
      subtitle: 'Staff will create a robot pickup when the book is ready.',
      timeLabel: null,
      state: 'active',
    });
    lines.push({
      key: 'live_hint',
      title: 'Live updates',
      subtitle: 'This screen refreshes while it is open — no need to pull to refresh.',
      timeLabel: null,
      state: 'upcoming',
    });
    return lines;
  }

  if (task) {
    const history = task.status_history ?? [];
    if (history.length > 0) {
      const taskTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status);
      for (let i = 0; i < history.length; i++) {
        const ev = history[i];
        const isLast = i === history.length - 1;
        const { title, subtitle } = historyEventCopy(ev);
        let state: LineState = 'complete';
        if (isLast) {
          if (taskTerminal) {
            state =
              ev.new_status === 'FAILED' || ev.new_status === 'CANCELLED' ? 'issue' : 'complete';
          } else {
            state = 'active';
          }
        }
        lines.push({
          key: `ev-${ev.id}`,
          title,
          subtitle,
          timeLabel: formatWhen(ev.changed_at),
          state,
        });
      }

      if (['QUEUED', 'ASSIGNED', 'PENDING'].includes(task.status) && !taskTerminal) {
        lines.push({
          key: 'eta',
          title: 'Estimated arrival',
          subtitle: 'ETAs will show when the robot stack provides them.',
          timeLabel: null,
          state: 'upcoming',
        });
      } else if (task.status === 'IN_PROGRESS' && !taskTerminal) {
        const etaLine = formatDeliveryEtaLine(taskDeliveryEtaIso(task));
        lines.push({
          key: 'eta-ip',
          title: etaLine ? 'Delivery ETA' : 'Estimated arrival',
          subtitle: etaLine
            ? `${etaLine} for this delivery run.`
            : 'Not available yet — ask the desk for a rough time.',
          timeLabel: null,
          state: 'upcoming',
        });
      }
    } else {
      lines.push(...syntheticTaskLines(task));
      if (
        ['QUEUED', 'ASSIGNED', 'PENDING', 'IN_PROGRESS'].includes(task.status) &&
        !['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)
      ) {
        lines.push({
          key: 'eta-sync',
          title: 'Estimated arrival',
          subtitle: 'ETAs will show when the robot stack provides them.',
          timeLabel: null,
          state: 'upcoming',
        });
      }
    }
  }

  if (req.status === 'COMPLETED') {
    if (req.student_confirmed_at) {
      lines.push({
        key: 'done',
        title: 'You confirmed pickup',
        subtitle: 'Thanks — staff can send the robot on its next run.',
        timeLabel: formatWhen(req.student_confirmed_at),
        state: 'complete',
      });
    } else if (req.auto_closed_without_confirm_at) {
      lines.push({
        key: 'done',
        title: 'Request closed',
        subtitle: 'You did not confirm in time. The robot returned to staff.',
        timeLabel: formatWhen(req.auto_closed_without_confirm_at),
        state: 'issue',
      });
    } else {
      lines.push({
        key: 'done',
        title: 'Request completed',
        subtitle: 'This delivery request is closed.',
        timeLabel: formatWhen(req.completed_at ?? undefined),
        state: 'complete',
      });
    }
  } else if (req.status === 'IN_PROGRESS' && task && task.status === 'COMPLETED') {
    lines.push({
      key: 'handoff',
      title: 'Pick up your book',
      subtitle: 'Robot handoff is complete. Confirm below once you have the book.',
      timeLabel: formatWhen(task.completed_at ?? undefined),
      state: 'active',
    });
  }

  return lines;
}

export default function RequestActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<BookRequestItem | null>(null);
  const [task, setTask] = useState<DeliveryTaskItem | null>(null);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [bookStatus, setBookStatus] = useState<BookStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [, setNowTick] = useState(0);
  const { hasToken } = useAuth();
  /** Avoid showing the same delivery-complete alert on every poll. */
  const deliveryPromptShownKeyRef = useRef<string | null>(null);

  useEffect(() => {
    deliveryPromptShownKeyRef.current = null;
  }, [id]);

  const showConfirmDelivery =
    !!request &&
    request.status === 'IN_PROGRESS' &&
    task?.status === 'COMPLETED';

  const confirmDeadlineMs = task ? getStudentConfirmDeadlineMs(task) : null;
  const confirmWindowOpen =
    showConfirmDelivery && confirmDeadlineMs != null && Date.now() < confirmDeadlineMs;

  useEffect(() => {
    if (!showConfirmDelivery || !confirmDeadlineMs) return;
    const tickId = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(tickId);
  }, [showConfirmDelivery, confirmDeadlineMs]);

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing request');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const activity = await fetchRequestActivity(id);
      setRequest(activity.request);
      setTask(activity.task);
      try {
        const b = await getBook(activity.request.book_id);
        setBookTitle(b.title);
        setBookStatus(b.status);
      } catch {
        setBookTitle(null);
        setBookStatus(null);
      }
    } catch (e) {
      const msg =
        e instanceof BookRequestApiError ? e.message : 'Could not load this request.';
      setError(msg);
      setRequest(null);
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let appState: AppStateStatus = AppState.currentState;

      const run = () => {
        if (cancelled || appState !== 'active') return;
        void load();
      };

      run();
      const interval = setInterval(run, POLL_MS);
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
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onConfirmDelivery = useCallback(async () => {
    if (!id) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmDeliveryReceipt(id);
      await load();
    } catch (e) {
      const msg =
        e instanceof BookRequestApiError ? e.message : 'Could not confirm delivery.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  }, [id, load]);

  const onConfirmDeliveryRef = useRef(onConfirmDelivery);
  onConfirmDeliveryRef.current = onConfirmDelivery;

  useEffect(() => {
    if (loading) return;
    if (!request || !task) return;
    if (request.status !== 'IN_PROGRESS' || task.status !== 'COMPLETED') return;
    if (!confirmWindowOpen) return;

    const key = task.id;
    if (deliveryPromptShownKeyRef.current === key) return;
    deliveryPromptShownKeyRef.current = key;

    Alert.alert(
      'Delivery complete',
      'You have about 5 minutes to confirm that you picked up your book. If you do not confirm in time, the robot will return to staff and this request will close.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'I received my book',
          onPress: () => void onConfirmDeliveryRef.current(),
        },
      ],
      { cancelable: true },
    );
  }, [loading, request, task, confirmWindowOpen]);

  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  const lines = request ? buildActivityLines(request, task) : [];
  const summaryPillStyle = request ? getRequestPillColors(request) : { bg: '#e8f0fe', text: HOWARD_BLUE };
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
          Delivery progress
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

      {request && !loading && !error ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 18 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HOWARD_BLUE} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>LUNA delivery</Text>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {bookTitle ?? 'Your book'}
            </Text>
            <View style={styles.summaryPillRow}>
              <View style={[styles.summaryPill, { backgroundColor: summaryPillStyle.bg }]}>
                <Text style={[styles.summaryPillText, { color: summaryPillStyle.text }]}>
                  {formatRequestListLabel(request)}
                </Text>
              </View>
              <Text style={styles.summaryLocation} numberOfLines={1}>
                {request.request_location}
              </Text>
            </View>
            <View style={styles.summaryBookStatusRow}>
              <Text style={styles.summaryBookStatusLabel}>Book in catalog</Text>
              <Text style={styles.summaryBookStatusValue}>{formatBookStatusLabel(bookStatus)}</Text>
            </View>
          </View>

          {showConfirmDelivery && confirmDeadlineMs != null ? (
            <View style={styles.confirmUrgentBanner} accessibilityRole="alert">
              <FontAwesome name="clock-o" size={18} color={HOWARD_RED} />
              <View style={styles.confirmUrgentTextWrap}>
                <Text style={styles.confirmUrgentTitle}>Confirm pickup</Text>
                <Text style={styles.confirmUrgentBody}>
                  {confirmWindowOpen
                    ? `You have ${formatCountdownTo(confirmDeadlineMs)} left to confirm. If you don’t, the robot will return to staff.`
                    : 'The confirmation window has ended. The robot has returned to staff.'}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.timelineCard}>
            {lines.map((line, index) => (
              <View key={line.key} style={styles.timelineRow}>
                <View style={styles.timelineAxis}>
                  <View
                    style={[
                      styles.timelineDot,
                      line.state === 'complete' && styles.dotComplete,
                      line.state === 'active' && styles.dotActive,
                      line.state === 'upcoming' && styles.dotUpcoming,
                      line.state === 'issue' && styles.dotIssue,
                    ]}
                  />
                  {index < lines.length - 1 ? <View style={styles.timelineStem} /> : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text
                    style={[
                      styles.lineTitle,
                      line.state === 'upcoming' && styles.textMuted,
                      line.state === 'issue' && styles.textIssue,
                    ]}
                  >
                    {line.title}
                  </Text>
                  {line.subtitle ? (
                    <Text style={[styles.lineSub, line.state === 'upcoming' && styles.textMuted]}>
                      {line.subtitle}
                    </Text>
                  ) : null}
                  {line.timeLabel ? (
                    <Text style={styles.lineTime}>{line.timeLabel}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {showConfirmDelivery ? (
            <TouchableOpacity
              style={[
                styles.primaryConfirmBtn,
                (confirming || !confirmWindowOpen) && styles.primaryConfirmBtnDisabled,
              ]}
              activeOpacity={0.88}
              disabled={confirming || !confirmWindowOpen}
              onPress={() => void onConfirmDelivery()}
            >
              <FontAwesome name="check-circle" size={18} color="#fff" style={styles.secondaryIcon} />
              <Text style={styles.primaryConfirmText}>
                {confirming
                  ? 'Saving…'
                  : confirmWindowOpen
                    ? 'I received my book'
                    : 'Confirmation closed'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/book/${request.book_id}`)}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timelineAxis: { width: 22, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: '#cbd5e1',
  },
  dotComplete: { backgroundColor: '#1d4ed8' },
  dotActive: { backgroundColor: HOWARD_RED, transform: [{ scale: 1.15 }] },
  dotUpcoming: { backgroundColor: '#e2e8f0' },
  dotIssue: { backgroundColor: '#dc2626' },
  timelineStem: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  timelineBody: { flex: 1, paddingBottom: 20, paddingLeft: 6 },
  lineTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  lineSub: { fontSize: 14, color: '#64748b', marginTop: 4, lineHeight: 20 },
  lineTime: { fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: '500' },
  textMuted: { color: '#94a3b8' },
  textIssue: { color: '#b91c1c' },
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
