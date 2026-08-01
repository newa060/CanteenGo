import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell, Menu as MenuIcon, Minus, Plus } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteenOrders } from '../../lib/hooks/useOrders';
import { orderRepository } from '../../lib/repositories/orderRepository';
import { LoadingScreen } from '../../components/ui/LoadingScreen';


export default function BulkOrdersScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  const { data: rawOrders, isLoading } = useCanteenOrders(canteenId);
  const orders = rawOrders || [];
  const activeOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'),
    [orders]
  );

  const aggregated = useMemo(() => {
    if (activeOrders.length > 0) {
      const byName: Record<string, { id: string; name: string; total: number }> = {};
      activeOrders.forEach((order: any) => {
        (order.order_items || []).forEach((it: any) => {
          const productName = it?.products?.name || 'Menu Item';
          if (!byName[productName]) {
            byName[productName] = { id: it.product_id || productName, name: productName, total: 0 };
          }
          byName[productName].total += it.quantity;
        });
      });
      return Object.values(byName);
    }
    return [];
  }, [activeOrders]);

  const [items, setItems] = useState<{ id: string; name: string; done: number; total: number }[]>([]);

  React.useEffect(() => {
    if (aggregated.length > 0) {
      setItems((prev) => {
        const existingById = new Map(prev.map((p) => [p.id, p.done]));
        return aggregated.map((a) => ({
          id: a.id,
          name: a.name,
          done: Math.min(existingById.get(a.id) || 0, a.total),
          total: a.total,
        }));
      });
    } else {
      setItems([]);
    }
  }, [aggregated]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const increment = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id && i.done < i.total ? { ...i, done: i.done + 1 } : i)));
  const decrement = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id && i.done > 0 ? { ...i, done: i.done - 1 } : i)));

  if (isLoading && !orders.length && items.length === 0) {
    return <LoadingScreen message="Loading kitchen queue..." />;
  }

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
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <MenuIcon color={colors.text} size={20} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 }}>Kitchen Queue</Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Bulk Orders</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,102,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6600' }} />
            <Text style={{ color: '#FF6600', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Live</Text>
          </View>
          <Pressable
            onPress={() => setNotifOpen(!notifOpen)}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell color={colors.text} size={18} />
          </Pressable>
        </View>
      </View>

      {/* Summary Strip */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 11, color: colors.mutedText, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
          Today's Bulk Prep · {items.reduce((sum, i) => sum + i.total, 0)} Total Items
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {items.map((item) => {
          const pct = Math.round((item.done / item.total) * 100);
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'uppercase' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {/* Progress row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF6600' }}>{item.done} / {item.total}</Text>
                    <View style={{ flex: 1, height: 4, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#FF6600', borderRadius: 2 }} />
                    </View>
                  </View>
                </View>

                {/* Controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                  <Pressable
                    onPress={() => decrement(item.id)}
                    style={{ width: 36, height: 36, backgroundColor: colors.inputBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
                  >
                    <Minus color={colors.text} size={14} />
                  </Pressable>
                  <Pressable
                    onPress={() => increment(item.id)}
                    style={{ width: 36, height: 36, backgroundColor: '#FF6600', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus color="#FFFFFF" size={14} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
