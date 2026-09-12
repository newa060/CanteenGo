import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Check, CheckCheck, Menu as MenuIcon, Trash2 } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '../../lib/hooks/useNotifications';
import { showSuccessToast } from '../../lib/errorHandler';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return 'Recent';
  }
};

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: rawNotifs, isLoading } = useNotifications(user?.id, true);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = useMemo(() => {
    const list = rawNotifs || [];
    if (filter === 'unread') {
      return list.filter((n) => !n.is_read);
    }
    return list;
  }, [rawNotifs, filter]);

  const unreadCount = useMemo(() => (rawNotifs || []).filter((n) => !n.is_read).length, [rawNotifs]);

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id, {
      onSuccess: () => showSuccessToast('Marked as read'),
    });
  };

  const handleMarkAllRead = () => {
    if (user?.id) {
      markAllAsRead.mutate(user.id);
    }
  };

  const confirmDelete = (id: string, title: string) => {
    const doDelete = () => {
      deleteNotification.mutate(id, {
        onSuccess: () => showSuccessToast('Notification deleted'),
      });
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

  if (isLoading && !rawNotifs) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AdminDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Top Header */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 14,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notifications & Alerts
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {unreadCount > 0 ? `${unreadCount} UNREAD ALERTS` : 'ALL CAUGHT UP'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,102,0,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,102,0,0.3)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <CheckCheck color="#FF6600" size={14} />
            <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>MARK ALL READ</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setFilter('all')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: filter === 'all' ? '#FF6600' : colors.surface,
            borderWidth: 1,
            borderColor: filter === 'all' ? '#FF6600' : colors.border,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: filter === 'all' ? '#FFFFFF' : colors.text }}>
            ALL ({rawNotifs?.length || 0})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('unread')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: filter === 'unread' ? '#FF6600' : colors.surface,
            borderWidth: 1,
            borderColor: filter === 'unread' ? '#FF6600' : colors.border,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: filter === 'unread' ? '#FFFFFF' : colors.text }}>
            UNREAD ({unreadCount})
          </Text>
        </Pressable>
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: !item.is_read ? 'rgba(255,102,0,0.3)' : colors.border,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {/* Status Indicator / Icon */}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: !item.is_read ? 'rgba(255,102,0,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell color={!item.is_read ? '#FF6600' : colors.mutedText} size={18} />
            </View>

            {/* Message text */}
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 8 }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '600' }}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.subtext, lineHeight: 17 }}>
                {item.message}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {!item.is_read && (
                <Pressable
                  onPress={() => handleMarkRead(item.id)}
                  hitSlop={8}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  }}
                >
                  <Check color="#FF6600" size={16} />
                </Pressable>
              )}
              <Pressable
                onPress={() => confirmDelete(item.id, item.title)}
                hitSlop={8}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239,68,68,0.1)',
                }}
              >
                <Trash2 color="#EF4444" size={16} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
            <Bell color={colors.mutedText} size={48} style={{ opacity: 0.35 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No notifications found</Text>
            <Text style={{ fontSize: 12, color: colors.mutedText, textAlign: 'center' }}>
              {filter === 'unread' ? 'You have read all your notifications.' : 'New orders and alerts will appear here.'}
            </Text>
          </View>
        }
      />

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
                    deleteNotification.mutate(deleteTarget.id, {
                      onSuccess: () => showSuccessToast('Notification deleted'),
                    });
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
    </View>
  );
}
