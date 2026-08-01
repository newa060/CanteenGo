import React, { useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../lib/services/authService';
import { showErrorToast } from '../../lib/errorHandler';

export default function OTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const fetchAndSetProfile = useAuthStore((state) => state.fetchAndSetProfile);
  const setCanteenCode = useAuthStore((state) => state.setCanteenCode);

  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await authService.verifyOtp({ email, code: fullCode });
      if (result.user) {
        const profile = await fetchAndSetProfile(result.user.id);

        if (profile) {
          const userRole = profile.role;
          if (userRole === 'admin') {
            router.replace('/(admin)');
          } else {
            if (profile.canteen_code) {
              setCanteenCode(profile.canteen_code);
              router.replace('/(student)');
            } else {
              router.push({ pathname: '/(auth)/canteen-code', params: { email, otp: fullCode } });
            }
          }
        } else {
          const isStudent = email?.toLowerCase().includes('student') || !email?.toLowerCase().includes('admin');
          if (!isStudent) {
            router.replace('/(admin)');
          } else {
            router.push({ pathname: '/(auth)/canteen-code', params: { email, otp: fullCode } });
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Invalid verification code');
      showErrorToast(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' }}
      style={{ flex: 1, backgroundColor: '#0F0F0F' }}
      imageStyle={{ opacity: 0.18 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}
      >
        <View
          style={{
            backgroundColor: 'rgba(26, 26, 26, 0.92)',
            borderRadius: 16,
            padding: 24,
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
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255, 102, 0, 0.3)',
            }}
          >
            <ShieldCheck color="#FF6600" size={26} />
          </View>

          <Text style={{ fontSize: 26, fontWeight: '800', color: '#E5E2E1', marginBottom: 6 }}>
            Verify Identity
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#E3BFB1',
              textAlign: 'center',
              marginBottom: 24,
              paddingHorizontal: 12,
            }}
          >
            We've sent a 6-digit code to {email || 'your email'}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputs.current[idx] = ref; }}
                value={digit}
                onChangeText={(text) => handleChangeText(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  width: 44,
                  height: 54,
                  backgroundColor: '#1C1B1B',
                  borderWidth: 1,
                  borderColor: digit ? '#FF6600' : '#5A4136',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#E5E2E1',
                  fontFamily: 'JetBrainsMono',
                }}
              />
            ))}
          </View>

          {error ? (
            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</Text>
          ) : null}

          <Button
            title="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: '#FF6600',
              borderRadius: 8,
            }}
          />

          <View
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#353534',
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 0.6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 }} />
              <Text style={{ fontSize: 10, color: '#E5E2E1', fontFamily: 'JetBrainsMono' }}>Auth Server: Online</Text>
            </View>
            <Text style={{ fontSize: 10, color: '#E5E2E1', fontFamily: 'JetBrainsMono' }}>v4.2.1-stable</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
