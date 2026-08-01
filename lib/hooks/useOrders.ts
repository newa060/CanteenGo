import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderRepository, CreateOrderData } from '../repositories/orderRepository';
import { UpdateTables } from '../../types/database';
import { OrderStatus } from '../../types';
import { showSuccessToast } from '../errorHandler';
import { pushNotificationService } from '../pushNotificationService';

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'student', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'canteen'] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'status'] });
      showSuccessToast('Order placed successfully!');
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
      showSuccessToast(`Order ${data.status}`);
      // Send device push notification to student
      pushNotificationService.notifyOrderStatusChange(data.status, (data as any).pickup_code);
    },
  });
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
