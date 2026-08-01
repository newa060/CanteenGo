import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { ArrowLeft, UploadCloud, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteen, useUpdateCanteen } from '../../lib/hooks/useCanteen';

export default function CanteenSettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || null;

  const { data: canteen, isLoading } = useCanteen(canteenId);
  const { mutate: updateCanteen, isPending: isSaving } = useUpdateCanteen();

  const [canteenName, setCanteenName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Sync form state once canteen data loads
  useEffect(() => {
    if (canteen) {
      setCanteenName(canteen.name);
      setIsActive(canteen.is_active);
    }
  }, [canteen]);

  const handleSave = () => {
    if (!canteenId) {
      Alert.alert('Error', 'No canteen linked to your account.');
      return;
    }
    if (!canteenName.trim()) {
      Alert.alert('Validation', 'Canteen name cannot be empty.');
      return;
    }
    updateCanteen(
      { id: canteenId, updates: { name: canteenName.trim(), is_active: isActive } },
      { onSuccess: () => router.back() }
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF6600" size="large" />
      </View>
    );
  }

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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft color={colors.text} size={22} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 }}>
            Operational Settings
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <X color={colors.text} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 24 }}>
        {/* Appearance */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            APPEARANCE & THEME
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Dark Mode</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                  {isDarkMode ? 'Ember Obsidian Dark Theme' : 'Clean Light SaaS Theme'}
                </Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#CBD5E1', true: '#FF6600' }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Canteen Identity */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            CANTEEN IDENTITY
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 16 }}>
            {/* Canteen Code — Read-only */}
            {canteen?.code && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Canteen Code (read-only)
                </Text>
                <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text style={{ color: '#FF6600', fontSize: 18, fontWeight: '800', letterSpacing: 3 }}>{canteen.code}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 4 }}>Share this code with students to join your canteen.</Text>
              </View>
            )}

            {/* Canteen Name — Editable */}
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Canteen Name
              </Text>
              <TextInput
                value={canteenName}
                onChangeText={setCanteenName}
                style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '600' }}
              />
            </View>

            {/* Active toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Active Canteen Status</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Visible to all students</Text>
              </View>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#CBD5E1', true: '#10B981' }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* No canteen linked warning */}
        {!canteenId && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>⚠ No canteen linked to your account</Text>
            <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, opacity: 0.8 }}>Ask a superadmin to assign you to a canteen in the database.</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 6, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Discard</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !canteenId}
          style={{ flex: 1, backgroundColor: isSaving || !canteenId ? 'rgba(255,102,0,0.5)' : '#FF6600', paddingVertical: 12, borderRadius: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          {isSaving && <ActivityIndicator color="#FFFFFF" size="small" />}
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
