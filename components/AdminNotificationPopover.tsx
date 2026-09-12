import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Check, CheckCheck, Trash2, X, Settings } from 'lucide-react-native';
import { getThemeColors, useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '../lib/hooks/useNotifications';
import { showSuccessToast } from '../lib/errorHandler';

interface AdminNotificationPopoverProps {
  visible: boolean;
  onClose: () => void;
}

const formatNotifTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return 'Recent';
  }
};

export default function AdminNotificationPopover({ visible, onClose }: AdminNotificationPopoverProps) {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);

  const { data: rawNotifs } = useNotifications(user?.id, true);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [dismissedLocalIds, setDismissedLocalIds] = useState<Set<string>>(new Set());

  const notificationsList = useMemo(() => {
    if (rawNotifs && rawNotifs.length > 0) {
      return rawNotifs
        .filter((n) => !dismissedLocalIds.has(n.id))
        .map((n) => ({
          id: n.id,
          title: n.title,
          desc: n.message,
          time: formatNotifTime(n.created_at),
          isRead: n.is_read,
          isDb: true,
        }));
    }
    return [];
  }, [rawNotifs, dismissedLocalIds]);

  const unreadCount = useMemo(() => notificationsList.filter((n) => !n.isRead).length, [notificationsList]);

  const handleMarkRead = (id: string, isDb: boolean) => {
    if (isDb) {
      markAsRead.mutate(id, {
        onSuccess: () => showSuccessToast('Notification marked as read'),
      });
    }
  };

  const handleMarkAllRead = () => {
    if (user?.id) {
      markAllAsRead.mutate(user.id);
    }
  };

  const confirmDelete = (id: string, title: string, isDb: boolean) => {
    const doDelete = () => {
      if (isDb) {
        deleteNotification.mutate(id, {
          onSuccess: () => showSuccessToast('Notification deleted'),
        });
      } else {
        setDismissedLocalIds((prev) => new Set([...prev, id]));
        showSuccessToast('Notification dismissed');
      }
      setDeleteTarget(null);
    };

    if (Platform.OS === 'web') {
      setDeleteTarget({ id, title });
    } else {
      Alert.alert(
        'Delete Notification',
        `Are you sure you want to delete "${title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ],
        { cancelable: true }
      );
    }
  };

  if (!visible) return null;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: 96,
          right: 16,
          width: 320,
          maxHeight: 460,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,102,0,0.3)',
          zIndex: 99,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          elevation: 12,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <View
          style={{
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: isDarkMode ? 'rgba(255,102,0,0.06)' : '#FFF7ED',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Bell color="#FF6600" size={16} />
            <Text style={{ color: '#FF6600', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: '#FF6600', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>{unreadCount} NEW</Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckCheck color="#FF6600" size={14} />
              <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800' }}>Mark All Read</Text>
            </Pressable>
          )}
        </View>

        {/* Notifications List */}
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 4 }}>
          {notificationsList.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
              <Bell color={colors.mutedText} size={32} style={{ opacity: 0.4 }} />
              <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: '700' }}>No notifications found</Text>
            </View>
          ) : (
            notificationsList.map((n) => (
              <View
                key={n.id}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: !n.isRead ? (isDarkMode ? 'rgba(255,102,0,0.04)' : 'rgba(255,102,0,0.02)') : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                {/* Dot */}
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: !n.isRead ? '#FF6600' : 'transparent',
                    marginTop: 5,
                  }}
                />

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 6 }}>
                      {n.title}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.mutedText, fontWeight: '600' }}>{n.time}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 2, lineHeight: 15 }}>{n.desc}</Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {!n.isRead && (
                    <Pressable
                      onPress={() => handleMarkRead(n.id, n.isDb)}
                      hitSlop={6}
                      style={{
                        padding: 4,
                        borderRadius: 6,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                      }}
                    >
                      <Check color="#FF6600" size={14} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => confirmDelete(n.id, n.title, n.isDb)}
                    hitSlop={6}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      backgroundColor: 'rgba(239,68,68,0.1)',
                    }}
                  >
                    <Trash2 color="#EF4444" size={14} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <Pressable
            onPress={() => {
              onClose();
              router.push('/(admin)/notifications');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Bell color="#FF6600" size={14} />
            <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
              View All Notifications
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: colors.mutedText, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Confirmation Modal for Web fallback */}
      {deleteTarget && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 999,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 340,
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>Delete Notification</Text>
              <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 18 }}>
                Are you sure you want to delete "{deleteTarget.title}"? This action cannot be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <Pressable
                  onPress={() => setDeleteTarget(null)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const isDb = true; // DB notification
                    if (isDb) {
                      deleteNotification.mutate(deleteTarget.id, {
                        onSuccess: () => showSuccessToast('Notification deleted'),
                      });
                    }
                    setDeleteTarget(null);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#EF4444',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
