import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Bell, Coffee, LogOut, Pizza, Search, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useProducts } from '../../lib/hooks/useProducts';
import { useCategories } from '../../lib/hooks/useCategories';
import { useUnreadNotificationCount } from '../../lib/hooks/useNotifications';
import { Product } from '../../types';
import { Tables } from '../../types/database';
import { optimizeImageUrl } from '../../lib/cloudinary';

// No static fallback categories — always use what the admin has set

const CATEGORY_ICON_MAP: Record<string, any> = {
  all: UtensilsCrossed,
  momo: Pizza,
  chowmein: UtensilsCrossed,
  beverages: Coffee,
  pizza: Pizza,
};

const FALLBACK_FOOD_ITEMS: any[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Classic Chicken Momo',
    description: 'Steamed dumplings filled with spiced minced chicken & tomato chutney',
    price: 180,
    image_url: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600&auto=format&fit=crop&q=80',
    category_id: 'momo',
    category: 'Momo',
    is_available: true,
    available: true,
    canteen_id: 'canteen-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stock: 50,
    rating: 4.5,
    preparation_time_mins: 15,
    desc: 'Steamed dumplings filled with spiced minced chicken & tomato chutney',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Veg Hakka Noodles',
    description: 'Stir-fried noodles with fresh garden vegetables & savory soy sauce',
    price: 150,
    image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
    category_id: 'chowmein',
    category: 'Chowmein',
    is_available: true,
    available: true,
    canteen_id: 'canteen-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stock: 50,
    rating: 4.2,
    preparation_time_mins: 10,
    desc: 'Stir-fried noodles with fresh garden vegetables & savory soy sauce',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Iced Cold Coffee',
    description: 'Rich espresso blended with chilled milk, vanilla & topped with ice cream',
    price: 120,
    image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    category_id: 'beverages',
    category: 'Beverages',
    is_available: true,
    available: true,
    canteen_id: 'canteen-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stock: 50,
    rating: 4.7,
    preparation_time_mins: 5,
    desc: 'Rich espresso blended with chilled milk, vanilla & topped with ice cream',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Cheese Momo (Fried)',
    description: 'Crispy golden fried momo stuffed with rich melted mozzarella',
    price: 210,
    image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
    category_id: 'momo',
    category: 'Momo',
    is_available: true,
    available: true,
    canteen_id: 'canteen-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stock: 50,
    rating: 4.8,
    preparation_time_mins: 18,
    desc: 'Crispy golden fried momo stuffed with rich melted mozzarella',
  },
];

const getIconForCategory = (name: string, id: string): any => {
  if (CATEGORY_ICON_MAP[id]) return CATEGORY_ICON_MAP[id];
  if (CATEGORY_ICON_MAP[name.toLowerCase()]) return CATEGORY_ICON_MAP[name.toLowerCase()];
  if (name.toLowerCase().includes('coffee') || name.toLowerCase().includes('drink')) return Coffee;
  if (name.toLowerCase().includes('pizza') || name.toLowerCase().includes('momo')) return Pizza;
  return UtensilsCrossed;
};

export default function StudentMenuScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { addItem, removeItem, updateQuantity, items, getTotalItems, getTotalAmount } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const canteenId = user?.canteen_id || undefined;

  const { data: apiCategories, isLoading: loadingCats } = useCategories(canteenId);
  const { data: apiProducts, isLoading: loadingProducts } = useProducts({
    canteenId,
    isAvailable: true,
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  const displayCategories = useMemo(() => {
    const baseCats: Array<{ id: string; name: string; icon: any }> = [{ id: 'all', name: 'All', icon: UtensilsCrossed }];
    // Use admin-defined categories from DB
    if (apiCategories && apiCategories.length > 0) {
      const mapped = apiCategories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: getIconForCategory(c.name, c.id),
      }));
      return [...baseCats, ...mapped];
    }
    // If no categories table entries but products exist, derive unique categories from products
    if (apiProducts && apiProducts.length > 0) {
      const seen = new Set<string>();
      const derived: Array<{ id: string; name: string; icon: any }> = [];
      for (const p of apiProducts as any[]) {
        const catId: string = p.category_id || '';
        const catName: string = p.category_name || catId || '';
        if (catId && !seen.has(catId)) {
          seen.add(catId);
          derived.push({ id: catId, name: catName || catId, icon: getIconForCategory(catName, catId) });
        }
      }
      if (derived.length > 0) return [...baseCats, ...derived];
    }
    // Still loading or no data — return just 'All'
    return baseCats;
  }, [apiCategories, apiProducts, loadingCats]);

  const displayProducts = useMemo(() => {
    const products = (apiProducts || []) as any[];
    return products.map((p) => ({
      ...p,
      category: p.category_id,
      available: p.is_available,
      desc: p.description,
      image: optimizeImageUrl(p.image_url, { width: 400, quality: 70 }),
    }));
  }, [apiProducts, loadingProducts]);

  const filteredItems = displayProducts.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.category_id === selectedCat || item.category === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalItemsCount = getTotalItems();
  const totalAmount = getTotalAmount();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }} numberOfLines={1}>
            {user?.canteen_id ? 'Main Hub Canteen' : 'No Canteen Selected'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {user?.canteen_id ? 'Order ahead & skip the queue' : 'Join a canteen to browse the menu'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(student)/notifications')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.inputBg,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Bell color={colors.text} size={20} />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 44,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Search color={colors.mutedText} size={18} style={{ marginRight: 10 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search momo, noodles, coffee..."
              placeholderTextColor={colors.mutedText}
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}
        >
          {loadingCats
            ? // Skeleton loading pills
              [1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 80 + i * 10,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: 0.5,
                  }}
                />
              ))
            : displayCategories.map((cat) => {
                const isActive = selectedCat === cat.id;
                const IconComponent = cat.icon;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCat(cat.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor: isActive ? '#FF6600' : colors.surface,
                      borderWidth: 1,
                      borderColor: isActive ? '#FF6600' : colors.border,
                      gap: 8,
                    }}
                  >
                    <IconComponent color={isActive ? '#FFFFFF' : colors.subtext} size={16} />
                    <Text style={{ color: isActive ? '#FFFFFF' : colors.subtext, fontWeight: '700', fontSize: 13 }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
        </ScrollView>

        {!user?.canteen_id ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 24,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(255, 102, 0, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: 'rgba(255, 102, 0, 0.25)',
              }}
            >
              <Store color="#FF6600" size={30} />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
              No Canteen Joined Yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.subtext,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 10,
              }}
            >
              Join your campus canteen using a 6-digit code or by scanning their QR code to view today's menu and order ahead.
            </Text>

            <Pressable
              onPress={() => router.push('/(auth)/canteen-code')}
              style={{
                width: '100%',
                height: 48,
                backgroundColor: '#FF6600',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Join Your Canteen →
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(student)/profile')}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600' }}>
                Go to Profile / Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {filteredItems.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: colors.subtext, fontSize: 14 }}>No food items available.</Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 72, height: 72, borderRadius: 12, marginRight: 12 }}
                    resizeMode="cover"
                  />

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.subtext, marginBottom: 6 }} numberOfLines={2}>
                      {item.desc || item.description}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#FF6600' }}>
                      रू {item.price}
                    </Text>
                  </View>

                  {(() => {
                    const cartItem = items.find((i) => i.product.id === item.id);
                    const qty = cartItem?.quantity ?? 0;
                    const product = {
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      description: item.desc || item.description,
                      category_id: item.category_id,
                      image_url: item.image_url || item.image,
                      is_available: item.available ?? item.is_available ?? true,
                      canteen_id: item.canteen_id,
                      created_at: item.created_at || new Date().toISOString(),
                    };
                    if (qty === 0) {
                      return (
                        <Pressable
                          onPress={() => addItem(product)}
                          style={{
                            backgroundColor: '#FF6600',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <ShoppingBag color="#FFFFFF" size={13} />
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>ADD</Text>
                        </Pressable>
                      );
                    }
                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FF6600',
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <Pressable
                          onPress={() => updateQuantity(item.id, qty - 1)}
                          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16, lineHeight: 18 }}>−</Text>
                        </Pressable>
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13, minWidth: 18, textAlign: 'center' }}>
                          {qty}
                        </Text>
                        <Pressable
                          onPress={() => addItem(product)}
                          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16, lineHeight: 18 }}>+</Text>
                        </Pressable>
                      </View>
                    );
                  })()}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {totalItemsCount > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'web' ? 20 : 100,
            left: 20,
            right: 20,
            backgroundColor: '#FF6600',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#FF6600',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 100,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>{totalItemsCount}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Cart Total</Text>
              <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '900' }}>रू {totalAmount}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(student)/cart')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
          >
            <ShoppingBag color="#FF6600" size={16} />
            <Text style={{ color: '#FF6600', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>View Cart →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
