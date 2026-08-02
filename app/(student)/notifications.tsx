import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCircle2, AlertCircle, Gift, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useMarkAllNotificationsAsRead, useNotifications } from '../../lib/hooks/useNotifications';
import { useStudentOrders } from '../../lib/hooks/useOrders';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { showSuccessToast } from '../../lib/errorHandler';

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

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'order': return CheckCircle2;
    case 'system': return AlertCircle;
    case 'promo': return Gift;
    default: return Bell;
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'order': return '#10B981';
    case 'system': return '#FF6600';
    case 'promo': return '#8B5CF6';
    default: return '#64748B';
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);

  const { data: dbNotifications, isLoading } = useNotifications(user?.id, true);
  const { data: studentOrders } = useStudentOrders(user?.id);
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const displayNotifications = useMemo(() => {
    const list: Array<{ id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }> = [];

    // 1. Direct DB Notifications for user
    if (dbNotifications && dbNotifications.length > 0) {
      dbNotifications.forEach((n) => {
        list.push({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'order',
          is_read: n.is_read,
          created_at: n.created_at,
        });
      });
    }

    // 2. Synthesize dynamic notifications from student's real database orders
    if (studentOrders && studentOrders.length > 0) {
      studentOrders.forEach((o) => {
        const orderShortId = `#CQ-${o.id.slice(0, 4).toUpperCase()}`;
        if (o.status === 'ready') {
          list.push({
            id: `ord-ready-${o.id}`,
            title: 'Order Ready for Pickup!',
            message: `Your order ${orderShortId} is READY! Pickup code: ${o.pickup_code || ''}`,
            type: 'order',
            is_read: false,
            created_at: o.updated_at || o.created_at,
          });
        } else if (o.status === 'preparing') {
          list.push({
            id: `ord-prep-${o.id}`,
            title: 'Order Preparing',
            message: `Your order ${orderShortId} is being prepared in the kitchen.`,
            type: 'order',
            is_read: false,
            created_at: o.updated_at || o.created_at,
          });
        } else if (o.status === 'pending') {
          list.push({
            id: `ord-pend-${o.id}`,
            title: 'Order Placed',
            message: `Your order ${orderShortId} (रू ${o.total_amount}) has been received.`,
            type: 'order',
            is_read: true,
            created_at: o.created_at,
          });
        } else if (o.status === 'completed') {
          list.push({
            id: `ord-comp-${o.id}`,
            title: 'Order Completed',
            message: `Your order ${orderShortId} was picked up and completed. Thank you!`,
            type: 'order',
            is_read: true,
            created_at: o.updated_at || o.created_at,
          });
        }
      });
    }

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dbNotifications, studentOrders]);

  const unreadCount = useMemo(() => displayNotifications.filter((n) => !n.is_read).length, [displayNotifications]);

  const handleMarkAll = () => {
    if (user?.id) {
      markAllAsRead.mutate(user.id);
    } else {
      showSuccessToast('All notifications marked as read');
    }
  };

  if (isLoading && !user?.id) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Notifications</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAll}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF6600' }}>Mark All Read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={displayNotifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const Icon = getTypeIcon(item.type);
          const accent = getTypeColor(item.type);
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: !item.is_read ? 'rgba(255,102,0,0.3)' : colors.border,
                opacity: item.is_read ? 0.85 : 1,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${accent}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon color={accent} size={20} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 8 }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '600', flexShrink: 0 }}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.subtext, lineHeight: 18 }}>
                  {item.message}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Bell color={colors.mutedText} size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.subtext }}>No notifications yet</Text>
            <Text style={{ fontSize: 12, color: colors.mutedText, marginTop: 4 }}>
              Updates on orders and promos will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}
