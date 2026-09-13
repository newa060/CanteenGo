import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

export const pushNotificationService = {
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
