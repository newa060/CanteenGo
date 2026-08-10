import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { PackageOpen, QrCode, ReceiptText } from 'lucide-react-native';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { realtimeService } from '../../lib/realtimeService';

export default function AdminLayout() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  useEffect(() => {
    realtimeService.subscribeToOrdersForCanteen(canteenId);
    realtimeService.subscribeToProducts(canteenId);
    if (user?.id) {
      realtimeService.subscribeToNotifications(user.id);
    }
    return () => {
      realtimeService.unsubscribe('orders');
      realtimeService.unsubscribe('products');
      realtimeService.unsubscribe('notifications');
    };
  }, [canteenId, user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          marginBottom: 15,
          ...(Platform.OS === 'web' ? {
            position: 'absolute',
            bottom: 15,
            left: 0,
            right: 0,
          } : {}),
        },
        tabBarActiveTintColor: '#FF6600',
        tabBarInactiveTintColor: isDarkMode ? 'rgba(229,226,225,0.4)' : '#888888',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Individual',
          tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Bulk Orders',
          tabBarIcon: ({ color, size }) => <PackageOpen color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Pickup',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="qr-code"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="menu-management"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
