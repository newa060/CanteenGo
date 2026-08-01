import { supabase } from './supabase';
import { OrderStatus } from '../types';
import { showInfoToast, showSuccessToast } from './errorHandler';
import { queryClient } from './queryClient';
import { ORDERS_QUERY_KEY } from './hooks/useOrders';
import { PRODUCTS_QUERY_KEY } from './hooks/useProducts';
import { NOTIFICATIONS_QUERY_KEY, NOTIFICATION_UNREAD_COUNT_KEY } from './hooks/useNotifications';
import { Tables } from '../types/database';

export interface RealtimeSubscriptions {
  orders?: any;
  products?: any;
  notifications?: any;
}

const activeSubscriptions: RealtimeSubscriptions = {};

const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  } catch {
    return null;
  }
};

export const realtimeService = {
  subscribeToOrdersForStudent(studentId: string) {
    if (activeSubscriptions.orders) {
      this.unsubscribe('orders');
    }

    const channel = supabase
      .channel('orders-changes-student')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `student_id=eq.${studentId}`,
        },
        (payload: any) => {
          console.log('[Realtime] Order update for student:', payload);
          queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'student', studentId] });

          if (payload.eventType === 'INSERT') {
            showInfoToast('New order placed!');
          } else if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status as OrderStatus;
            const statusMessages: Record<string, string> = {
              confirmed: 'Your order has been confirmed!',
              preparing: 'Your order is being prepared...',
              ready: '🎉 Your order is ready for pickup!',
              completed: 'Your order has been completed.',
              cancelled: 'Your order was cancelled.',
            };
            if (statusMessages[newStatus]) {
              showSuccessToast(statusMessages[newStatus]);
            }
          }
        }
      )
      .subscribe();

    activeSubscriptions.orders = { channel, key: 'orders' };
    return channel;
  },

  subscribeToOrdersForCanteen(canteenId?: string) {
    if (activeSubscriptions.orders) {
      this.unsubscribe('orders');
    }

    const filter = canteenId ? `canteen_id=eq.${canteenId}` : undefined;

    const channel = supabase
      .channel('orders-changes-canteen')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          console.log('[Realtime] Order update for canteen:', payload);
          queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });

          if (payload.eventType === 'INSERT') {
            showInfoToast('New incoming order!');
          }
        }
      )
      .subscribe();

    activeSubscriptions.orders = { channel, key: 'orders' };
    return channel;
  },

  subscribeToProducts(canteenId?: string) {
    if (activeSubscriptions.products) {
      this.unsubscribe('products');
    }

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload: any) => {
          console.log('[Realtime] Product change:', payload);
          queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });

          if (payload.eventType === 'UPDATE') {
            const product = payload.new as Tables<'products'>;
            if (product.stock !== null && product.stock <= 5 && product.is_available) {
              showInfoToast(`Low stock: ${product.name} (${product.stock} left)`);
            }
            if (!product.is_available) {
              showInfoToast(`${product.name} is now unavailable`);
            }
          }
        }
      )
      .subscribe();

    activeSubscriptions.products = { channel, key: 'products' };
    return channel;
  },

  subscribeToNotifications(userId: string) {
    if (activeSubscriptions.notifications) {
      this.unsubscribe('notifications');
    }

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('[Realtime] New notification:', payload);
          queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
          queryClient.invalidateQueries({ queryKey: [NOTIFICATION_UNREAD_COUNT_KEY, userId] });

          const notification = payload.new as Tables<'notifications'>;
          if (notification) {
            showInfoToast(notification.title);
          }
        }
      )
      .subscribe();

    activeSubscriptions.notifications = { channel, key: 'notifications' };
    return channel;
  },

  unsubscribe(key: keyof RealtimeSubscriptions) {
    const sub = activeSubscriptions[key];
    if (sub?.channel) {
      supabase.removeChannel(sub.channel).catch(() => {});
      delete activeSubscriptions[key];
    }
  },

  unsubscribeAll() {
    (Object.keys(activeSubscriptions) as Array<keyof RealtimeSubscriptions>).forEach((key) => {
      this.unsubscribe(key);
    });
  },

  getActiveSubscriptions(): RealtimeSubscriptions {
    return { ...activeSubscriptions };
  },
};
