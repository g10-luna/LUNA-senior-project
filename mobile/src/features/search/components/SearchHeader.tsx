import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { SearchSuggestion } from '@/src/services/books';
import { HOWARD_BLUE } from '../constants';

export function SearchHeader({
  query,
  onChangeQuery,
  onSubmit,
  suggestions,
  onPickSuggestion,
}: {
  query: string;
  onChangeQuery: (next: string) => void;
  onSubmit: () => void;
  suggestions: SearchSuggestion[];
  onPickSuggestion: (s: SearchSuggestion) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.heading}>Search</Text>
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={15} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Books, authors, topics..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.actionBtn} onPress={onSubmit}>
          <FontAwesome name="search" size={15} color={HOWARD_BLUE} />
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestList}>
          {suggestions.slice(0, 8).map((s, i) => (
            <TouchableOpacity
              key={`${s.label}-${s.type}-${i}`}
              style={styles.suggestItem}
              onPress={() => onPickSuggestion(s)}
            >
              <FontAwesome name={s.type === 'author' ? 'user' : 'book'} size={14} color="#64748b" />
              <Text style={styles.suggestText} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 6,
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginHorizontal: 8 },
  input: { flex: 1, fontSize: 15, color: '#1e293b' },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  suggestList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  suggestText: { flex: 1, fontSize: 15, color: '#334155' },
});

