import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { ArrowLeft, RefreshCw, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteen } from '../../lib/hooks/useCanteen';
import { showSuccessToast } from '../../lib/errorHandler';

export default function QRManagementScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || null;

  const { data: canteen, isLoading, refetch } = useCanteen(canteenId);

  const canteenCode = canteen?.code ?? '';
  const canteenName = canteen?.name ?? 'Your Canteen';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${canteenName} on CanteenGo!\nYour canteen code: ${canteenCode}`,
        title: `${canteenName} — CanteenGo`,
      });
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  const handleCopyCode = () => {
    showSuccessToast(`Canteen code: ${canteenCode}`);
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
          borderBottomColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft color={colors.text} size={22} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600', textTransform: 'uppercase', letterSpacing: -0.3 }}>
              Canteen QR Management
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {canteenName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, alignItems: 'center', gap: 24 }}>
        {/* Main QR Display Card */}
        <View
          style={{
            width: '100%',
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,102,0,0.3)',
            shadowColor: '#FF6600',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          {/* QR Code */}
          <View
            style={{
              width: 236,
              height: 236,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FF6600" size="large" />
            ) : canteenCode ? (
              <QRCode
                value={canteenCode}
                size={200}
                color="#131313"
                backgroundColor="#FFFFFF"
              />
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', fontWeight: '600' }}>
                  No canteen linked
                </Text>
                <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>
                  Ask a superadmin to assign you to a canteen
                </Text>
              </View>
            )}
          </View>

          {/* Station Details */}
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textTransform: 'uppercase', marginBottom: 4 }}>
            {canteenName}
          </Text>
          {canteenCode ? (
            <Pressable onPress={handleCopyCode}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF6600', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
                CANTEEN CODE: {canteenCode}
              </Text>
            </Pressable>
          ) : null}

          {/* Status pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: canteen?.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239,68,68,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: canteen?.is_active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239,68,68,0.4)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: canteen?.is_active ? '#10B981' : '#EF4444' }} />
            <Text style={{ color: canteen?.is_active ? '#10B981' : '#EF4444', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {canteen?.is_active ? 'QR ACTIVE & SCANNING' : 'CANTEEN INACTIVE'}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            HOW IT WORKS
          </Text>
          <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 20 }}>
            Students scan this QR code with their camera in the CanteenGo app, or they can manually enter the canteen code <Text style={{ color: '#FF6600', fontWeight: '700' }}>{canteenCode}</Text> on the join screen.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleShare}
              style={{
                flex: 1,
                backgroundColor: '#FF6600',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Share2 color="#FFFFFF" size={18} />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Share Code</Text>
            </Pressable>

            <Pressable
              onPress={() => refetch()}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <RefreshCw color="#FF6600" size={16} />
              <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Refresh</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
