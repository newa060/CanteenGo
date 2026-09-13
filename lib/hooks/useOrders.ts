import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderRepository, CreateOrderData } from '../repositories/orderRepository';
import { UpdateTables } from '../../types/database';
import { OrderStatus } from '../../types';
import { showSuccessToast, showErrorToast } from '../errorHandler';
import { pushNotificationService } from '../pushNotificationService';
import { notificationRepository } from '../repositories/notificationRepository';
import { supabase } from '../supabase';

export const ORDERS_QUERY_KEY = 'orders';
export const ORDER_QUERY_KEY = 'order';
export const ORDER_ITEMS_QUERY_KEY = 'order_items';

export const useStudentOrders = (studentId: string | undefined | null) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'student', studentId],
    queryFn: () => orderRepository.listForStudent(studentId as string),
    enabled: !!studentId,
    refetchInterval: 5000,
  });
};

export const useCanteenOrders = (canteenId?: string) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'canteen', canteenId],
    queryFn: () => orderRepository.listForCanteen(canteenId),
    refetchInterval: 3000,
  });
};

export const useOrdersByStatus = (status?: OrderStatus, canteenId?: string) => {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'status', status, canteenId],
    queryFn: () => orderRepository.listAllByStatus(status, canteenId),
  });
};

export const useOrder = (id: string | undefined | null) => {
  return useQuery({
    queryKey: [ORDER_QUERY_KEY, id],
    queryFn: () => orderRepository.getById(id as string),
    enabled: !!id,
  });
};

export const useOrderItems = (orderId: string | undefined | null) => {
  return useQuery({
    queryKey: [ORDER_ITEMS_QUERY_KEY, orderId],
    queryFn: () => orderRepository.getOrderItems(orderId as string),
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderData) => orderRepository.create(data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      showSuccessToast('Order placed successfully!');

      // Create DB Notification for Student
      if (data.student_id) {
        notificationRepository.create({
          user_id: data.student_id,
          title: 'Order Placed!',
          message: `Your order #${data.id.slice(0, 8)} has been placed successfully.`,
          type: 'order',
        }).catch(() => {});
      }

      // Create DB Notification for Canteen Admins (if canteen linked)
      if (data.canteen_id) {
        const { data: canteenAdmins } = await supabase
          .from('profiles')
          .select('id')
          .eq('canteen_id', data.canteen_id)
          .eq('role', 'admin');

        if (canteenAdmins) {
          canteenAdmins.forEach((admin) => {
            notificationRepository.create({
              user_id: admin.id,
              title: 'New Order Received',
              message: `New order #${data.id.slice(0, 8)} received for रू ${data.total_amount}.`,
              type: 'order',
            }).catch(() => {});
          });
        }
      }
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      orderRepository.updateStatus(orderId, status),
    onSuccess: (data) => {
      queryClient.setQueryData([ORDER_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      if (data.status === 'cancelled') {
        showErrorToast('Order cancelled');
      } else {
        showSuccessToast(`Order ${data.status}`);
      }

      // Create DB Notification for Student based on status
      const statusMsgMap: Record<string, { title: string; message: string }> = {
        preparing: {
          title: 'Order Accepted! 🎉',
          message: `Your order #${data.id.slice(0, 8)} has been accepted and is now being prepared!`,
        },
        ready: {
          title: '🍽️ Food Ready for Pickup!',
          message: `Your order #${data.id.slice(0, 8)} is ready! Show your pickup code at the counter.`,
        },
        cancelled: {
          title: 'Order Rejected ❌',
          message: `Your order #${data.id.slice(0, 8)} was rejected by the canteen.`,
        },
        completed: {
          title: 'Order Completed ✅',
          message: `Your order #${data.id.slice(0, 8)} has been picked up. Thank you!`,
        },
      };

      if (data.student_id && statusMsgMap[data.status]) {
        const notif = statusMsgMap[data.status];
        notificationRepository.create({
          user_id: data.student_id,
          title: notif.title,
          message: notif.message,
          type: 'order',
        }).catch(() => {});
      }

      // Send local push notification to student device
      if (data.status === 'preparing' || data.status === 'cancelled' || data.status === 'ready') {
        pushNotificationService.notifyOrderStatusChange(data.status, (data as any).pickup_code);
      }
    },
  });
};

/** Helper: create a notification for the currently-logged-in admin user.
 *  Because this is called from an admin session, RLS allows self-insert. */
export const createAdminSelfNotification = (adminUserId: string, title: string, message: string) => {
  return notificationRepository.create({
    user_id: adminUserId,
    title,
    message,
    type: 'order',
  }).catch(() => {});
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTables<'orders'> }) =>
      orderRepository.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData([ORDER_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      showSuccessToast('Order updated');
    },
  });
};
