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
      preparing: { title: '👨‍🍳 Order Being Prepared', body: 'Your canteen is now preparing your order.' },
      ready: {
        title: '🎉 Order Ready for Pickup!',
        body: pickupCode ? `Show code ${pickupCode} at the counter.` : 'Your order is ready! Head to the counter.',
      },
      completed: { title: '✔ Order Completed', body: 'Thanks for dining with CanteenGo!' },
      cancelled: { title: '❌ Order Cancelled', body: 'Your order was cancelled. Contact the canteen for details.' },
    };

    const msg = messages[status];
    if (msg) {
      await this.sendLocalNotification(msg.title, msg.body, { type: 'order_status', status });
    }
  },
};
