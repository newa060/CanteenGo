import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChefHat,
  ChevronDown,
  ChevronUp,
  LogOut,
  QrCode,
  Settings,
  UtensilsCrossed,
  X,
  Bell,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { getThemeColors, useThemeStore } from '../store/themeStore';

interface AdminDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminDrawer({ visible, onClose }: AdminDrawerProps) {
  const { logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    {
      key: 'menu',
      label: 'Menu Management',
      icon: UtensilsCrossed,
      route: '/(admin)/menu-management',
    },
    {
      key: 'settings',
      label: 'Canteen Settings',
      icon: Settings,
      route: '/(admin)/settings',
    },
    {
      key: 'qr',
      label: 'QR Code',
      icon: QrCode,
      route: '/(admin)/qr-code',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        {/* Drawer Panel */}
        <View
          style={{
            width: '82%',
            maxWidth: 320,
            backgroundColor: colors.surface,
            borderRightWidth: 1,
            borderRightColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: 52,
              paddingHorizontal: 24,
              paddingBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              height: 96,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#FF6600',
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#FF6600',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <ChefHat color="#FFFFFF" size={20} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FF6600', letterSpacing: -0.5, textTransform: 'uppercase', lineHeight: 20 }}>
                  EMBER OPS
                </Text>
                <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                  CAFETERIA-GO ADMIN
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
            >
              <X color={colors.text} size={16} />
            </Pressable>
          </View>

          {/* Scrollable nav */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }}>
            {/* Operations Section */}
            <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 3, textTransform: 'uppercase', paddingHorizontal: 8, marginBottom: 8 }}>
                OPERATIONS
              </Text>

              {navItems.map((item) => {
                const IconComp = item.icon;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      router.push(item.route as any);
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 10,
                      marginBottom: 4,
                    }}
                  >
                    <IconComp color="#FF6600" size={22} />
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* App Settings collapsible */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 16 }}>
              <Pressable
                onPress={() => setSettingsOpen(!settingsOpen)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Settings color={colors.subtext} size={22} />
                  <Text style={{ color: colors.subtext, fontSize: 14, fontWeight: '700' }}>App Settings</Text>
                </View>
                {settingsOpen
                  ? <ChevronUp color={colors.subtext} size={16} />
                  : <ChevronDown color={colors.subtext} size={16} />}
              </Pressable>

              {settingsOpen && (
                <View style={{ paddingLeft: 40 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingRight: 8 }}>
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Light/Dark Mode</Text>
                    <Switch
                      value={isDarkMode}
                      onValueChange={toggleTheme}
                      trackColor={{ false: '#CBD5E1', true: '#FF6600' }}
                      thumbColor="#FFFFFF"
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      router.push('/(admin)/notifications');
                      onClose();
                    }}
                    style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}
                  >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Notifications & Alerts</Text>
                    <Bell color="#FF6600" size={14} />
                  </Pressable>
                  <Pressable style={{ paddingVertical: 12 }}>
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Privacy Policy</Text>
                  </Pressable>
                  <Pressable style={{ paddingVertical: 12 }}>
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Customer Service</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Logout */}
          <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              onPress={() => { logout(); onClose(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 16,
              }}
            >
              <LogOut color="#EF4444" size={20} />
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {/* Dimmed overlay to close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </View>
    </Modal>
  );
}
