import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, ChefHat, Filter, Menu as MenuIcon, QrCode, Search, ShieldCheck, X, XCircle } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteenOrders, useUpdateOrder, useUpdateOrderStatus, ORDERS_QUERY_KEY } from '../../lib/hooks/useOrders';
import { orderRepository } from '../../lib/repositories/orderRepository';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { OrderStatus } from '../../types';
import { showSuccessToast, showInfoToast } from '../../lib/errorHandler';
import { optimizeImageUrl } from '../../lib/cloudinary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabase';
import { pushNotificationService } from '../../lib/pushNotificationService';


const formatPaidAt = (iso: string): string => {
  try {
    const d = new Date(iso);
    const h12 = d.getHours() % 12 || 12;
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return `${h12}:${mins} ${ampm} ${isToday ? 'Today' : ''}`.trim();
  } catch {
    return 'Paid';
  }
};

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

type AdminOrderItem = {
  id: string;
  rawId: string;
  customer: string;
  slot: string;
  items: { name: string; price: string }[];
  total: string;
  totalNum: number;
  status: string;
  paymentMethod: string;
  txnId: string;
  paidAt: string;
  receipt_url: string | null;
};

export default function IndividualOrdersScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;
  const queryClient = useQueryClient();

  // Real-time subscription — new orders appear immediately
  useEffect(() => {
    if (!canteenId) return;
    const channel = supabase
      .channel(`admin-orders-${canteenId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `canteen_id=eq.${canteenId}` },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'canteen', canteenId] });
          const order = payload.new;
          pushNotificationService.notifyNewOrder({
            customer: order?.student_name || 'A student',
            total: (order?.total_amount ?? 0).toFixed(0),
            items: 1,
          });
          showInfoToast('New order received! 🔔');
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canteenId]);

  const { data: rawOrders, isLoading } = useCanteenOrders(canteenId);
  const orders = rawOrders || [];

  const { data: rawNotifs } = useNotifications(user?.id, false);
  const unreadNotifs = (rawNotifs || []).slice(0, 20);

  const updateStatus = useUpdateOrderStatus();
  const updateOrder = useUpdateOrder();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<AdminOrderItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const displayOrders: AdminOrderItem[] = useMemo(() => {
    if (orders && orders.length > 0) {
      return orders
        .filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled')
        .map((o: any) => {
          const oItems: any[] = o.order_items || [];
          const displayItems = oItems.length > 0
            ? oItems.map((it: any) => ({
                name: `${it.quantity}x ${it?.products?.name || 'Item'}`,
                price: `रू ${((it.unit_price ?? 0) * it.quantity).toFixed(0)}`,
              }))
            : [{ name: 'Order Items', price: `रू ${(o.total_amount ?? 0).toFixed(0)}` }];
          return {
            id: `#CQ-${o.id.slice(0, 4).toUpperCase()}`,
            rawId: o.id,
            customer: o.student_name || 'Student Customer',
            slot: o.pickup_time || 'ASAP',
            items: displayItems,
            total: `रू ${(o.total_amount ?? 0).toFixed(0)}`,
            totalNum: o.total_amount ?? 0,
            status: (o.status || 'pending').toUpperCase(),
            paymentMethod: o.payment_method || 'eSewa/Khalti',
            txnId: `TXN-${o.id.slice(0, 8).toUpperCase()}`,
            paidAt: formatPaidAt(o.created_at),
            receipt_url: o.payment_receipt_url || null,
          };
        });
    }
    return [];
  }, [orders]);

  const displayNotifications = useMemo(() => {
    return (unreadNotifs || []).map((n) => ({
      id: n.id,
      title: n.title.toUpperCase(),
      desc: n.message,
      time: formatNotifTime(n.created_at),
    }));
  }, [unreadNotifs]);

  const handleStatusChange = (rawId: string, newStatus: OrderStatus) => {
    updateStatus.mutate({ orderId: rawId, status: newStatus });
  };

  const handleReject = (rawId: string) => {
    updateStatus.mutate({ orderId: rawId, status: 'cancelled' });
  };

  const filteredOrders = displayOrders.filter((o) => {
    const matchesFilter = activeFilter === 'ALL'
      ? (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'CONFIRMED')
      : o.status === activeFilter;
    const matchesSearch =
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (isLoading && !orders.length) {
    return <LoadingScreen message="Loading orders..." />;
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? 'rgba(255, 102, 0, 0.2)' : colors.border,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
          >
            <MenuIcon color={colors.text} size={20} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 32, height: 32, backgroundColor: '#FF6600', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat color="#FFFFFF" size={18} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FF6600', textTransform: 'uppercase', letterSpacing: -0.5 }}>EMBER OPS</Text>
              <Text style={{ fontSize: 9, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>CAFETERIA-GO ADMIN</Text>
            </View>
          </View>
        </View>

        {/* Bell with Badge & Notification Toggle */}
        <Pressable
          onPress={() => setNotifOpen(!notifOpen)}
          style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: notifOpen ? 'rgba(255,102,0,0.2)' : isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          <Bell color={notifOpen ? '#FF6600' : colors.text} size={20} />
          {displayNotifications.length > 0 && (
            <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6600' }} />
          )}
        </Pressable>
      </View>

      {/* Notifications Popover Overlay */}
      {notifOpen && (
        <View
          style={{
            position: 'absolute',
            top: 96,
            right: 16,
            width: 300,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,102,0,0.3)',
            zIndex: 50,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#FF6600', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Live Alerts</Text>
            <Text style={{ color: colors.mutedText, fontSize: 9, fontWeight: '800' }}>{displayNotifications.length} NEW</Text>
          </View>

          <ScrollView style={{ maxHeight: 220 }}>
            {displayNotifications.map((n) => (
              <View key={n.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6600', marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{n.title}</Text>
                  <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>{n.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={() => showSuccessToast('Notifications cleared')}
            style={{ padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <Text style={{ color: colors.mutedText, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Clear All</Text>
          </Pressable>
        </View>
      )}

      {/* Main Content */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Search & Filter bar */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 40 }}>
            <Search color={colors.mutedText} size={16} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="SEARCH ORDERS..."
              placeholderTextColor={colors.mutedText}
              style={{ flex: 1, color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}
            />
          </View>

          <Pressable
            onPress={() => setFilterModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: activeFilter !== 'ALL' ? '#FF6600' : colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 12, height: 40 }}
          >
            <Filter color={activeFilter !== 'ALL' ? '#FFFFFF' : colors.text} size={14} />
            <Text style={{ color: activeFilter !== 'ALL' ? '#FFFFFF' : colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              {activeFilter === 'ALL' ? 'FILTER' : activeFilter}
            </Text>
          </Pressable>
        </View>

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingBottom: 100, gap: 16 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {/* Card Header */}
              <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF6600', letterSpacing: 1.5, textTransform: 'uppercase' }}>Customer</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, textTransform: 'uppercase', marginTop: 2 }}>{item.customer}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>Pickup Slot</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', marginTop: 2 }}>{item.slot}</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={{ padding: 12, gap: 10 }}>
                {/* Item List */}
                <View style={{ gap: 4 }}>
                  {item.items.map((it, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.subtext, fontWeight: '700' }}>{it.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }}>{it.price}</Text>
                    </View>
                  ))}
                </View>

                {/* Grand Total */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>Grand Total</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600' }}>{item.total}</Text>
                </View>

                {/* Interactive Action Buttons */}
                <View style={{ gap: 8, paddingTop: 4 }}>
                  {/* Verify Receipt Button */}
                  <Pressable
                    onPress={() => setSelectedReceipt(item)}
                    style={{ backgroundColor: isDarkMode ? '#E5E2E1' : '#0B1C30', paddingVertical: 10, borderRadius: 4, alignItems: 'center' }}
                  >
                    <Text style={{ color: isDarkMode ? '#18181B' : '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      Verify Receipt
                    </Text>
                  </Pressable>

                  {/* Accept / Mark Ready / Reject Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {item.status !== 'READY' ? (
                      <Pressable
                        onPress={() => {
                          if (item.status === 'PENDING' || item.status === 'CONFIRMED') {
                            handleStatusChange(item.rawId, 'preparing');
                          } else if (item.status === 'PREPARING') {
                            handleStatusChange(item.rawId, 'ready');
                          }
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: item.status === 'PREPARING' ? '#10B981' : (item.status === 'READY' ? 'rgba(16,185,129,1)' : 'rgba(16,185,129,0.1)'),
                          borderWidth: 1,
                          borderColor: 'rgba(16,185,129,0.3)',
                          paddingVertical: 10,
                          borderRadius: 4,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: item.status === 'PREPARING' ? '#FFFFFF' : (item.status === 'READY' ? '#FFFFFF' : '#10B981'), fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                          {item.status === 'READY' ? 'Marked Ready' : (item.status === 'PREPARING' ? 'Mark Ready' : 'Accept')}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleStatusChange(item.rawId, 'completed')}
                        style={{
                          flex: 1,
                          backgroundColor: '#10B981',
                          borderWidth: 1,
                          borderColor: '#10B981',
                          paddingVertical: 10,
                          borderRadius: 4,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                          Complete Order
                        </Text>
                      </Pressable>
                    )}

                    {item.status !== 'READY' && item.status !== 'COMPLETED' && (
                      <Pressable
                        onPress={() => handleReject(item.rawId)}
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          borderWidth: 1,
                          borderColor: 'rgba(239,68,68,0.3)',
                          paddingVertical: 10,
                          borderRadius: 4,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Reject</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      {/* Student Payment Receipt Modal */}
      {selectedReceipt && (
        <Modal transparent animationType="slide" visible={!!selectedReceipt} onRequestClose={() => setSelectedReceipt(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: '#FF6600', padding: 20, gap: 16, overflow: 'hidden' }}>
              
              {/* Receipt Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600', letterSpacing: 1 }}>PAYMENT RECEIPT</Text>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1 }}>STUDENT VERIFICATION</Text>
                </View>
                <Pressable onPress={() => setSelectedReceipt(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <X color={colors.text} size={18} />
                </Pressable>
              </View>

              {/* Graphical Payment Receipt Card */}
              <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', gap: 12 }}>
                {/* Verified Stamp Banner */}
                <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingVertical: 6, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>✓ PAYMENT SUCCESSFUL</Text>
                </View>

                {/* Amount Paid Big Display */}
                <View style={{ alignItems: 'center', marginVertical: 4 }}>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Amount Transferred</Text>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF6600', marginTop: 2 }}>{selectedReceipt.total}</Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Details Table */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>Student:</Text>
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '800' }}>{selectedReceipt.customer}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>Order ID:</Text>
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '800' }}>{selectedReceipt.id}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>Payment Mode:</Text>
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>{selectedReceipt.paymentMethod}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>Transaction Ref:</Text>
                    <Text style={{ fontSize: 11, color: '#FF6600', fontWeight: '800' }}>{selectedReceipt.txnId}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>Date & Time:</Text>
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }}>{selectedReceipt.paidAt}</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Items Summary */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '800', letterSpacing: 1.5 }}>ITEMS IN RECEIPT:</Text>
                  {selectedReceipt.items.map((it, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: colors.text }}>{it.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }}>{it.price}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Uploaded Receipt Image */}
              {selectedReceipt.receipt_url && (
                <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, height: 140 }}>
                  <Image
                    source={{ uri: optimizeImageUrl(selectedReceipt.receipt_url, { width: 600, height: 400, quality: 80 }) || selectedReceipt.receipt_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Action Button */}
              <Pressable
                onPress={() => {
                  handleStatusChange(selectedReceipt.rawId, 'preparing');
                  setSelectedReceipt(null);
                }}
                style={{ backgroundColor: '#FF6600', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Confirm & Start Preparing</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Filter Modal */}
      {filterModalOpen && (
        <Modal transparent animationType="fade" visible={filterModalOpen} onRequestClose={() => setFilterModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 300, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#FF6600', padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#FF6600', letterSpacing: 1 }}>FILTER ORDERS</Text>
              {(['ALL', 'PENDING', 'PREPARING', 'READY'] as const).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    setActiveFilter(status);
                    setFilterModalOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: activeFilter === status ? '#FF6600' : colors.background,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: activeFilter === status ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '800' }}>{status}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
