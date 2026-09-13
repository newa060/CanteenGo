import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Menu as MenuIcon, XCircle } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import AdminNotificationPopover from '../../components/AdminNotificationPopover';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Bell } from 'lucide-react-native';

type HistoryFilter = 'all' | 'completed' | 'cancelled';

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes().toString().padStart(2, '0');
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    const time = `${h}:${m} ${ap}`;
    if (sameDay) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()}, ${time}`;
  } catch {
    return iso;
  }
};

export default function AdminOrderHistoryScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const { data: rawNotifs } = useNotifications(user?.id, false);

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ['admin-order-history', canteenId],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select('*, order_items(*, products(id, name, price))')
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false });
      if (canteenId) q = q.eq('canteen_id', canteenId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 10000,
  });

  const orders = rawOrders || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o: any) => o.status === filter);
  }, [orders, filter]);

  const completedCount = useMemo(() => orders.filter((o: any) => o.status === 'completed').length, [orders]);
  const cancelledCount = useMemo(() => orders.filter((o: any) => o.status === 'cancelled').length, [orders]);

  if (isLoading && !orders.length) {
    return <LoadingScreen message="Loading order history..." />;
  }

  const FILTERS: { key: HistoryFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'completed', label: 'Done', count: completedCount },
    { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AdminDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Top bar */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? 'rgba(255,102,0,0.2)' : colors.border,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={{
              width: 38, height: 38, borderRadius: 8,
              backgroundColor: colors.inputBg,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <MenuIcon color={colors.text} size={20} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 }}>
              Order History
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Completed & Cancelled
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setNotifOpen(!notifOpen)}
          style={{
            width: 38, height: 38, borderRadius: 8,
            backgroundColor: notifOpen ? 'rgba(255,102,0,0.2)' : colors.inputBg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: colors.border,
            position: 'relative',
          }}
        >
          <Bell color={notifOpen ? '#FF6600' : colors.text} size={18} />
          {(rawNotifs || []).length > 0 && (
            <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6600' }} />
          )}
        </Pressable>
      </View>

      <AdminNotificationPopover visible={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              flex: 1, paddingVertical: 9, borderRadius: 8,
              backgroundColor: filter === f.key ? '#FF6600' : colors.surface,
              borderWidth: 1, borderColor: filter === f.key ? '#FF6600' : colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: filter === f.key ? '#FFFFFF' : colors.text }}>
              {f.label}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: filter === f.key ? 'rgba(255,255,255,0.75)' : colors.mutedText }}>
              {f.count} orders
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Orders list */}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}
        renderItem={({ item: o }) => {
          const isDone = o.status === 'completed';
          const accentColor = isDone ? '#10B981' : '#EF4444';
          const oItems: any[] = o.order_items || [];

          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDone ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
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
                  backgroundColor: isDone ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                }}
              >
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Customer
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                    {o.student_name || 'Student'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    backgroundColor: isDone ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                  }}>
                    {isDone
                      ? <CheckCircle2 color={accentColor} size={12} />
                      : <XCircle color={accentColor} size={12} />}
                    <Text style={{ fontSize: 10, fontWeight: '800', color: accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {isDone ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '600' }}>
                    {formatDate(o.created_at)}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 5 }}>
                {oItems.length > 0
                  ? oItems.map((it: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.subtext, fontWeight: '700' }}>
                        {it.quantity}× {it?.products?.name || 'Item'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>
                        रू {((it.unit_price ?? 0) * it.quantity).toFixed(0)}
                      </Text>
                    </View>
                  ))
                  : <Text style={{ fontSize: 12, color: colors.subtext }}>Order items</Text>}
              </View>

              {/* Footer */}
              <View
                style={{
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderTopWidth: 1, borderTopColor: colors.border,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 1 }}>
                  #CQ-{o.id.slice(0, 4).toUpperCase()}
                  {o.pickup_time ? `  ·  ${o.pickup_time}` : ''}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: accentColor }}>
                  रू {(o.total_amount ?? 0).toFixed(0)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <ClipboardList color={colors.mutedText} size={48} style={{ opacity: 0.35 }} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No order history yet</Text>
            <Text style={{ fontSize: 12, color: colors.mutedText, textAlign: 'center' }}>
              Completed and cancelled orders will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
