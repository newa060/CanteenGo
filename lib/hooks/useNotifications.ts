import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationRepository } from '../repositories/notificationRepository';
import { InsertTables } from '../../types/database';
import { showSuccessToast } from '../errorHandler';

export const NOTIFICATIONS_QUERY_KEY = 'notifications';
export const NOTIFICATION_QUERY_KEY = 'notification';
export const NOTIFICATION_UNREAD_COUNT_KEY = 'notifications_unread_count';

export const useNotifications = (userId: string | undefined | null, includeRead: boolean = true) => {
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, userId, includeRead],
    queryFn: () => notificationRepository.listForUser(userId as string, includeRead),
    enabled: !!userId,
  });
};

export const useNotification = (id: string | undefined | null) => {
  return useQuery({
    queryKey: [NOTIFICATION_QUERY_KEY, id],
    queryFn: () => notificationRepository.getById(id as string),
    enabled: !!id,
  });
};

export const useUnreadNotificationCount = (userId: string | undefined | null) => {
  return useQuery({
    queryKey: [NOTIFICATION_UNREAD_COUNT_KEY, userId],
    queryFn: () => notificationRepository.unreadCount(userId as string),
    enabled: !!userId,
    refetchInterval: 30000,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notification: InsertTables<'notifications'>) => notificationRepository.create(notification),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, variables.user_id] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_UNREAD_COUNT_KEY, variables.user_id] });
    },
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationRepository.markAsRead(id),
    onSuccess: (data) => {
      queryClient.setQueryData([NOTIFICATION_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_UNREAD_COUNT_KEY] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => notificationRepository.markAllAsRead(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_UNREAD_COUNT_KEY, userId] });
      showSuccessToast('All notifications marked as read');
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_UNREAD_COUNT_KEY] });
    },
  });
};
