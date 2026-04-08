import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOWARD_RED = '#E31837';
const INACTIVE_COLOR = '#94a3b8';
const TAB_BAR_HEIGHT = 81;

type TabItem = {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  href: string;
  match: (pathname: string) => boolean;
};

const TABS: TabItem[] = [
  {
    key: 'home',
    title: 'Home',
    icon: 'home',
    href: '/(tabs)',
    match: (p) => {
    const s = p ?? '';
    return !s.includes('requests') && !s.includes('search') && !s.includes('my-account') && !s.includes('map') && !s.includes('book');
  },
  },
  {
    key: 'requests',
    title: 'Requests',
    icon: 'paper-plane-o',
    href: '/(tabs)/requests',
    match: (p) => p.includes('requests'),
  },
  {
    key: 'search',
    title: 'Search',
    icon: 'search',
    href: '/(tabs)/search',
    match: (p) => p.includes('search'),
  },
  {
    key: 'profile',
    title: 'Profile',
    icon: 'user-circle-o',
    href: '/(tabs)/my-account',
    match: (p) => p.includes('my-account'),
  },
  {
    key: 'map',
    title: 'Map',
    icon: 'map-marker',
    href: '/(tabs)/map',
    match: (p) => p.includes('map'),
  },
];

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isActive = tab.match(pathname);
        const color = isActive ? HOWARD_RED : INACTIVE_COLOR;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => router.push(tab.href as any)}
            activeOpacity={0.7}
          >
            <FontAwesome name={tab.icon} size={22} color={color} />
            <View style={styles.labelWrap}>
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.title}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const BOTTOM_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: TAB_BAR_HEIGHT,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  labelWrap: {
    marginTop: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
