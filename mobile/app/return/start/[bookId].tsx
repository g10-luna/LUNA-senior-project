import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RETURN_JOURNEY_STEPS } from '@/src/constants/returnJourney';
import { ReturnJourneyTimeline, type JourneyLine } from '@/src/features/returns/returnJourneyTimeline';
import {
  BookReturnApiError,
  createBookReturn,
  listMyBookReturns,
  type BookReturnItem,
} from '@/src/services/bookReturns';
import { BooksApiError, getBook, type Book } from '@/src/services/books';
import { getCoverUrl } from '@/src/utils/covers';
import {
  DEFAULT_PICKUP_LOCATION_VALUE,
  PICKUP_LOCATION_OPTIONS,
} from '@/src/constants/pickupLocations';
import { useAuth } from '@/contexts/AuthContext';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

const ACTIVE_RETURN_STATUSES = new Set<BookReturnItem['status']>([
  'PENDING',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'AWAITING_STUDENT_LOAD',
  'READY_FOR_RETURN_LEG',
  'RETURN_IN_TRANSIT',
  'AWAITING_ADMIN_CONFIRM',
]);

const PREVIEW_LINES: JourneyLine[] = RETURN_JOURNEY_STEPS.map((s, i) => ({
  key: `p${i}`,
  title: s.title,
  subtitle: s.subtitle,
  timeLabel: null,
  state: i === 0 ? 'active' : 'upcoming',
}));

export default function ReturnStartScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasToken } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickupLocation, setPickupLocation] = useState(DEFAULT_PICKUP_LOCATION_VALUE);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!bookId) {
      setError('Missing book');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const b = await getBook(bookId);
      setBook(b);
      const { items: returns } = await listMyBookReturns({ limit: 100 });
      const active = returns.find(
        (r) => r.book_id === bookId && ACTIVE_RETURN_STATUSES.has(r.status),
      );
      if (active) {
        router.replace(`/return/${active.id}` as any);
        return;
      }
    } catch (e) {
      const msg =
        e instanceof BooksApiError
          ? e.message
          : e instanceof BookReturnApiError
            ? e.message
            : 'Could not load this book.';
      setError(msg);
      setBook(null);
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    if (!bookId || !book || submitting) return;
    setSubmitting(true);
    try {
      const ret = await createBookReturn({
        bookId,
        pickupLocation,
      });
      router.replace(`/return/${ret.id}` as any);
    } catch (e) {
      const msg =
        e instanceof BookReturnApiError
          ? e.message
          : 'Could not submit your return. Try again.';
      Alert.alert('Return failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  const bottomPad = 28 + insets.bottom;
  const hasCover = Boolean(book?.cover_image_url?.trim());

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
          Request return
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

      {book && !loading && !error ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 18 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroCover}>
              {hasCover ? (
                <Image
                  source={{ uri: getCoverUrl(book.cover_image_url, 'thumbnail')! }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.heroCoverPlaceholder}>
                  <FontAwesome name="book" size={28} color={HOWARD_BLUE} />
                </View>
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>Returning</Text>
              <Text style={styles.heroTitle} numberOfLines={3}>
                {book.title}
              </Text>
              <Text style={styles.heroAuthor} numberOfLines={2}>
                {book.author}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>How it works</Text>
          <Text style={styles.sectionIntro}>
            After you submit, staff approve, the robot runs (simulated), you confirm handoff, and the book is
            checked back in. Your progress will match the steps below.
          </Text>
          <View style={styles.timelineBlock}>
            <ReturnJourneyTimeline lines={PREVIEW_LINES} />
          </View>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Robot pickup location</Text>
          <Text style={styles.hint}>Where you will meet the robot with this book</Text>
          <View style={styles.chipsWrap}>
            {PICKUP_LOCATION_OPTIONS.map((opt) => {
              const active = pickupLocation === opt.value;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setPickupLocation(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipTitle, active && styles.chipTitleActive]}>{opt.label}</Text>
                  <Text style={styles.chipSub} numberOfLines={2}>
                    {opt.hint}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            activeOpacity={0.88}
            disabled={submitting}
            onPress={() => void onSubmit()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="paper-plane" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit return request</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textLink}
            onPress={() => router.push(`/book/${book.id}` as any)}
            accessibilityRole="button"
          >
            <Text style={styles.textLinkLabel}>Full book details</Text>
            <FontAwesome name="chevron-right" size={12} color={HOWARD_BLUE} />
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
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  heroCover: {
    width: 72,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  heroCoverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0fe',
  },
  heroText: { flex: 1, justifyContent: 'center' },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: HOWARD_RED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  heroAuthor: { fontSize: 15, color: '#64748b', marginTop: 4 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionLabelSpaced: { marginTop: 8 },
  sectionIntro: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 14,
  },
  timelineBlock: { marginBottom: 8 },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  chipActive: {
    borderColor: HOWARD_BLUE,
    backgroundColor: '#e8f0fe',
  },
  chipTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  chipTitleActive: { color: HOWARD_BLUE },
  chipSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: HOWARD_BLUE,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  textLinkLabel: { fontSize: 15, fontWeight: '600', color: HOWARD_BLUE },
});
