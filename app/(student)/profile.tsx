import React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  GraduationCap,
  LogOut,
  Moon,
  School,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useUnreadNotificationCount } from '../../lib/hooks/useNotifications';

export default function StudentProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const router = useRouter();

  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* User Card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF6600', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <User color="#FFFFFF" size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{user?.full_name || user?.email || 'Student User'}</Text>
            <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
              {user?.email || ''} · Role: Student
            </Text>
          </View>
        </View>

        {/* Account Info */}
        <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
          ACCOUNT INFO
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <School color="#FF6600" size={18} style={{ marginRight: 12 }} />
            <View>
              <Text style={{ fontSize: 12, color: colors.subtext }}>Campus Canteen</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {user?.canteen_code ? `Code: ${user.canteen_code}` : 'Main Hub Canteen'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <GraduationCap color="#FF6600" size={18} style={{ marginRight: 12 }} />
            <View>
              <Text style={{ fontSize: 12, color: colors.subtext }}>Student Status</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981' }}>Verified Active</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
          PREFERENCES
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          {/* Light/Dark Mode Switch */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Moon color="#FF6600" size={18} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Dark Mode</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#CBD5E1', true: '#FF6600' }} thumbColor="#FFFFFF" />
          </View>

          <Pressable
            onPress={() => router.push('/(student)/notifications')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Bell color="#FF6600" size={18} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Push Notifications</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {(unreadCount as number) > 0 && (
                <View style={{ backgroundColor: '#FF6600', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{unreadCount as number}</Text>
                </View>
              )}
              <ChevronRight color={colors.subtext} size={18} />
            </View>
          </Pressable>

          <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <ShieldCheck color="#FF6600" size={18} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Privacy & Terms</Text>
            </View>
            <ChevronRight color={colors.subtext} size={18} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <LogOut color="#EF4444" size={18} />
            </View>
            <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '800' }}>Logout</Text>
          </View>
          <ChevronRight color="#EF4444" size={18} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
