import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Home, Receipt, ShoppingBag, User } from 'lucide-react-native';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { realtimeService } from '../../lib/realtimeService';

export default function StudentLayout() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenCode = useAuthStore((s) => s.canteenCode);

  useEffect(() => {
    if (user?.id) {
      realtimeService.subscribeToOrdersForStudent(user.id);
      realtimeService.subscribeToNotifications(user.id);
    }
    return () => {
      realtimeService.unsubscribe('orders');
      realtimeService.unsubscribe('notifications');
    };
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
          height: Platform.OS === 'web' ? 64 : 72,
          paddingBottom: Platform.OS === 'web' ? 6 : 12,
          paddingTop: 8,
          marginBottom: Platform.OS === 'web' ? 0 : 10,
          borderRadius: Platform.OS === 'web' ? 0 : 16,
          marginHorizontal: Platform.OS === 'web' ? 0 : 12,
          position: Platform.OS === 'web' ? 'relative' : 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarActiveTintColor: '#FF6600',
        tabBarInactiveTintColor: isDarkMode ? '#888888' : '#64748B',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
