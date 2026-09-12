import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCircle2, ChefHat, Flame, Menu as MenuIcon, Minus, Package, Plus, Sparkles } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import AdminNotificationPopover from '../../components/AdminNotificationPopover';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteenOrders, ORDERS_QUERY_KEY } from '../../lib/hooks/useOrders';
import { useNotifications } from '../../lib/hooks/useNotifications';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { showSuccessToast, showInfoToast } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';

type BulkItem = {
  key: string;
  name: string;
  rawTotal: number;
  totalQty: number;
  orderCount: number;
  selectedQty: number;
};

export default function BulkOrdersScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;
  const queryClient = useQueryClient();

  // Real-time updates when orders are accepted or updated
  useEffect(() => {
    if (!canteenId) return;
    const channel = supabase
      .channel(`kitchen-queue-${canteenId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `canteen_id=eq.${canteenId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY, 'canteen', canteenId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canteenId, queryClient]);

  const { data: rawOrders, isLoading } = useCanteenOrders(canteenId);
  const orders = rawOrders || [];

  // Filter only PREPARING orders (actively in the kitchen)
  const preparingOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'preparing'),
    [orders]
  );

  // Completed deducted quantities: { [itemKey]: deductedTotal }
  const [completedDeductions, setCompletedDeductions] = useState<Record<string, number>>({});

  // Selected quantity input: { [itemKey]: selectedNum }
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Aggregate items across active preparing orders minus completed deductions
  const bulkItems: BulkItem[] = useMemo(() => {
    const map: Record<string, { key: string; name: string; rawTotal: number; orderCount: number }> = {};
    
    preparingOrders.forEach((o: any) => {
      const oItems: any[] = o.order_items || [];
      oItems.forEach((it: any) => {
        const name = it?.products?.name || 'Unknown Item';
        const qty = it.quantity || 1;
        if (!map[name]) {
          map[name] = { key: name, name, rawTotal: 0, orderCount: 0 };
        }
        map[name].rawTotal += qty;
        map[name].orderCount += 1;
      });
    });

    return Object.values(map)
      .map((item) => {
        const deducted = completedDeductions[item.key] || 0;
        const totalQty = Math.max(item.rawTotal - deducted, 0);
        const sel = selectedQuantities[item.key] !== undefined ? selectedQuantities[item.key] : 0;
        return {
          key: item.key,
          name: item.name,
          rawTotal: item.rawTotal,
          totalQty,
          orderCount: item.orderCount,
          selectedQty: Math.min(sel, totalQty),
        };
      })
      .filter((item) => item.totalQty > 0);
  }, [preparingOrders, completedDeductions, selectedQuantities]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: rawNotifs } = useNotifications(user?.id, false);

  const handleIncrement = (itemKey: string, maxQty: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[itemKey] !== undefined ? prev[itemKey] : 0;
      return {
        ...prev,
        [itemKey]: Math.min(current + 1, maxQty),
      };
    });
  };

  const handleDecrement = (itemKey: string) => {
    setSelectedQuantities((prev) => {
      const current = prev[itemKey] !== undefined ? prev[itemKey] : 0;
      return {
        ...prev,
        [itemKey]: Math.max(current - 1, 0),
      };
    });
  };

  const handleSetExact = (itemKey: string, val: number, maxQty: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemKey]: Math.min(Math.max(val, 0), maxQty),
    }));
  };

  const handleDirectInput = (itemKey: string, text: string, maxQty: number) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) {
      setSelectedQuantities((prev) => ({ ...prev, [itemKey]: 0 }));
    } else {
      setSelectedQuantities((prev) => ({
        ...prev,
        [itemKey]: Math.min(Math.max(num, 0), maxQty),
      }));
    }
  };

  // Mark done handler
  const handleMarkDone = (itemKey: string, itemName: string, amountToDeduct: number, totalRemaining: number) => {
    // If no quantity was explicitly dialed in, default to completing all remaining for convenience
    const qty = amountToDeduct > 0 ? amountToDeduct : totalRemaining;
    if (qty <= 0) return;

    setCompletedDeductions((prev) => ({
      ...prev,
      [itemKey]: (prev[itemKey] || 0) + qty,
    }));
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemKey]: 0,
    }));
    showSuccessToast(`Marked ${qty}x ${itemName} as prepared! 🍳`);
  };

  if (isLoading && !orders.length) {
    return <LoadingScreen message="Loading kitchen queue..." />;
  }

  const totalItemsToCook = bulkItems.reduce((acc, curr) => acc + curr.totalQty, 0);

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
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: colors.inputBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <MenuIcon color={colors.text} size={20} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 }}>
              Kitchen Queue
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedText, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Bulk Prep Tracker
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={() => setNotifOpen(!notifOpen)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: notifOpen ? 'rgba(255,102,0,0.2)' : colors.inputBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              position: 'relative',
            }}
          >
            <Bell color={notifOpen ? '#FF6600' : colors.text} size={18} />
            {(rawNotifs || []).length > 0 && (
              <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6600' }} />
            )}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,102,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6600' }} />
            <Text style={{ color: '#FF6600', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Live</Text>
          </View>
        </View>
      </View>

      {/* Notifications Popover */}
      <AdminNotificationPopover visible={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Summary Banner */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View
          style={{
            backgroundColor: isDarkMode ? 'rgba(255,102,0,0.06)' : '#FFF7ED',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? 'rgba(255,102,0,0.2)' : '#FFEDD5',
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,102,0,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame color="#FF6600" size={18} />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                {bulkItems.length > 0 ? `${totalItemsToCook} Items in Queue` : 'Kitchen Queue Clear'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 1 }}>
                {bulkItems.length > 0
                  ? `Across ${preparingOrders.length} active accepted orders`
                  : 'Accept incoming orders to track cooking batches'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      {bulkItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChefHat color={colors.mutedText} size={32} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            No Active Cooking Batches
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', lineHeight: 18 }}>
            Accepted orders automatically appear here grouped by item so you can cook in bulk efficiently.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}>
          {bulkItems.map((item) => {
            const hasSelection = item.selectedQty > 0;
            const remainingAfterSelection = Math.max(item.totalQty - item.selectedQty, 0);

            return (
              <View
                key={item.key}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  gap: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.2 : 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                {/* Header: Item Name + Remaining Badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
                      {item.orderCount} active {item.orderCount === 1 ? 'order' : 'orders'}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,102,0,0.15)' : '#FFF7ED',
                      borderWidth: 1,
                      borderColor: isDarkMode ? 'rgba(255,102,0,0.3)' : '#FDBA74',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase' }}>
                      To Cook
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6600' }}>
                      {item.totalQty}
                    </Text>
                  </View>
                </View>

                {/* Stepper Control + Preset Chips */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Minus Button */}
                    <Pressable
                      onPress={() => handleDecrement(item.key)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: colors.inputBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus color={colors.text} size={18} />
                    </Pressable>

                    {/* Numeric Input */}
                    <View
                      style={{
                        flex: 1,
                        height: 44,
                        backgroundColor: colors.inputBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: hasSelection ? '#FF6600' : colors.border,
                        justifyContent: 'center',
                        paddingHorizontal: 12,
                      }}
                    >
                      <TextInput
                        value={item.selectedQty > 0 ? String(item.selectedQty) : ''}
                        onChangeText={(text) => handleDirectInput(item.key, text, item.totalQty)}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.mutedText}
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: '800',
                          textAlign: 'center',
                        }}
                      />
                    </View>

                    {/* Plus Button */}
                    <Pressable
                      onPress={() => handleIncrement(item.key, item.totalQty)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: colors.inputBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus color={colors.text} size={18} />
                    </Pressable>
                  </View>

                  {/* Preset quick buttons for easy kitchen tapping */}
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
                    <Pressable
                      onPress={() => handleSetExact(item.key, (item.selectedQty || 0) + 1, item.totalQty)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: colors.inputBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext }}>+1</Text>
                    </Pressable>
                    {item.totalQty >= 5 && (
                      <Pressable
                        onPress={() => handleSetExact(item.key, (item.selectedQty || 0) + 5, item.totalQty)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: colors.inputBg,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext }}>+5</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleSetExact(item.key, item.totalQty, item.totalQty)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: isDarkMode ? 'rgba(255,102,0,0.12)' : '#FFF7ED',
                        borderWidth: 1,
                        borderColor: isDarkMode ? 'rgba(255,102,0,0.3)' : '#FDBA74',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6600' }}>
                        All ({item.totalQty})
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Mark as Done Action Button */}
                <Pressable
                  onPress={() => handleMarkDone(item.key, item.name, item.selectedQty, item.totalQty)}
                  style={{
                    backgroundColor: '#10B981',
                    paddingVertical: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Check color="#FFFFFF" size={16} />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '800',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {hasSelection
                      ? `Mark ${item.selectedQty} as Done`
                      : `Mark All (${item.totalQty}) as Done`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
