import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

const RECENT_SEARCHES = ['Algorithms', 'Toni Morrison', 'Quantum Physics', 'African History'];
const POPULAR = ['Clean Code', 'Dune', 'Atomic Habits', 'The Alchemist', 'Cosmos', '1984'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.heading}>Search</Text>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={15} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Books, authors, topics..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome name="microphone" size={15} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome name="camera" size={15} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Recent */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            {RECENT_SEARCHES.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} activeOpacity={0.75}>
                <FontAwesome name="history" size={12} color="#64748b" />
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Right Now</Text>
          <View style={styles.chipRow}>
            {POPULAR.map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, styles.popularChip]} activeOpacity={0.75}>
                <FontAwesome name="fire" size={12} color={HOWARD_RED} />
                <Text style={[styles.chipText, styles.popularChipText]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Browse by category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {[
              { label: 'Science', icon: 'flask', color: '#06b6d4', bg: '#ecfeff' },
              { label: 'Fiction', icon: 'magic', color: '#8b5cf6', bg: '#f5f3ff' },
              { label: 'Technology', icon: 'microchip', color: HOWARD_BLUE, bg: '#eff6ff' },
              { label: 'History', icon: 'globe', color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Biography', icon: 'user', color: '#10b981', bg: '#ecfdf5' },
              { label: 'Art & Design', icon: 'paint-brush', color: HOWARD_RED, bg: '#fff1f2' },
            ].map((cat) => (
              <TouchableOpacity key={cat.label} style={[styles.catCard, { backgroundColor: cat.bg }]} activeOpacity={0.8}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                  <FontAwesome name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  body: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  clearText: { fontSize: 13, fontWeight: '600', color: HOWARD_BLUE },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  popularChip: { borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  popularChipText: { color: HOWARD_RED },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 15, fontWeight: '700' },
});
