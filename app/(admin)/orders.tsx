import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Bell, Menu as MenuIcon, Minus, Package, Plus } from 'lucide-react-native';
import AdminDrawer from '../../components/AdminDrawer';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCanteenOrders } from '../../lib/hooks/useOrders';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

type BulkItem = {
  key: string;
  name: string;
  totalQty: number;
  selectedQty: number;
};

export default function BulkOrdersScreen() {
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  const { data: rawOrders, isLoading } = useCanteenOrders(canteenId);
  const orders = rawOrders || [];

  // Filter only accepted/preparing orders
  const preparingOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'preparing' || o.status === 'ready'),
    [orders]
  );

  // Completed deducted quantities: { [itemKey]: deductedTotal }
  const [completedDeductions, setCompletedDeductions] = useState<Record<string, number>>({});

  // Selected quantity input: { [itemKey]: selectedNum }
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Aggregate items across accepted orders minus completed deductions
  const bulkItems: BulkItem[] = useMemo(() => {
    const map: Record<string, { key: string; name: string; rawTotal: number }> = {};
    preparingOrders.forEach((o: any) => {
      const oItems: any[] = o.order_items || [];
      oItems.forEach((it: any) => {
        const name = it?.products?.name || 'Unknown Item';
        const qty = it.quantity || 1;
        if (!map[name]) {
          map[name] = { key: name, name, rawTotal: 0 };
        }
        map[name].rawTotal += qty;
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
          totalQty,
          selectedQty: Math.min(sel, totalQty),
        };
      })
      .filter((item) => item.totalQty > 0); // Hide item when remaining total quantity reaches 0
  }, [preparingOrders, completedDeductions, selectedQuantities]);

  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // When "Mark as done" is clicked, deduct the selected quantity from total quantity
  const handleMarkDone = (itemKey: string, amountToDeduct: number) => {
    if (amountToDeduct <= 0) return;
    setCompletedDeductions((prev) => ({
      ...prev,
      [itemKey]: (prev[itemKey] || 0) + amountToDeduct,
    }));
    // Reset selected quantity input to 0 for this item
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemKey]: 0,
    }));
  };

  if (isLoading && !orders.length) {
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
        </View>
      </View>

      {/* Info Banner */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ backgroundColor: isDarkMode ? 'rgba(255,102,0,0.08)' : 'rgba(255,102,0,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,102,0,0.2)', padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Package color="#FF6600" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6600', letterSpacing: 0.5 }}>KITCHEN PREP TRACKER</Text>
            <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>
              Select quantity made using - / + or direct input, then tap "Mark as done".
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      {bulkItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.6 }}>
          <Package color={colors.mutedText} size={48} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.mutedText, textTransform: 'uppercase', letterSpacing: 1 }}>No items in kitchen queue</Text>
          <Text style={{ fontSize: 11, color: colors.mutedText, textAlign: 'center' }}>Accept orders from Individual Orders to see items here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
          {bulkItems.map((item) => (
            <View
              key={item.key}
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 }}
            >
              {/* Item header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 }}>{item.name}</Text>
                <View style={{ backgroundColor: '#FF6600', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>
                    Remaining to cook: {Math.max(item.totalQty - item.selectedQty, 0)}
                  </Text>
                </View>
              </View>

              {/* Quantity Controls Row with - , TextInput, + */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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

                {/* Direct quantity input */}
                <View
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: colors.inputBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#FF6600',
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

                <Pressable
                  onPress={() => handleIncrement(item.key, item.totalQty)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    backgroundColor: '#FF6600',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus color="#FFFFFF" size={18} />
                </Pressable>
              </View>

              {/* Mark as done Action Button */}
              <Pressable
                onPress={() => handleMarkDone(item.key, item.selectedQty)}
                style={{
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Mark as done
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}



