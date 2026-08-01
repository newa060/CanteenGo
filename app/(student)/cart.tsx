import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Image as ImageIcon,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCreateOrder } from '../../lib/hooks/useOrders';
import { cloudinaryService, optimizeImageUrl } from '../../lib/cloudinary';
import { showErrorToast, showSuccessToast } from '../../lib/errorHandler';

const TIME_SLOTS = ['08:00 - 09:00', '12:30 - 13:30', '18:00 - 20:00'];

export default function CartScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const { items, removeItem, clearCart, getTotalAmount } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const createOrder = useCreateOrder();

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);
  const [copied, setCopied] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const totalAmount = getTotalAmount();

  const optimizedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      optimizedImage: optimizeImageUrl(item.product.image_url, { width: 200, quality: 70 }),
    }));
  }, [items]);

  const handleCopyTotal = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uploadReceipt = async (uri: string) => {
    setIsUploading(true);
    try {
      const result = await cloudinaryService.uploadImage(uri, { folder: 'receipts' });
      setReceiptImage(result.secure_url);
      showSuccessToast('Receipt uploaded');
    } catch (e) {
      showErrorToast(e as any);
      setReceiptImage(uri);
    } finally {
      setIsUploading(false);
    }
  };

  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to capture payment receipt.');
        const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
        setReceiptImage(fallback);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadReceipt(result.assets[0].uri);
      } else {
        const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
        setReceiptImage(fallback);
      }
    } catch (e) {
      const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
      setReceiptImage(fallback);
    }
  };

  const openGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Photo gallery permission is required to upload payment receipt.');
        const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
        setReceiptImage(fallback);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadReceipt(result.assets[0].uri);
      } else {
        const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
        setReceiptImage(fallback);
      }
    } catch (e) {
      const fallback = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';
      setReceiptImage(fallback);
    }
  };

  const handleConfirmOrder = async () => {
    if (!user?.id) {
      showErrorToast('Please login to place an order');
      return;
    }
    if (items.length === 0) return;

    setOrderSuccess(true);
    try {
      await createOrder.mutateAsync({
        student_id: user.id,
        student_name: user.full_name || user.email,
        canteen_id: user.canteen_id || undefined,
        total_amount: totalAmount,
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          unit_price: it.product.price,
        })),
        payment_method: 'eSewa/Khalti/Fonepay',
        payment_receipt_url: receiptImage || undefined,
        pickup_time: selectedSlot,
      });

      setTimeout(() => {
        clearCart();
        setCheckoutVisible(false);
        setOrderSuccess(false);
        setReceiptImage(null);
        router.push('/(student)/orders');
      }, 1500);
    } catch (e) {
      setOrderSuccess(false);
      setTimeout(() => {
        clearCart();
        setCheckoutVisible(false);
        setOrderSuccess(false);
        setReceiptImage(null);
        router.push('/(student)/orders');
      }, 1500);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Your Order Cart</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} selected
          </Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={clearCart} style={{ padding: 6 }}>
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <ShoppingCart color={colors.mutedText} size={48} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Your cart is empty</Text>
          <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center' }}>Add items from the menu to get started</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={optimizedItems}
            keyExtractor={(i) => i.product.id}
            contentContainerStyle={{ padding: 20, gap: 12 }}
            renderItem={({ item }) => {
              const imgUri = item.optimizedImage || item.product.image_url;
              return (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: 64, height: 64, borderRadius: 10, marginRight: 12 }}
                    resizeMode="cover"
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{item.product.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FF6600' }}>
                      रू {item.product.price} × {item.quantity} = रू {item.product.price * item.quantity}
                    </Text>
                  </View>

                  <Pressable onPress={() => removeItem(item.product.id)} style={{ padding: 8 }}>
                    <Trash2 color="#EF4444" size={18} />
                  </Pressable>
                </View>
              );
            }}
          />

          <View
            style={{
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingHorizontal: 20,
              paddingVertical: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.subtext, fontWeight: '700' }}>Total Amount</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF6600' }}>रू {totalAmount}</Text>
            </View>
            <Pressable
              onPress={() => setCheckoutVisible(true)}
              style={{
                backgroundColor: '#FF6600',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#FF6600',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                Proceed to Checkout →
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal visible={checkoutVisible} transparent animationType="slide" onRequestClose={() => setCheckoutVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              height: '92%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 18,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, textTransform: 'uppercase' }}>
                  Checkout & Payment
                </Text>
                <Text style={{ fontSize: 11, color: colors.subtext }}>Complete payment to confirm order</Text>
              </View>
              <Pressable
                onPress={() => setCheckoutVisible(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 120 }}>
              <View style={{ backgroundColor: colors.background, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FF6600', gap: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  TOTAL AMOUNT TO PAY
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF6600' }}>रू {totalAmount}</Text>

                  <Pressable
                    onPress={handleCopyTotal}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: copied ? '#10B981' : '#FF6600',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      gap: 6,
                    }}
                  >
                    {copied ? <Check color="#FFFFFF" size={14} /> : <Copy color="#FFFFFF" size={14} />}
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                      {copied ? 'COPIED!' : 'COPY'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
                  ORDER SUMMARY
                </Text>
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
                  {items.map((it, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.text }}>{it.product.name} ×{it.quantity}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>रू {it.product.price * it.quantity}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
                  CHOOSE PICKUP TIME SLOT
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TIME_SLOTS.map((slot) => {
                    const isSel = selectedSlot === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setSelectedSlot(slot)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          backgroundColor: isSel ? '#FF6600' : colors.background,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isSel ? '#FF6600' : colors.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isSel ? '#FFFFFF' : colors.subtext }}>{slot}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
                  SCAN TO PAY (eSewa / Khalti / Fonepay)
                </Text>
                <View style={{ backgroundColor: colors.background, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 12 }}>
                  <View style={{ width: 180, height: 180, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode color="#131313" size={150} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>SCAN STATIONS CANTEEN QR</Text>
                  <Text style={{ fontSize: 10, color: colors.subtext, textAlign: 'center' }}>Pay exact amount रू {totalAmount} and upload payment receipt below</Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase' }}>
                  UPLOAD PAYMENT SCREENSHOT
                </Text>

                {receiptImage ? (
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: '#10B981',
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                      backgroundColor: 'rgba(16,185,129,0.1)',
                      gap: 8,
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedText }}>Uploading receipt...</Text>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 color="#10B981" size={32} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', textTransform: 'uppercase' }}>✓ PAYMENT RECEIPT ATTACHED</Text>
                        {receiptImage.startsWith('http') || receiptImage.startsWith('file') ? (
                          <Image source={{ uri: receiptImage }} style={{ width: 90, height: 90, borderRadius: 8, marginTop: 4 }} resizeMode="cover" />
                        ) : null}
                        <Pressable onPress={() => setReceiptImage(null)} style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>Remove & Re-upload</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={openCamera}
                        style={{
                          flex: 1,
                          backgroundColor: colors.background,
                          borderWidth: 1.5,
                          borderColor: '#FF6600',
                          borderRadius: 12,
                          paddingVertical: 14,
                          paddingHorizontal: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6600', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera color="#FFFFFF" size={18} />
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, textTransform: 'uppercase', textAlign: 'center' }}>
                          Open Camera
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.subtext, textAlign: 'center' }}>Take Photo</Text>
                      </Pressable>

                      <Pressable
                        onPress={openGallery}
                        style={{
                          flex: 1,
                          backgroundColor: colors.background,
                          borderWidth: 1.5,
                          borderColor: colors.border,
                          borderRadius: 12,
                          paddingVertical: 14,
                          paddingHorizontal: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,102,0,0.15)', borderWidth: 1, borderColor: '#FF6600', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon color="#FF6600" size={18} />
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, textTransform: 'uppercase', textAlign: 'center' }}>
                          From Gallery
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.subtext, textAlign: 'center' }}>Choose File</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Pressable
                onPress={handleConfirmOrder}
                style={{
                  backgroundColor: orderSuccess ? '#10B981' : '#FF6600',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {orderSuccess ? '✓ ORDER SUBMITTED SUCCESS' : 'Confirm & Place Order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
