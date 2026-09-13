import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const PUSH_ENABLED_KEY = '@canteengo_push_notifications_enabled';

// Dynamically import expo-notifications only if NOT in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[Push] Module load skipped:', e);
  }
}

const pushListeners = new Set<(enabled: boolean) => void>();
const missedListeners = new Set<(hasMissed: boolean) => void>();
let currentMissed = false;

export const pushNotificationService = {
  async isEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(PUSH_ENABLED_KEY, String(enabled));
      if (enabled) {
        currentMissed = false;
        missedListeners.forEach((l) => l(false));
      }
      pushListeners.forEach((l) => l(enabled));
    } catch (e) {
      console.warn('[Push] Failed to save notification setting:', e);
    }
  },

  subscribe(listener: (enabled: boolean) => void) {
    pushListeners.add(listener);
    this.isEnabled().then(listener);
    return () => {
      pushListeners.delete(listener);
    };
  },

  recordMissedNotification() {
    currentMissed = true;
    missedListeners.forEach((l) => l(true));
  },

  hasMissedNotification(): boolean {
    return currentMissed;
  },

  subscribeMissed(listener: (hasMissed: boolean) => void) {
    missedListeners.add(listener);
    listener(currentMissed);
    return () => {
      missedListeners.delete(listener);
    };
  },

  clearMissedNotification() {
    currentMissed = false;
    missedListeners.forEach((l) => l(false));
  },
  async requestPermission(): Promise<boolean> {
    if (isExpoGo || !Notifications || !Device) {
      return false;
    }
    if (!Device.isDevice) {
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      return false;
    }
  },

  async sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    if (isExpoGo || !Notifications) return;
    const enabled = await this.isEnabled();
    if (!enabled) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          color: '#FF6600',
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('[Push] Failed to send notification:', e);
    }
  },

  async notifyNewOrder(orderDetails: { customer: string; total: string; items: number }) {
    await this.sendLocalNotification(
      '🔔 New Order Received!',
      `${orderDetails.customer} ordered ${orderDetails.items} item(s) — रू ${orderDetails.total}`,
      { type: 'new_order' }
    );
  },

  async notifyOrderStatusChange(status: string, pickupCode?: string) {
    const messages: Record<string, { title: string; body: string }> = {
      confirmed: { title: '✅ Order Confirmed!', body: 'Your order has been confirmed by the canteen.' },
      preparing: { title: '✅ Order Accepted!', body: 'Your order has been accepted and is now being prepared.' },
      ready: { title: '🍽️ Food Ready for Pickup!', body: `Your order is ready! ${pickupCode ? `Pickup code: ${pickupCode}` : 'Show your QR code at the counter.'}` },
      cancelled: { title: '❌ Order Rejected', body: 'Your order was rejected by the canteen. Please contact them for details.' },
      completed: { title: '✅ Order Completed!', body: 'Your order has been picked up. Thank you for using CanteenGo!' },
    };

    const msg = messages[status];
    if (msg) {
      await this.sendLocalNotification(msg.title, msg.body, { type: 'order_status', status });
    }
  },
};
