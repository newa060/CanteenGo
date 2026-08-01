import React, { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { authService } from '../../lib/services/authService';
import { showErrorToast, showSuccessToast } from '../../lib/errorHandler';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authService.signInWithOtp({ email, shouldCreateUser: true });
      showSuccessToast('Verification code sent! Check your email.');
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
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
            <Zap color="#FF6600" size={28} />
          </View>

          <Text style={{ fontSize: 26, fontWeight: '800', color: '#E5E2E1', marginBottom: 6 }}>
            Canteen<Text style={{ color: '#FF6600' }}>Go</Text>
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
            Enter your university email to receive a 6-digit authentication code
          </Text>

          <View style={{ width: '100%', marginBottom: 12 }}>
            <Input
              label="EMAIL ADDRESS"
              placeholder="student@univ.edu or admin@univ.edu"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
            />
          </View>

          <Button
            title="Send OTP Code"
            onPress={handleSendOTP}
            loading={loading}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: '#FF6600',
              borderRadius: 8,
              marginTop: 4,
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
