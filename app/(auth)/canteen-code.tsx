import React, { useEffect, useRef, useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, QrCode, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthStore } from '../../store/authStore';
import { showErrorToast, showSuccessToast } from '../../lib/errorHandler';
import { profileRepository } from '../../lib/repositories/profileRepository';
import { canteenRepository } from '../../lib/repositories/canteenRepository';

export default function CanteenCodeScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setCanteenCode = useAuthStore((state) => state.setCanteenCode);
  const inputs = useRef<Array<TextInput | null>>([]);
  const scanned = useRef(false);

  const handleChangeText = (text: string, index: number) => {
    const newDigits = [...digits];
    newDigits[index] = text.toUpperCase();
    setDigits(newDigits);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const connectWithCode = async (code: string) => {
    if (code.length < 4) {
      setError('Please enter the canteen code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Look up canteen by code
      const canteen = await canteenRepository.getByCode(code);
      if (!canteen) {
        setError('Invalid canteen code. Please try again.');
        setLoading(false);
        return;
      }

      const currentUser = user;
      if (currentUser) {
        const updatedProfile = await profileRepository.update(currentUser.id, {
          canteen_code: canteen.code,
          canteen_id: canteen.id,
        });
        setUser(updatedProfile as any);
        setCanteenCode(canteen.code);
        showSuccessToast(`Connected to ${canteen.name}!`);
        router.replace('/(student)');
      } else if (email) {
        setCanteenCode(canteen.code);
        showSuccessToast(`Connected to ${canteen.name}!`);
        router.replace('/(student)');
      } else {
        setError('User not found. Please log in again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to connect to canteen');
      showErrorToast(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const code = digits.join('').trim();
    connectWithCode(code);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan QR codes.');
        return;
      }
    }
    scanned.current = false;
    setScannerOpen(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned.current) return;
    scanned.current = true;
    setScannerOpen(false);
    // QR encodes the canteen code directly
    const code = data.trim().toUpperCase();
    // Auto-fill the digits
    const padded = code.padEnd(6, ' ').slice(0, 6).split('');
    setDigits(padded.map((c) => c === ' ' ? '' : c));
    connectWithCode(code);
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' }}
      style={{ flex: 1, backgroundColor: '#131313' }}
      imageStyle={{ opacity: 0.15 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}
      >
        <View
          style={{
            backgroundColor: 'rgba(26, 26, 26, 0.94)',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 380,
            borderWidth: 1,
            borderColor: 'rgba(255, 102, 0, 0.2)',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(255, 102, 0, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(255, 102, 0, 0.3)',
            }}
          >
            <QrCode color="#FF6600" size={28} />
          </View>

          <Text style={{ fontSize: 26, fontWeight: '800', color: '#E5E2E1', marginBottom: 8, textAlign: 'center' }}>
            Join Your Canteen
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#E3BFB1',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            Enter the canteen code provided by your admin, or scan the QR code.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 }}>
            {digits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputs.current[idx] = ref; }}
                value={digit}
                onChangeText={(text) => handleChangeText(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                maxLength={1}
                autoCapitalize="characters"
                style={{
                  width: 44,
                  height: 56,
                  backgroundColor: '#1C1B1B',
                  borderWidth: 1,
                  borderColor: digit ? '#FF6600' : '#5A4136',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#FF6600',
                }}
              />
            ))}
          </View>

          {error ? (
            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleConnect}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: loading ? 'rgba(255, 102, 0, 0.7)' : '#FF6600',
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
              {loading ? 'Connecting...' : 'Connect →'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenScanner}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 102, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Camera color="#FF6600" size={18} />
            <Text style={{ color: '#FF6600', fontWeight: '700', fontSize: 15 }}>Scan QR Code</Text>
          </Pressable>

          <Text style={{ fontSize: 12, color: '#C8C6C5', textAlign: 'center' }}>
            Don't have a code? <Text style={{ color: '#FF6600', fontWeight: '700' }}>Ask your canteen manager.</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* QR Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          {/* Overlay */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none' }}>
            <View style={{ width: 240, height: 240, borderWidth: 2, borderColor: '#FF6600', borderRadius: 16, backgroundColor: 'transparent' }} />
            <Text style={{ color: '#FFFFFF', marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40 }}>
              Point your camera at the canteen QR code
            </Text>
          </View>
          {/* Close button */}
          <Pressable
            onPress={() => setScannerOpen(false)}
            style={{ position: 'absolute', top: 52, right: 20, width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <X color="#FFFFFF" size={22} />
          </Pressable>
        </View>
      </Modal>
    </ImageBackground>
  );
}
