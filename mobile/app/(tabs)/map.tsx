import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, Animated, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_BAR_HEIGHT } from '@/components/BottomTabBar';

const MAP_IMAGE_SOURCE = require('../../assets/images/Founders_Library_Image.png');
const MAP_IMAGE_META = RNImage.resolveAssetSource(MAP_IMAGE_SOURCE);
const MAP_IMAGE_ASPECT_RATIO =
  MAP_IMAGE_META?.width && MAP_IMAGE_META?.height ? MAP_IMAGE_META.width / MAP_IMAGE_META.height : 1;
const MAP_IMAGE_WIDTH = MAP_IMAGE_META?.width ?? 1000;
const MAP_IMAGE_HEIGHT = MAP_IMAGE_META?.height ?? Math.round(MAP_IMAGE_WIDTH / MAP_IMAGE_ASPECT_RATIO);

type MapMarker = {
  id: string;
  label: string;
  type: 'pickup' | 'study' | 'entrance';
  xPct: `${number}%`;
  yPct: `${number}%`;
  accent: string;
  description: string;
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = 24 + BOTTOM_TAB_BAR_HEIGHT + insets.bottom;
  const DEFAULT_ZOOM_SCALE = 0.5;
  const MIN_PAN_WORLD_MULTIPLIER = 1.8;
  const MAP_RENDER_WIDTH = MAP_IMAGE_WIDTH * DEFAULT_ZOOM_SCALE;
  const MAP_RENDER_HEIGHT = MAP_IMAGE_HEIGHT * DEFAULT_ZOOM_SCALE;
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panStart = useRef({ x: 0, y: 0 });

  // Pan bounds are intentionally independent from zoom:
  // we keep a minimum pan-world size larger than the viewport,
  // so changing DEFAULT_ZOOM_SCALE won't disable panning.
  const panWorldWidth = Math.max(MAP_RENDER_WIDTH, viewportSize.width * MIN_PAN_WORLD_MULTIPLIER);
  const panWorldHeight = Math.max(MAP_RENDER_HEIGHT, viewportSize.height * MIN_PAN_WORLD_MULTIPLIER);
  const maxPanX = Math.max(0, (panWorldWidth - viewportSize.width) / 2);
  const maxPanY = Math.max(0, (panWorldHeight - viewportSize.height) / 2);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          panStart.current = {
            x: (pan.x as any)._value ?? 0,
            y: (pan.y as any)._value ?? 0,
          };
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({
            x: clamp(panStart.current.x + gestureState.dx, -maxPanX, maxPanX),
            y: clamp(panStart.current.y + gestureState.dy, -maxPanY, maxPanY),
          });
        },
      }),
    [maxPanX, maxPanY, pan]
  );

  const markers: MapMarker[] = useMemo(
    () => [
      {
        id: 'pickup-1',
        label: 'Robot Pickup Zone',
        type: 'pickup',
        xPct: '62%',
        yPct: '42%',
        accent: '#E31837',
        description: 'Deliveries land here for quick pickup.',
      },
      {
        id: 'pickup-2',
        label: 'Pickup Point (Main Desk)',
        type: 'pickup',
        xPct: '40%',
        yPct: '58%',
        accent: '#003A63',
        description: 'Primary pickup for student requests.',
      },
      {
        id: 'study-1',
        label: 'Default Study Spot',
        type: 'study',
        xPct: '28%',
        yPct: '40%',
        accent: '#06b6d4',
        description: 'Your preferred drop-off location (demo).',
      },
      {
        id: 'entrance-1',
        label: 'Entrance',
        type: 'entrance',
        xPct: '48%',
        yPct: '18%',
        accent: '#f59e0b',
        description: 'Use this for quick arrival guidance.',
      },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? markers.find((m) => m.id === selectedId) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Map</Text>
          <Text style={styles.headerSub}>Library pickup points & delivery navigation</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.section}>
        <View style={styles.deliveryPill}>
          <FontAwesome name="android" size={18} color="#64748b" />
          <View style={styles.pillTextWrap}>
            <Text style={styles.pillTitle}>Robot tracking</Text>
            <Text style={styles.pillSub}>Coming soon (map is live now)</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapCard}>
        <View
          style={styles.mapViewport}
          onLayout={(e) =>
            setViewportSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          {...panResponder.panHandlers}
        >
          <Animated.View
            style={[
              styles.mapContent,
              {
                width: panWorldWidth,
                height: panWorldHeight,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            <View
              style={[
                styles.mapLayer,
                {
                  width: MAP_RENDER_WIDTH,
                  height: MAP_RENDER_HEIGHT,
                  left: (panWorldWidth - MAP_RENDER_WIDTH) / 2,
                  top: (panWorldHeight - MAP_RENDER_HEIGHT) / 2,
                },
              ]}
            >
              <Image
                source={MAP_IMAGE_SOURCE}
                style={styles.mapImage}
                contentFit="cover"
                transition={150}
              />

              {markers.map((m) => {
                const isActive = m.id === selectedId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.marker,
                      {
                        left: m.xPct,
                        top: m.yPct,
                        backgroundColor: m.accent + (isActive ? '' : '1a'),
                        borderColor: m.accent,
                        transform: [{ translateX: -17 }, { translateY: -17 }],
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedId(m.id)}
                  >
                    <FontAwesome
                      name={
                        m.type === 'pickup'
                          ? 'circle'
                          : m.type === 'study'
                            ? 'bookmark'
                            : 'location-arrow'
                      }
                      size={isActive ? 14 : 12}
                      color={m.type === 'entrance' ? '#0f172a' : '#fff'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>

        {/* Subtle legend (fixed; does not zoom) */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#E31837' }]} />
            <Text style={styles.legendText}>Pickup</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#06b6d4' }]} />
            <Text style={styles.legendText}>Study</Text>
          </View>
        </View>
      </View>

      {/* Details sheet */}
      {selected ? (
        <View
          style={[
            styles.sheet,
            {
              bottom: bottomPad - 12,
              paddingBottom: Math.max(12, insets.bottom),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{selected.label}</Text>
            <TouchableOpacity
              onPress={() => setSelectedId(null)}
              style={styles.sheetClose}
              activeOpacity={0.7}
            >
              <FontAwesome name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sheetSub}>{selected.description}</Text>

          <TouchableOpacity
            style={[styles.sheetBtn, { backgroundColor: selected.accent }]}
            activeOpacity={0.85}
            onPress={() => {
              // Placeholder for later "Set as default pickup" / "Navigate" behavior.
            }}
          >
            <Text style={styles.sheetBtnText}>
              {selected.type === 'pickup' ? 'Set as default pickup' : 'View details'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  headerRight: { width: 40 },

  section: { paddingHorizontal: 20, marginTop: 4 },
  deliveryPill: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  pillTextWrap: { flex: 1, minWidth: 0 },
  pillTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  pillSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  mapCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    flex: 1,
    position: 'relative',
  },
  mapViewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContent: {
    position: 'relative',
  },
  mapLayer: {
    position: 'absolute',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },

  marker: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  legend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', flex: 1 },
  sheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetSub: { marginTop: 8, fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 14 },
  sheetBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
