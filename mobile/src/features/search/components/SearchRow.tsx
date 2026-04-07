import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Book, BookStatus } from '@/src/services/books';
import { getCoverUrl } from '@/src/utils/covers';
import { HOWARD_BLUE } from '../constants';

function statusLabel(s: BookStatus): string {
  switch (s) {
    case 'AVAILABLE':
      return 'Available';
    case 'CHECKED_OUT':
      return 'Checked Out';
    case 'RESERVED':
      return 'Reserved';
    case 'UNAVAILABLE':
      return 'Unavailable';
    default:
      return String(s);
  }
}

function statusColor(s: BookStatus): string {
  switch (s) {
    case 'AVAILABLE':
      return 'rgba(22,163,74,0.9)';
    case 'CHECKED_OUT':
    case 'UNAVAILABLE':
      return 'rgba(220,38,38,0.9)';
    case 'RESERVED':
      return 'rgba(234,179,8,0.9)';
    default:
      return '#64748b';
  }
}

export function SearchBookRow({ book, onPress }: { book: Book; onPress: () => void }) {
  const hasCover = Boolean(book.cover_image_url?.trim());
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.resultCover}>
        {hasCover ? (
          <Image
            source={{ uri: getCoverUrl(book.cover_image_url, 'thumbnail')! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            recyclingKey={book.id}
          />
        ) : (
          <LinearGradient colors={[HOWARD_BLUE + '30', HOWARD_BLUE + '08']} style={StyleSheet.absoluteFill}>
            <FontAwesome name="book" size={24} color={HOWARD_BLUE} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.resultAuthor} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={[styles.resultBadge, { backgroundColor: statusColor(book.status) }]}>
          <Text style={styles.resultBadgeText}>{statusLabel(book.status)}</Text>
        </View>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  resultCover: {
    width: 48,
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  resultInfo: { flex: 1, marginLeft: 14 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  resultAuthor: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  resultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});

