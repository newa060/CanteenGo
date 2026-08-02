import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Save, Upload, X, Plus, Clock, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteen, useUpdateCanteen } from '../../lib/hooks/useCanteen';
import { cloudinaryService } from '../../lib/cloudinary';
import { showSuccessToast, showErrorToast } from '../../lib/errorHandler';

const PRESET_SLOTS = [
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '12:30 - 13:30',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '18:00 - 20:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
];

function parseSlots(location: string | null): string[] {
  if (!location) return [];
  try {
    const parsed = JSON.parse(location);
    if (Array.isArray(parsed?.slots)) return parsed.slots as string[];
  } catch {}
  return [];
}

function buildLocationJson(slots: string[]): string {
  return JSON.stringify({ slots });
}

export default function CanteenSettingsScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || null;

  const { data: canteen, isLoading } = useCanteen(canteenId);
  const { mutate: updateCanteen, isPending: isSaving } = useUpdateCanteen();

  const [canteenName, setCanteenName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (canteen) {
      setCanteenName(canteen.name);
      setIsActive(canteen.is_active);
      setSlots(parseSlots(canteen.location));
      setQrUrl(canteen.image_url || null);
    }
  }, [canteen]);

  const handleAddPresetSlot = () => {
    if (!selectedPresetSlot) {
      showErrorToast('Please select a time slot from the dropdown');
      return;
    }
    if (slots.includes(selectedPresetSlot)) {
      showErrorToast('This slot already exists');
      return;
    }
    setSlots((prev) => [...prev, selectedPresetSlot]);
    setSelectedPresetSlot('');
  };

  const handleRemoveSlot = (slot: string) => setSlots((prev) => prev.filter((s) => s !== slot));

  const handlePickQr = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { showErrorToast('Media library permission required'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
      if (!result.canceled && result.assets?.length > 0) {
        const localUri = result.assets[0].uri;
        setUploadingQr(true);
        try {
          const uploadResult = await cloudinaryService.uploadImage(localUri, { folder: 'payment_qr' });
          if (uploadResult?.secure_url) {
            setQrUrl(uploadResult.secure_url);
            showSuccessToast('QR code uploaded to Cloudinary!');
          } else {
            throw new Error('Upload returned empty response');
          }
        } catch (err: any) {
          showErrorToast(err?.message || 'Cloudinary upload failed. Check network or configuration.');
          setQrUrl(localUri);
        } finally {
          setUploadingQr(false);
        }
      }
    } catch { showErrorToast('Error picking QR image'); }
  };

  const handleRemoveQr = () => {
    Alert.alert('Remove QR Code', 'Are you sure you want to remove the payment QR code?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setQrUrl(null) },
    ]);
  };

  const handleSave = () => {
    if (!canteenId) { Alert.alert('Error', 'No canteen linked to your account.'); return; }
    if (!canteenName.trim()) { Alert.alert('Validation', 'Canteen name cannot be empty.'); return; }
    updateCanteen({
      id: canteenId,
      updates: {
        name: canteenName.trim(),
        is_active: isActive,
        location: buildLocationJson(slots),
        image_url: qrUrl || undefined,
      },
    });
  };

  const handleDiscard = () => {
    if (canteen) {
      setCanteenName(canteen.name);
      setIsActive(canteen.is_active);
      setSlots(parseSlots(canteen.location));
      setQrUrl(canteen.image_url || null);
    }
    router.back();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF6600" size="large" />
      </View>
    );
  }

  const qrFilename = qrUrl ? (qrUrl.split('/').pop()?.split('?')[0] || 'QR_CODE') : null;

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
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 1 }}>
          Operational Settings
        </Text>
        <Pressable onPress={handleDiscard} style={{ padding: 4 }}>
          <X color={colors.text} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130, gap: 28 }}>

        {/* ── CANTEEN IDENTITY ── */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            CANTEEN IDENTITY
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                CANTEEN NAME
              </Text>
              <TextInput
                value={canteenName}
                onChangeText={setCanteenName}
                placeholder="Main Hub Tactical Kitchen"
                placeholderTextColor={colors.mutedText}
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '600',
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Active Canteen Status</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Visible to all tactical units</Text>
              </View>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#353534', true: '#FF6600' }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* ── LOGISTICS & TIMESLOTS ── */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            LOGISTICS &amp; TIMESLOTS
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              PICKUP TIME SLOTS
            </Text>

            {/* Slot chips */}
            {slots.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {slots.map((slot) => (
                  <View
                    key={slot}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      gap: 8,
                    }}
                  >
                    <Clock color={colors.subtext} size={12} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{slot}</Text>
                    <Pressable onPress={() => handleRemoveSlot(slot)} hitSlop={8}>
                      <X color={colors.mutedText} size={14} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: colors.mutedText, fontStyle: 'italic' }}>No pickup slots added yet.</Text>
            )}

            {/* Add slot dropdown selector */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => setShowSlotPicker(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: selectedPresetSlot ? colors.text : colors.mutedText }}>
                  {selectedPresetSlot || 'Select time slot...'}
                </Text>
                <ChevronDown color={colors.mutedText} size={18} />
              </Pressable>
              <Pressable
                onPress={handleAddPresetSlot}
                style={{
                  backgroundColor: '#FF6600',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus color="#FFFFFF" size={14} />
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>ADD{'\n'}SLOT</Text>
              </Pressable>
            </View>

            {/* Dropdown Modal for selecting time slots */}
            <Modal visible={showSlotPicker} transparent animationType="fade" onRequestClose={() => setShowSlotPicker(false)}>
              <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }} onPress={() => setShowSlotPicker(false)}>
                <View style={{ width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Select Pickup Time Slot</Text>
                    <Pressable onPress={() => setShowSlotPicker(false)}>
                      <X color={colors.mutedText} size={20} />
                    </Pressable>
                  </View>
                  <ScrollView style={{ maxHeight: 260 }}>
                    {PRESET_SLOTS.map((slot) => {
                      const isAlreadyAdded = slots.includes(slot);
                      return (
                        <Pressable
                          key={slot}
                          disabled={isAlreadyAdded}
                          onPress={() => {
                            setSelectedPresetSlot(slot);
                            setShowSlotPicker(false);
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: selectedPresetSlot === slot ? 'rgba(255,102,0,0.15)' : 'transparent',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: isAlreadyAdded ? 0.4 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: selectedPresetSlot === slot ? '#FF6600' : colors.text }}>
                            {slot}
                          </Text>
                          {isAlreadyAdded && <Text style={{ fontSize: 11, color: colors.mutedText }}>(Already Added)</Text>}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          </View>
        </View>

        {/* ── FINANCIAL SYSTEMS ── */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
            FINANCIAL SYSTEMS
          </Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              PAYMENT QR CODE
            </Text>

            {/* Upload area */}
            <Pressable
              onPress={handlePickQr}
              disabled={uploadingQr}
              style={{
                borderWidth: 2,
                borderColor: 'rgba(255,102,0,0.5)',
                borderStyle: 'dashed',
                borderRadius: 12,
                padding: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,102,0,0.05)',
                gap: 10,
              }}
            >
              {uploadingQr ? (
                <ActivityIndicator color="#FF6600" size="large" />
              ) : (
                <>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,102,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload color="#FF6600" size={24} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Upload Payment QR</Text>
                  <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', lineHeight: 18 }}>
                    Drop your station's unique{'\n'}payment QR code here.{'\n'}Supports PNG, JPG, SVG.
                  </Text>
                </>
              )}
            </Pressable>

            {/* Current QR asset preview */}
            {qrUrl && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 12 }}>
                <Image
                  source={{ uri: qrUrl }}
                  style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
                    CURRENT QR ASSET
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {qrFilename}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                    <Pressable onPress={handlePickQr}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6600', letterSpacing: 1 }}>REPLACE</Text>
                    </Pressable>
                    <Pressable onPress={handleRemoveQr}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 1 }}>REMOVE</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* No canteen warning */}
        {!canteenId && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>⚠ No canteen linked to your account</Text>
            <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, opacity: 0.8 }}>Ask a superadmin to assign you to a canteen in the database.</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', gap: 12 }}>
        <Pressable
          onPress={handleDiscard}
          style={{ flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
            DISCARD CHANGES
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !canteenId}
          style={{ flex: 1.4, backgroundColor: isSaving || !canteenId ? 'rgba(255,102,0,0.5)' : '#FF6600', paddingVertical: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Save color="#FFFFFF" size={14} />}
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
            {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

