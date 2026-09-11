import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../store/authStore';
import { authService } from '../lib/services/authService';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { pushNotificationService } from '../lib/pushNotificationService';

export default function RootLayout() {
  const { user, role, isLoading, initialized, initializeAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    initializeAuth();
    pushNotificationService.requestPermission();
  }, [initializeAuth]);

  useEffect(() => {
    const { data } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        hasNavigated.current = false;
        if (event === 'SIGNED_IN' && session?.user) {
          const state = useAuthStore.getState();
          await state.fetchAndSetProfile(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null);
        }
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inStudentGroup = segments[0] === '(student)';

    if (!user) {
      if (!inAuthGroup && !hasNavigated.current) {
        hasNavigated.current = true;
        router.replace('/(auth)/login');
      }
    } else {
      const targetRole = role as 'admin' | 'student' | null;

      if (inAdminGroup && targetRole !== 'admin') {
        hasNavigated.current = false;
        router.replace('/(student)');
        return;
      }

      if (inStudentGroup && targetRole !== 'student') {
        hasNavigated.current = false;
        router.replace('/(admin)');
        return;
      }

      if ((inAuthGroup || segments[0] === undefined) && !hasNavigated.current) {
        hasNavigated.current = true;
        if (targetRole === 'admin') {
          router.replace('/(admin)');
        } else {
          router.replace('/(student)');
        }
      }
    }
  }, [user, role, isLoading, initialized, segments]);

  if (isLoading || !initialized) {
    return <LoadingScreen message="Loading CanteenGo..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
      <Toast />
    </QueryClientProvider>
  );
}
