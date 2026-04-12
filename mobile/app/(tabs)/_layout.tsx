import React from 'react';
import { View, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, Tabs } from 'expo-router';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuth } from '@/contexts/AuthContext';

const HOWARD_RED = '#E31837';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} {...props} />;
}

export default function TabLayout() {
  const { hasToken } = useAuth();
  if (hasToken === null) return null;
  if (!hasToken) return <Redirect href="/login" />;

  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: HOWARD_RED,
          tabBarInactiveTintColor: '#94a3b8',
          headerShown: false,
          tabBar: () => null,
          tabBarStyle: {
            position: 'absolute',
            height: 0,
            overflow: 'hidden',
            opacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <TabBarIcon name="paper-plane-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="e-resources"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-circle-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
      </Tabs>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
