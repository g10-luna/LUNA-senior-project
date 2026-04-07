import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RequestsScreen() {
  return (
    <View style={styles.container}>
      <FontAwesome name="inbox" size={48} color="#ccc" style={styles.icon} />
      <Text style={styles.title}>Requests</Text>
      <Text style={styles.sub}>Your book requests will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  icon: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  sub: { fontSize: 15, color: '#94a3b8' },
});
