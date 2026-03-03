import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const HOWARD_RED = '#E31837';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { hasToken } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: HOWARD_RED,
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: hasToken ? 'Home' : 'Search',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={hasToken ? 'home' : 'search'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-account"
        options={{
          title: hasToken ? 'Profile' : 'Login',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="e-resources"
        options={{
          title: 'E-Resources',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
