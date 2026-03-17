import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getBook, type Book, type BookStatus, BooksApiError } from '@/src/services/books';
import { getCoverUrl } from '@/src/utils/covers';
import BottomTabBar, { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';

const HOWARD_BLUE = '#003A63';
const AVAILABLE_GREEN = '#16a34a';

function statusLabel(status: BookStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'CHECKED_OUT':
      return 'Checked Out';
    case 'RESERVED':
      return 'Reserved';
    case 'UNAVAILABLE':
      return 'Unavailable';
    default:
      return String(status);
  }
}

function statusColor(status: BookStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return AVAILABLE_GREEN;
    case 'CHECKED_OUT':
    case 'UNAVAILABLE':
      return '#dc2626';
    case 'RESERVED':
      return '#ca8a04';
    default:
      return '#64748b';
  }
}

const HEADER_HEIGHT = 200;
const COVER_WIDTH = 120;
const COVER_HEIGHT = 180;
const COVER_OVERLAP = 44;

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid book');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBook(id)
      .then((b) => {
        if (!cancelled) setBook(b);
      })
      .catch((e) => {
        if (!cancelled) {
          const message =
            e instanceof BooksApiError
              ? e.message
              : 'Couldn’t load this book';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.pageWrap}>
        <View style={[styles.center, styles.container]}>
          <ActivityIndicator size="large" color={HOWARD_BLUE} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
        <BottomTabBar />
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.pageWrap}>
        <View style={[styles.center, styles.container]}>
          <FontAwesome name="exclamation-circle" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{error ?? 'Book not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
        <BottomTabBar />
      </View>
    );
  }

  const hasCover = Boolean(book.cover_image_url?.trim());
  const isAvailable = book.status === 'AVAILABLE';

  return (
    <View style={styles.pageWrap}>
      <View style={styles.container}>
      <View style={[styles.headerWrap, { height: HEADER_HEIGHT + insets.top, paddingTop: insets.top }]}>
        <View style={StyleSheet.absoluteFill}>
          {hasCover ? (
            <Image
              source={{ uri: getCoverUrl(book.cover_image_url, 'full')! }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <LinearGradient
              colors={[HOWARD_BLUE + '99', HOWARD_BLUE + '66']}
              style={StyleSheet.absoluteFill}
            />
          )}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidBlur]} />
          )}
        </View>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FontAwesome name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Book details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.coverOverlay, { bottom: -COVER_OVERLAP }]}>
          <View style={[styles.coverCard, { width: COVER_WIDTH, height: COVER_HEIGHT }]}>
            {hasCover ? (
              <Image
                source={{ uri: getCoverUrl(book.cover_image_url, 'full')! }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <LinearGradient
                colors={[HOWARD_BLUE + '40', HOWARD_BLUE + '15']}
                style={StyleSheet.absoluteFill}
              >
                <FontAwesome name="book" size={36} color={HOWARD_BLUE} />
              </LinearGradient>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: COVER_OVERLAP + 16, paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>

          <View style={styles.infoRow}>
            <FontAwesome name="check-circle" size={16} color={statusColor(book.status)} />
            <Text style={[styles.availabilityText, { color: statusColor(book.status) }]}>
              {statusLabel(book.status)}
            </Text>
          </View>

          {book.shelf_location?.trim() && (
            <View style={styles.infoRow}>
              <FontAwesome name="map-marker" size={16} color="#64748b" />
              <Text style={styles.infoText}>{book.shelf_location}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <FontAwesome name="truck" size={16} color="#64748b" />
            <Text style={styles.infoText}>Robot delivery available · Arrives in ~5 min</Text>
          </View>

          <View style={styles.primaryButtons}>
            <TouchableOpacity
              style={[styles.requestBookBtn, !isAvailable && styles.requestBookBtnDisabled]}
              activeOpacity={0.85}
              onPress={() => {}}
              disabled={!isAvailable}
            >
              <FontAwesome name="book" size={18} color={isAvailable ? '#fff' : '#94a3b8'} />
              <Text style={[styles.requestBookBtnText, !isAvailable && styles.requestBookBtnTextDisabled]}>
                Request Book
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.trackRobotBtn}
              activeOpacity={0.85}
              onPress={() => {}}
            >
              <FontAwesome name="map-marker" size={18} color={HOWARD_BLUE} />
              <Text style={styles.trackRobotBtnText}>Track Robot Delivery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.robotBanner}>
            <FontAwesome name="android" size={20} color={HOWARD_BLUE} />
            <Text style={styles.robotBannerText}>Delivery robot is idle, ready for your request!</Text>
            <View style={styles.idleBadge}>
              <FontAwesome name="circle" size={8} color={AVAILABLE_GREEN} />
              <Text style={styles.idleBadgeText}>Idle</Text>
            </View>
          </View>

          <Text style={styles.actionsTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionPill} onPress={() => {}}>
              <FontAwesome name="bookmark-o" size={16} color="#64748b" />
              <Text style={styles.actionPillText}>Bookmark</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => {}}>
              <FontAwesome name="book" size={16} color="#64748b" />
              <Text style={styles.actionPillText}>Read Sample</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={() => {}}>
              <FontAwesome name="share-alt" size={16} color="#64748b" />
              <Text style={styles.actionPillText}>Share</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailsTitle}>Book Details</Text>
          {book.description?.trim() ? (
            <Text style={styles.description}>{book.description}</Text>
          ) : (
            <Text style={styles.description}>No description available.</Text>
          )}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <FontAwesome name="tag" size={14} color="#64748b" />
              <Text style={styles.metaLabel}>{book.publisher ?? '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="file-text-o" size={14} color="#64748b" />
              <Text style={styles.metaLabel}>—</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="calendar" size={14} color="#64748b" />
              <Text style={styles.metaLabel}>{book.publication_year ?? '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="globe" size={14} color="#64748b" />
              <Text style={styles.metaLabel}>—</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  headerWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  androidBlur: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  coverCard: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginHorizontal: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  author: {
    fontSize: 17,
    color: '#475569',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  availabilityText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
  },
  primaryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  requestBookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: HOWARD_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
  },
  requestBookBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  requestBookBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  requestBookBtnTextDisabled: {
    color: '#94a3b8',
  },
  trackRobotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: HOWARD_BLUE,
  },
  trackRobotBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: HOWARD_BLUE,
  },
  robotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  robotBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#0c4a6e',
    fontWeight: '500',
  },
  idleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  actionPillText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  metaLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: HOWARD_BLUE,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
