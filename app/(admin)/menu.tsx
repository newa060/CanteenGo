import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Bell, Camera, CheckCircle2, ChefHat, Menu as MenuIcon, QrCode, ShieldCheck, X } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import AdminNotificationPopover from '../../components/AdminNotificationPopover';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteenOrders, useUpdateOrderStatus } from '../../lib/hooks/useOrders';
import { useCanteen } from '../../lib/hooks/useCanteen';
import { orderRepository } from '../../lib/repositories/orderRepository';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { showSuccessToast, showErrorToast } from '../../lib/errorHandler';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const formatNotifTime = (iso: string): string => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  } catch { return 'Recent'; }
};

export default function PickupVerificationScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  const { data: canteen } = useCanteen(canteenId);
  const { data: rawOrders, isLoading } = useCanteenOrders(canteenId);
  const orders = rawOrders || [];
  const updateStatus = useUpdateOrderStatus();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [code, setCode] = useState('');
  const [matchedOrderId, setMatchedOrderId] = useState<string | null>(null);
  const [pickedUp, setPickedUp] = useState(false);
  
  // Camera scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const { data: rawNotifs } = useNotifications(user?.id, false);
  const displayNotifications = useMemo(() => {
    if (rawNotifs && rawNotifs.length > 0) {
      return rawNotifs.slice(0, 10).map((n) => ({
        id: n.id, title: n.title.toUpperCase(), desc: n.message, time: formatNotifTime(n.created_at),
      }));
    }
    return [
      { id: '1', title: 'LOW STOCK ALERT', desc: 'Some menu items running low.', time: '5m ago' },
      { id: '2', title: 'PICKUP READY', desc: 'Orders awaiting pickup verification.', time: '10m ago' },
    ];
  }, [rawNotifs]);

  const readyOrders = useMemo(() => orders.filter((o) => o.status === 'ready' || o.status === 'preparing'), [orders]);
  const orderIdsStr = useMemo(() => readyOrders.map((o) => o.id).join(','), [readyOrders]);

  const { data: itemsMap } = useQuery({
    queryKey: ['pickup_items', orderIdsStr],
    enabled: readyOrders.length > 0,
    queryFn: async () => {
      const map: Record<string, any[]> = {};
      await Promise.all(readyOrders.map(async (o) => {
        try { map[o.id] = await orderRepository.getOrderItems(o.id); } catch { map[o.id] = []; }
      }));
      return map;
    },
  });

  const findMatchingOrderWithCode = (searchCodeInput: string) => {
    const searchCode = searchCodeInput.trim().toUpperCase();
    if (!searchCode) { showErrorToast('Please enter a pickup code'); return; }
    const match = orders.find((o) => 
      (o.pickup_code || '').toUpperCase() === searchCode ||
      o.id.toUpperCase().startsWith(searchCode) ||
      o.id.toUpperCase() === searchCode
    );
    if (match) {
      setMatchedOrderId(match.id);
      const isCompleted = match.status === 'completed';
      setPickedUp(isCompleted);
      if (isCompleted) {
        showErrorToast('Order already picked up!');
      } else {
        showSuccessToast('Customer matched!');
      }
    } else {
      setMatchedOrderId(null);
      setPickedUp(false);
      showErrorToast('No active order matches this code');
    }
  };

  const findMatchingOrder = () => findMatchingOrderWithCode(code);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        showErrorToast('Camera permission is required to scan QR code');
        return;
      }
    }
    setScannerOpen(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScannerOpen(false);
    if (data) {
      setCode(data.toUpperCase());
      findMatchingOrderWithCode(data);
    }
  };

  const matchedOrder = useMemo(() => orders.find((o) => o.id === matchedOrderId) || null, [orders, matchedOrderId]);
  const matchedItems = (matchedOrder && itemsMap?.[matchedOrder.id] as any[]) || [];

  const handleMarkPickedUp = () => {
    if (matchedOrder) {
      updateStatus.mutate(
        { orderId: matchedOrder.id, status: 'completed' },
        { onSuccess: () => { setPickedUp(true); showSuccessToast('Order released successfully'); } },
      );
    }
  };

  if (isLoading && !orders.length) {
    return <LoadingScreen message="Loading pickup queue..." />;
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
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <MenuIcon color={colors.text} size={20} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 32, height: 32, backgroundColor: '#FF6600', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat color="#FFFFFF" size={18} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FF6600', textTransform: 'uppercase', letterSpacing: -0.5 }}>
                {canteen?.name || 'EMBER OPS'}
              </Text>
              <Text style={{ fontSize: 9, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>CAFETERIA-GO ADMIN</Text>
            </View>
          </View>
        </View>

        {/* Bell with Badge & Notification Toggle */}
        <Pressable
          onPress={() => setNotifOpen(!notifOpen)}
          style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: notifOpen ? 'rgba(255,102,0,0.2)' : colors.inputBg, alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          <Bell color={notifOpen ? '#FF6600' : colors.text} size={20} />
          {(rawNotifs || []).length > 0 && (
            <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6600' }} />
          )}
        </Pressable>
      </View>

      {/* Notifications Popover Overlay */}
      <AdminNotificationPopover visible={notifOpen} onClose={() => setNotifOpen(false)} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 20 }}>
        {/* Title */}
        <View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.5 }}>Pickup Verification</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 4 }}>Input code to authorize order release</Text>
        </View>

        {/* Code Input & QR Scanner Card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6600', letterSpacing: 1.5, textTransform: 'uppercase' }}>SCAN QR OR ENTER RECEIVING CODE</Text>
          
          <Pressable
            onPress={handleOpenScanner}
            style={{
              backgroundColor: '#FF6600',
              borderRadius: 8,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Camera color="#FFFFFF" size={20} />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Scan Order QR Code</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase' }}>OR SEARCH MANUALLY</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
              <QrCode color="#FF6600" size={20} style={{ marginRight: 10 }} />
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  if (t.trim().length >= 4) {
                    findMatchingOrderWithCode(t);
                  }
                }}
                placeholder="e.g. A7B4"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="characters"
                style={{ flex: 1, color: '#FF6600', fontSize: 18, fontWeight: '900', letterSpacing: 3, height: 48 }}
              />
            </View>
            <Pressable
              onPress={findMatchingOrder}
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Search</Text>
            </Pressable>
          </View>
        </View>

        {/* Active Matches Section */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>ACTIVE MATCHES</Text>

          <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: pickedUp ? 'rgba(16,185,129,0.4)' : (matchedOrder ? colors.border : colors.border), overflow: 'hidden', opacity: matchedOrder ? 1 : 0.6 }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: pickedUp ? '#EF4444' : '#FF6600', letterSpacing: 1.5 }}>
                  {matchedOrder ? `${matchedOrder.pickup_code || code} - ${matchedOrder.student_name || 'Student Customer'}` : (code || 'CODE') + ' - No Match'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <ShieldCheck color={pickedUp ? '#EF4444' : (matchedOrder ? '#10B981' : colors.mutedText)} size={14} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: pickedUp ? '#EF4444' : (matchedOrder ? '#10B981' : colors.mutedText) }}>
                    {pickedUp ? 'Already Picked Up' : (matchedOrder ? 'Verified Customer' : 'Enter a valid pickup code')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
                {matchedOrder ? (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                      Order #{matchedOrder.id.slice(0, 6).toUpperCase()} · Total रू {matchedOrder.total_amount}
                    </Text>
                    {matchedItems.length > 0 ? matchedItems.map((it: any, idx: number) => (
                      <Text key={idx} style={{ fontSize: 11, color: colors.subtext }}>
                        • {it.quantity}x {it?.products?.name || 'Menu Item'} - रू {(it.unit_price * it.quantity).toFixed(0)}
                      </Text>
                    )) : (
                      <Text style={{ fontSize: 11, color: colors.subtext }}>• Order items total: रू {matchedOrder.total_amount}</Text>
                    )}
                    {matchedOrder.pickup_time && (
                      <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 4 }}>
                        Slot: {matchedOrder.pickup_time}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>Awaiting code verification...</Text>
                    <Text style={{ fontSize: 11, color: colors.subtext }}>• Enter the 4-character pickup code provided to the student</Text>
                  </>
                )}
              </View>

              {matchedOrder && !pickedUp ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={handleMarkPickedUp}
                    style={{ backgroundColor: '#FF6600', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Mark as Picked Up</Text>
                  </Pressable>
                  <Text style={{ fontSize: 10, color: colors.mutedText, textAlign: 'center', lineHeight: 14 }}>
                    Marking as picked up will notify the customer and archive these orders from the live queue.
                  </Text>
                </View>
              ) : pickedUp ? (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CheckCircle2 color="#EF4444" size={20} />
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Order Already Picked Up!</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Camera QR Scanner Modal */}
      {scannerOpen && (
        <Modal transparent animationType="slide" visible={scannerOpen} onRequestClose={() => setScannerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#000000' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', padding: 24, paddingTop: 60 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>SCAN ORDER QR CODE</Text>
                  <Pressable
                    onPress={() => setScannerOpen(false)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X color="#FFFFFF" size={20} />
                  </Pressable>
                </View>

                {/* Viewfinder overlay */}
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <View
                    style={{
                      width: 240,
                      height: 240,
                      borderWidth: 3,
                      borderColor: '#FF6600',
                      borderRadius: 20,
                      backgroundColor: 'transparent',
                    }}
                  />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Align QR code within frame
                  </Text>
                </View>

                <Pressable
                  onPress={() => setScannerOpen(false)}
                  style={{ backgroundColor: '#FF6600', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Cancel Scan</Text>
                </Pressable>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}
    </View>
  );
}
