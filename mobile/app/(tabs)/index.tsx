import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <FontAwesome name="search" size={48} color="#ccc" style={styles.icon} />
      <Text style={styles.title}>Search</Text>
      <Text style={styles.placeholder}>Search the catalog (coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#333', marginBottom: 8 },
  placeholder: { fontSize: 15, color: '#888' },
});
