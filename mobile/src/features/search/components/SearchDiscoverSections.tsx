import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import BookCard from '@/components/BookCard';
import type { Book } from '@/src/services/books';
import type { SearchCategory } from '../constants';
import { HOWARD_RED } from '../constants';

export function SearchDiscoverSections({
  recentSearches,
  onClearHistory,
  onRunSearch,
  popularLoading,
  popularBooks,
  onPressBook,
  categories,
  categoryCounts,
}: {
  recentSearches: string[];
  onClearHistory: () => void;
  onRunSearch: (q: string) => void;
  popularLoading: boolean;
  popularBooks: Book[];
  onPressBook: (bookId: string) => void;
  categories: SearchCategory[];
  categoryCounts: Record<string, number>;
}) {
  return (
    <View style={styles.body}>
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.length > 0 && (
            <TouchableOpacity onPress={onClearHistory} style={styles.clearHistoryButton} activeOpacity={0.7}>
              <FontAwesome name="trash-o" size={14} color="#64748b" />
              <Text style={styles.clearHistoryText}>Clear search history</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.chipRow}>
          {recentSearches.length === 0 ? (
            <Text style={styles.hintText}>Search for books to see recent terms here.</Text>
          ) : (
            recentSearches.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                activeOpacity={0.75}
                onPress={() => onRunSearch(s)}
              >
                <FontAwesome name="history" size={12} color="#64748b" />
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Right Now</Text>
        {popularLoading ? (
          <View style={styles.popularLoadingWrap}>
            <ActivityIndicator size="small" color={HOWARD_RED} />
          </View>
        ) : popularBooks.length === 0 ? (
          <Text style={styles.hintText}>No books in the catalog yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularBookList}>
            {popularBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                accentColor={HOWARD_RED}
                onPress={() => onPressBook(book.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.catCard, { backgroundColor: cat.bg }]}
              activeOpacity={0.8}
              onPress={() => onRunSearch(cat.label)}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                <FontAwesome name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <View style={styles.catTextWrap}>
                <Text style={[styles.catLabel, { color: cat.color }]} numberOfLines={1}>
                  {cat.label}
                </Text>
                <Text style={styles.catSubtitle} numberOfLines={1}>
                  {cat.subtitle}
                </Text>
                <View style={styles.catDetailRow}>
                  <FontAwesome name="check" size={10} color="#22c55e" style={styles.catDetailIcon} />
                  <Text style={styles.catDetail} numberOfLines={1}>
                    {categoryCounts[cat.label] !== undefined
                      ? `${categoryCounts[cat.label]} ${categoryCounts[cat.label] === 1 ? 'book' : 'books'}`
                      : '…'}
                  </Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={cat.color} style={styles.catArrow} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  clearHistoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearHistoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  hintText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularLoadingWrap: { paddingVertical: 16, alignItems: 'center' },
  popularBookList: { paddingRight: 20, gap: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTextWrap: { flex: 1, minWidth: 0 },
  catLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  catSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  catDetailRow: { flexDirection: 'row', alignItems: 'center' },
  catDetailIcon: { marginRight: 4 },
  catDetail: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  catArrow: { marginLeft: 4 },
});

