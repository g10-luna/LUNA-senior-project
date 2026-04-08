import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Book, BookStatus } from '@/src/services/books';
import { getCoverUrl } from '@/src/utils/covers';

function statusLabel(status: BookStatus): string {
  switch (status) {
    case 'AVAILABLE': return 'Available';
    case 'CHECKED_OUT': return 'Checked Out';
    case 'RESERVED': return 'Reserved';
    case 'UNAVAILABLE': return 'Unavailable';
    default: return String(status);
  }
}

function statusColor(status: BookStatus): string {
  switch (status) {
    case 'AVAILABLE': return 'rgba(22,163,74,0.85)';
    case 'CHECKED_OUT':
    case 'UNAVAILABLE': return 'rgba(220,38,38,0.85)';
    case 'RESERVED': return 'rgba(234,179,8,0.85)';
    default: return 'rgba(100,116,139,0.85)';
  }
}

export interface BookCardProps {
  book: Book;
  accentColor: string;
  cardWidth?: number;
  onPress?: () => void;
}

export default function BookCard({ book, accentColor, cardWidth, onPress }: BookCardProps) {
  const hasCover = Boolean(book.cover_image_url?.trim());
  const w = cardWidth ?? 130;
  const h = cardWidth ? Math.round(w * (175 / 130)) : 175;
  return (
    <TouchableOpacity
      style={[styles.bookCard, cardWidth ? { width: w } : undefined]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.bookCover, { width: w, height: h, backgroundColor: accentColor + '15' }]}>
        {hasCover ? (
          <Image
            source={{ uri: getCoverUrl(book.cover_image_url, 'thumbnail')! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            recyclingKey={book.id}
          />
        ) : (
          <>
            <LinearGradient
              colors={[accentColor + '30', accentColor + '08']}
              style={StyleSheet.absoluteFill}
            />
            <FontAwesome name="book" size={28} color={accentColor} />
          </>
        )}
        <View style={[styles.availableTag, { backgroundColor: statusColor(book.status) }]}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>{statusLabel(book.status)}</Text>
        </View>
      </View>
      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bookCard: { width: 130 },
  bookCover: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  availableTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 5,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  availableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
    lineHeight: 18,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
});
