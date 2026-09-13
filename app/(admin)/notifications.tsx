import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Package,
  Trash2,
} from 'lucide-react-native';
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
import { Tables } from '../../types/database';

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

const getTypeIcon = (type: string | null) => {
  switch (type) {
    case 'order':  return CheckCircle2;
    case 'system': return AlertCircle;
    case 'promo':  return Package;
    default:       return Bell;
  }
};

const getTypeColor = (type: string | null): string => {
  switch (type) {
    case 'order':  return '#10B981';
    case 'system': return '#FF6600';
    case 'promo':  return '#8B5CF6';
    default:       return '#FF6600';
  }
};

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: rawNotifs, isLoading } = useNotifications(user?.id, true);
  const markAsRead    = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotif   = useDeleteNotification();

  const notifications = useMemo(() => {
    const list = rawNotifs || [];
    return filter === 'unread' ? list.filter((n) => !n.is_read) : list;
  }, [rawNotifs, filter]);

  const unreadCount = useMemo(
    () => (rawNotifs || []).filter((n) => !n.is_read).length,
    [rawNotifs],
  );

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id, { onSuccess: () => showSuccessToast('Marked as read') });
  };

  const handleMarkAllRead = () => {
    if (user?.id) markAllAsRead.mutate(user.id);
  };

  const handleDelete = (item: Tables<'notifications'>) => {
    const doDelete = () => {
      deleteNotif.mutate(item.id, { onSuccess: () => showSuccessToast('Notification deleted') });
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Delete "${item.title}"?`)) doDelete();
    } else {
      Alert.alert(
        'Delete Notification',
        `Delete "${item.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ],
        { cancelable: true },
      );
    }
  };

  if (isLoading && !rawNotifs) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 14,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? 'rgba(255,102,0,0.2)' : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 8,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notifications & Alerts
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,102,0,0.1)',
              borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)',
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
            }}
          >
            <CheckCheck color="#FF6600" size={14} />
            <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
              MARK ALL READ
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', gap: 8 }}>
        {(['all', 'unread'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
              backgroundColor: filter === f ? '#FF6600' : colors.surface,
              borderWidth: 1, borderColor: filter === f ? '#FF6600' : colors.border,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: filter === f ? '#FFFFFF' : colors.text }}>
              {f === 'all' ? `ALL (${rawNotifs?.length || 0})` : `UNREAD (${unreadCount})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const Icon   = getTypeIcon(item.type);
          const accent = getTypeColor(item.type);
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16, padding: 16,
                borderWidth: 1,
                borderColor: !item.is_read ? 'rgba(255,102,0,0.3)' : colors.border,
                opacity: item.is_read ? 0.88 : 1,
                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              }}
            >
              {/* Type icon — tap to mark read */}
              <Pressable
                onPress={() => !item.is_read && handleMarkRead(item.id)}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: `${accent}20`,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <Icon color={accent} size={20} />
              </Pressable>

              {/* Content */}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 8 }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '600', flexShrink: 0 }}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.subtext, lineHeight: 17 }}>
                  {item.message}
                </Text>
                {!item.is_read && (
                  <Pressable onPress={() => handleMarkRead(item.id)} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6600' }}>Mark as read</Text>
                  </Pressable>
                )}
              </View>

              {/* Delete — always visible */}
              <Pressable
                onPress={() => handleDelete(item)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: pressed ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.09)',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                })}
              >
                <Trash2 color="#EF4444" size={16} />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
            <Bell color={colors.mutedText} size={48} style={{ opacity: 0.35 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No notifications found</Text>
            <Text style={{ fontSize: 12, color: colors.mutedText, textAlign: 'center' }}>
              {filter === 'unread'
                ? 'You have read all your notifications.'
                : 'New orders and alerts will appear here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
