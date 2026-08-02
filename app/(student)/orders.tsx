import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ClipboardList, Clock, QrCode as QrCodeIcon, X } from 'lucide-react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentOrders } from '../../lib/hooks/useOrders';
import { orderRepository } from '../../lib/repositories/orderRepository';
import { optimizeImageUrl } from '../../lib/cloudinary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const MOCK_STUDENT_ORDERS = [
  {
    id: '#ORD-8821',
    date: 'Today, 12:45 PM',
    status: 'READY',
    pickupCode: 'A7-B4',
    canteen: 'Main Hub Canteen',
    items: [
      { name: 'Classic Chicken Momo', qty: 2, price: 360 },
      { name: 'Iced Cold Coffee', qty: 1, price: 120 },
    ],
    total: 480,
  },
  {
    id: '#ORD-8790',
    date: 'Yesterday, 1:15 PM',
    status: 'COMPLETED',
    pickupCode: 'K2-M9',
    canteen: 'Main Hub Canteen',
    items: [{ name: 'Veg Hakka Noodles', qty: 1, price: 150 }],
    total: 150,
  },
];

const formatOrderDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const time = `${h12}:${mins} ${ampm}`;
    if (sameDay) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()}, ${time}`;
  } catch {
    return isoDate;
  }
};

const isToday = (isoDate: string): boolean => {
  try {
    return new Date(isoDate).toDateString() === new Date().toDateString();
  } catch {
    return true;
  }
};

export default function StudentOrdersScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [selectedQrOrder, setSelectedQrOrder] = useState<any | null>(null);

  const { data: rawOrders, isLoading } = useStudentOrders(user?.id);
  const orders = rawOrders || [];
  const orderIds = useMemo(() => orders.map((o) => o.id).join(','), [orders]);

  const { data: allItemsMap } = useQuery({
    queryKey: ['order_items_batch', orderIds],
    enabled: orders.length > 0,
    queryFn: async () => {
      const result: Record<string, any[]> = {};
      await Promise.all(
        orders.map(async (o) => {
          try {
            result[o.id] = await orderRepository.getOrderItems(o.id);
          } catch {
            result[o.id] = [];
          }
        }),
      );
      return result;
    },
  });

  const displayOrders = useMemo(() => {
    if (user?.id) {
      return orders
        .filter((o) => {
          if (activeTab === 'today') {
            return isToday(o.created_at);
          }
          return !isToday(o.created_at) || o.status === 'completed' || o.status === 'cancelled';
        })
        .map((o) => {
          const orderItems = (allItemsMap?.[o.id] as any[]) || [];
          const displayItems = orderItems.map((it: any) => ({
            name: it?.products?.name || 'Menu Item',
            qty: it.quantity,
            price: it.unit_price * it.quantity,
          }));
          if (displayItems.length === 0) {
            displayItems.push({ name: 'Order Items', qty: 1, price: o.total_amount });
          }
          return {
            id: `#ORD-${o.id.slice(0, 4).toUpperCase()}`,
            rawId: o.id,
            date: formatOrderDate(o.created_at),
            status: (o.status || 'pending').toUpperCase(),
            pickupCode: o.pickup_code || o.id.slice(0, 6).toUpperCase(),
            canteen: 'Main Hub Canteen',
            items: displayItems,
            total: o.total_amount,
          };
        });
    }
    return MOCK_STUDENT_ORDERS.filter((o) =>
      activeTab === 'today' ? o.status === 'READY' : o.status === 'COMPLETED',
    );
  }, [orders, allItemsMap, activeTab, user?.id]);

  if (isLoading && !user?.id) {
    return <LoadingScreen message="Loading orders..." />;
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
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Order History</Text>
        <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Track your live and past cafeteria orders</Text>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
        <Pressable
          onPress={() => setActiveTab('today')}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor: activeTab === 'today' ? '#FF6600' : colors.surface,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: activeTab === 'today' ? '#FF6600' : colors.border,
          }}
        >
          <Text style={{ color: activeTab === 'today' ? '#FFFFFF' : colors.subtext, fontWeight: '800', fontSize: 13 }}>Today's Orders</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('history')}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor: activeTab === 'history' ? '#FF6600' : colors.surface,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: activeTab === 'history' ? '#FF6600' : colors.border,
          }}
        >
          <Text style={{ color: activeTab === 'history' ? '#FFFFFF' : colors.subtext, fontWeight: '800', fontSize: 13 }}>Past 7 Days</Text>
        </Pressable>
      </View>

      {/* Orders List */}
      <FlatList
        data={displayOrders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{item.id}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* QR Code Icon Trigger */}
                <Pressable
                  onPress={() => setSelectedQrOrder(item)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,102,0,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,102,0,0.3)',
                  }}
                >
                  <QrCodeIcon color="#FF6600" size={18} />
                </Pressable>

                <View
                  style={{
                    backgroundColor: item.status === 'READY' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: item.status === 'READY' ? '#10B981' : colors.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Clock color={colors.mutedText} size={12} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: colors.subtext }}>{item.date}</Text>
            </View>

            {/* Receiving Code Card */}
            {item.status === 'READY' && (
              <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>RECEIVING CODE</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#FF6600', letterSpacing: 3 }}>{item.pickupCode}</Text>
              </View>
            )}

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 4 }}>
              {item.items.map((it, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{it.name} ×{it.qty}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>रू {it.price}</Text>
                </View>
              ))}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.subtext }}>Total Paid</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600' }}>रू {item.total}</Text>
            </View>
          </View>
        )}
      />

      {/* Student Order QR Code Modal */}
      {selectedQrOrder && (
        <Modal transparent animationType="fade" visible={!!selectedQrOrder} onRequestClose={() => setSelectedQrOrder(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 320, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#FF6600', padding: 20, alignItems: 'center', gap: 16 }}>
              {/* Header */}
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600', letterSpacing: 1 }}>ORDER QR CODE</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700' }}>SHOW AT CANTEEN COUNTER</Text>
                </View>
                <Pressable onPress={() => setSelectedQrOrder(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              {/* QR Code Container */}
              <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
                <QRCodeSVG
                  value={selectedQrOrder.pickupCode || selectedQrOrder.rawId}
                  size={180}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </View>

              {/* Details */}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, color: colors.mutedText, fontWeight: '700', letterSpacing: 1 }}>PICKUP CODE</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF6600', letterSpacing: 4 }}>{selectedQrOrder.pickupCode}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 4 }}>{selectedQrOrder.id}</Text>
              </View>

              {/* Close Button */}
              <Pressable
                onPress={() => setSelectedQrOrder(null)}
                style={{ width: '100%', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

