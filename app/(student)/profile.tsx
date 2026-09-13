import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
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
  const [privacyVisible, setPrivacyVisible] = useState(false);

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
          <Pressable
            onPress={() => {
              router.push('/(auth)/canteen-code');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <School color="#FF6600" size={18} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.subtext }}>Campus Canteen</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: user?.canteen_id ? colors.text : '#FF6600' }}>
                {user?.canteen_code ? `Code: ${user.canteen_code}` : user?.canteen_id ? 'Main Hub Canteen' : 'Not Joined (Tap to connect)'}
              </Text>
            </View>
            {user?.canteen_id ? (
              <View style={{ backgroundColor: 'rgba(255, 102, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                <Text style={{ color: '#FF6600', fontSize: 12, fontWeight: '700' }}>Change</Text>
              </View>
            ) : (
              <ChevronRight color="#FF6600" size={18} />
            )}
          </Pressable>
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

          <Pressable onPress={() => setPrivacyVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <ShieldCheck color="#FF6600" size={18} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Privacy & Terms</Text>
            </View>
            <ChevronRight color={colors.subtext} size={18} />
          </Pressable>
        </View>

        {/* Privacy & Terms Modal */}
        <Modal visible={privacyVisible} animationType="slide" transparent onRequestClose={() => setPrivacyVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>Privacy & Terms</Text>
                <Pressable onPress={() => setPrivacyVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: colors.subtext, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Privacy Policy */}
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FF6600', letterSpacing: 1, textTransform: 'uppercase' }}>Privacy Policy</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>What we collect</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  CanteenGo collects your name, email address, and canteen association to create and manage your student account. Payment screenshots you upload are stored securely to verify your orders.
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>How we use your data</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  Your data is used solely to process food orders, send order status notifications, and improve the app experience. We do not sell or share your personal information with third parties.
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Data security</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  All data is encrypted in transit and stored securely using Supabase infrastructure. Payment screenshots are hosted on Cloudinary with restricted access.
                </Text>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                {/* Terms of Service */}
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FF6600', letterSpacing: 1, textTransform: 'uppercase' }}>Terms of Service</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Ordering</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  Orders placed through CanteenGo are binding. Once confirmed, orders cannot be cancelled unless the canteen is unable to fulfil them. Please ensure your payment screenshot is accurate before submitting.
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Payments</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  All payments are made directly to the canteen via eSewa, Khalti, or Fonepay. CanteenGo does not process or hold payments. Upload a clear payment screenshot as proof of payment.
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Account responsibility</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
                  You are responsible for keeping your login credentials secure. Do not share your account with others. Misuse of the platform may result in account suspension.
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedText, textAlign: 'center', marginTop: 8 }}>Last updated: August 2026</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

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
