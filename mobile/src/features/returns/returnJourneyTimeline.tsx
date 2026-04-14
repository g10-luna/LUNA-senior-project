import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HOWARD_BLUE = '#003A63';
const HOWARD_RED = '#E31837';

export type JourneyLineState = 'complete' | 'active' | 'upcoming' | 'issue';

export interface JourneyLine {
  key: string;
  title: string;
  subtitle: string;
  timeLabel: string | null;
  state: JourneyLineState;
}

export function ReturnJourneyTimeline({ lines }: { lines: JourneyLine[] }) {
  return (
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
            <Text style={[styles.lineSub, line.state === 'upcoming' && styles.textMuted]}>{line.subtitle}</Text>
            {line.timeLabel ? <Text style={styles.lineTime}>{line.timeLabel}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
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
});
