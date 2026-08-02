import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, CheckCircle2, ChevronDown, Edit2, Plus, Search, Trash2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCategories } from '../../lib/hooks/useCategories';
import { useCreateProduct, useDeleteProduct, useProducts, useToggleProductAvailability, useUpdateProduct } from '../../lib/hooks/useProducts';
import { cloudinaryService, optimizeImageUrl } from '../../lib/cloudinary';
import { showSuccessToast, showErrorToast } from '../../lib/errorHandler';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabase';

const FALLBACK_CATEGORIES = ['Momo', 'Chowmein', 'Burger', 'More'];

const FALLBACK_ITEMS = [
  {
    id: '1',
    name: 'Steam Momo (10 pcs)',
    category: 'MOMO',
    category_id: 'cat-momo',
    price: 'RS 120',
    priceNum: 120,
    available: true,
    desc: 'Hand-crafted traditional dumplings served with spicy tomato sesame chutney.',
    image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    name: 'Schezwan Noodles',
    category: 'CHOWMEIN',
    category_id: 'cat-chow',
    price: 'RS 150',
    priceNum: 150,
    available: false,
    desc: 'Fiery stir-fry noodles with szechuan peppercorns and garden vegetables.',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    name: 'Chilli Momo',
    category: 'MOMO',
    category_id: 'cat-momo',
    price: 'RS 140',
    priceNum: 140,
    available: true,
    desc: 'Deep-fried momos tossed in a house-special spicy chili garlic sauce.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '4',
    name: 'Operational Burger',
    category: 'BURGER',
    category_id: 'cat-burger',
    price: 'RS 220',
    priceNum: 220,
    available: true,
    desc: 'Flame-grilled premium patty with tactical-grade spicy mayo and pickles.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
  },
];

type DisplayItem = {
  id: string;
  name: string;
  category: string;
  category_id: string;
  price: string;
  priceNum: number;
  available: boolean;
  desc: string;
  image: string;
};

function ProductModal({ visible, onClose, editItem }: { visible: boolean; onClose: () => void; editItem?: DisplayItem | null }) {
  const isEdit = !!editItem;
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);
  const user = useAuthStore((s) => s.user);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: dbCategories } = useCategories();

  const [name, setName] = useState(editItem?.name || '');
  const [desc, setDesc] = useState(editItem?.desc || '');
  const [price, setPrice] = useState(editItem ? String(editItem.priceNum) : '');
  const [category, setCategory] = useState<string>(editItem?.category_id || '');
  const [imageUri, setImageUri] = useState<string | null>(editItem?.image || null);
  const [available, setAvailable] = useState(editItem ? editItem.available : true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Re-populate form when editItem changes (e.g. opening edit for a different item)
  React.useEffect(() => {
    if (visible) {
      setName(editItem?.name || '');
      setDesc(editItem?.desc || '');
      setPrice(editItem ? String(editItem.priceNum) : '');
      setCategory(editItem?.category_id || '');
      setImageUri(editItem?.image || null);
      setAvailable(editItem ? editItem.available : true);
    }
  }, [visible, editItem?.id]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showErrorToast('Permission to access media library is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setImageUri(localUri);
      }
    } catch (e) {
      showErrorToast('Error picking image');
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      showErrorToast('Please fill in product name and price');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showErrorToast('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    let finalImageUrl = editItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

    try {
      // Upload image if a new one was picked (not an http URL)
      if (imageUri && !imageUri.startsWith('http')) {
        setUploadingImage(true);
        try {
          const uploadRes = await cloudinaryService.uploadImage(imageUri, { folder: 'products' });
          if (uploadRes?.secure_url) {
            finalImageUrl = uploadRes.secure_url;
          }
        } catch {
          finalImageUrl = imageUri;
        } finally {
          setUploadingImage(false);
        }
      } else if (imageUri) {
        finalImageUrl = imageUri;
      }

      if (isEdit && editItem) {
        // ——— EDIT MODE ———
        await updateProduct.mutateAsync({
          id: editItem.id,
          updates: {
            category_id: category || undefined,
            name: name.trim(),
            description: desc.trim() || undefined,
            price: priceNum,
            is_available: available,
            image_url: finalImageUrl,
          } as any,
        });
        showSuccessToast('Item updated successfully!');
      } else {
        // ——— CREATE MODE ———
        let canteenIdToUse = user?.canteen_id;
        if (!canteenIdToUse) {
          const { data: canteens } = await supabase.from('canteens').select('id').limit(1);
          if (canteens && canteens.length > 0) {
            canteenIdToUse = canteens[0].id;
          }
        }
        await createProduct.mutateAsync({
          canteen_id: canteenIdToUse || undefined,
          category_id: category || undefined,
          name: name.trim(),
          description: desc.trim() || undefined,
          price: priceNum,
          is_available: available,
          image_url: finalImageUrl,
        });
        showSuccessToast('Item added successfully!');
      }

      onClose();
    } catch (e: any) {
      showErrorToast(e?.message || (isEdit ? 'Failed to update item' : 'Failed to create item'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = dbCategories?.find((c) => c.id === category);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        {/* Full/Large Card Sheet */}
        <View
          style={{
            height: '88%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{isEdit ? 'Edit Item' : 'Add New Item'}</Text>
            <Pressable
              onPress={onClose}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
            >
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          {/* Form Scroll Content */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, gap: 20 }}>
            {/* Image Uploader */}
            <Pressable
              onPress={handlePickImage}
              style={{
                borderWidth: 2,
                borderColor: imageUri ? '#FF6600' : colors.border,
                borderStyle: imageUri ? 'solid' : 'dashed',
                borderRadius: 14,
                height: 140,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.background,
                overflow: 'hidden',
              }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Camera color="#FF6600" size={32} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6600', letterSpacing: 2, textTransform: 'uppercase' }}>
                    Upload Item Photo
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center' }}>
                    Tap to select an image from gallery
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Form Fields */}
            <View style={{ gap: 16 }}>
              {/* Item Name */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                  ITEM NAME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Gourmet Burger"
                  placeholderTextColor={colors.mutedText}
                  style={{ borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: 'transparent' }}
                />
              </View>

              {/* Description */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                  ITEM DESCRIPTION
                </Text>
                <TextInput
                  value={desc}
                  onChangeText={setDesc}
                  placeholder="e.g., Flame-grilled beef patty with signature spicy mayo..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={3}
                  style={{ borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: 'transparent', height: 70, textAlignVertical: 'top' }}
                />
              </View>

              {/* Category */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                  CATEGORY
                </Text>
                <Pressable
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 10, alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text style={{ fontSize: 16, color: selectedCategoryObj ? colors.text : colors.mutedText }}>
                    {selectedCategoryObj ? selectedCategoryObj.name : 'Select category (Optional)'}
                  </Text>
                  <ChevronDown color={colors.subtext} size={18} />
                </Pressable>
                {showCategoryPicker && (
                  <View style={{ backgroundColor: colors.background, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: colors.border, paddingVertical: 4 }}>
                    {(dbCategories || []).map((catObj) => (
                      <Pressable
                        key={catObj.id}
                        onPress={() => {
                          setCategory(catObj.id);
                          setShowCategoryPicker(false);
                        }}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: category === catObj.id ? `${colors.primary}20` : 'transparent' }}
                      >
                        <Text style={{ color: category === catObj.id ? '#FF6600' : colors.text, fontWeight: category === catObj.id ? '700' : '400' }}>
                          {catObj.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Price */}
              <View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mutedText, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                  PRICE (RS)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 16, color: colors.subtext, marginRight: 8, fontWeight: '700' }}>RS</Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="150"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numeric"
                    style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: 'transparent', fontWeight: '700' }}
                  />
                </View>
              </View>
            </View>

            {/* Availability Switch Card */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: available ? 'rgba(255,102,0,0.3)' : colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 color="#FF6600" size={22} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Available</Text>
                  <Text style={{ fontSize: 12, color: colors.subtext }}>Set item status as active</Text>
                </View>
              </View>
              <Switch value={available} onValueChange={setAvailable} trackColor={{ false: '#353534', true: '#FF6600' }} thumbColor="#FFFFFF" />
            </View>
          </ScrollView>

          {/* Modal Footer Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#FF6600', alignItems: 'center', shadowColor: '#FF6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6, opacity: submitting ? 0.6 : 1 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                {submitting ? (uploadingImage ? 'UPLOADING...' : 'SAVING...') : 'SAVE ITEM'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function MenuManagementScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const colors = getThemeColors(isDarkMode);

  const { data: dbProducts, isLoading: loadingProducts } = useProducts();
  const { data: dbCategories } = useCategories();
  const toggleAvailability = useToggleProductAvailability();
  const deleteProduct = useDeleteProduct();

  const [activeCat, setActiveCat] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<DisplayItem | null>(null);
  const [search, setSearch] = useState('');

  const displayProducts = useMemo(() => {
    const products = (dbProducts || []) as any[];
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category_id || 'MOMO',
      category_id: p.category_id,
      price: `RS ${p.price}`,
      priceNum: p.price,
      available: p.is_available,
      desc: p.description,
      image: optimizeImageUrl(p.image_url, { width: 600, quality: 80 }),
    }));
  }, [dbProducts]);

  const CATEGORIES = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return [{ id: 'all', name: 'All' }, ...dbCategories.map((c) => ({ id: c.id, name: c.name }))];
    }
    return [{ id: 'all', name: 'All' }, ...FALLBACK_CATEGORIES.map((c) => ({ id: c.toLowerCase(), name: c }))];
  }, [dbCategories]);

  const filteredItems = displayProducts.filter((item) => {
    const matchesCat = activeCat === 'all' || item.category_id === activeCat || item.category === activeCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleAvail = (id: string, currentVal: boolean) => {
    if (dbProducts && dbProducts.some((p) => p.id === id)) {
      toggleAvailability.mutate({ id, isAvailable: !currentVal });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProductModal
        visible={showAddModal || editItem !== null}
        onClose={() => { setShowAddModal(false); setEditItem(null); }}
        editItem={editItem}
      />

      {/* Fixed Header */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 }}>
          Menu Management
        </Text>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
          <X color="#FF6600" size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Search & Add Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 8 }}>
            <Search color={colors.mutedText} size={20} style={{ marginRight: 12 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search operational menu..."
              placeholderTextColor={colors.mutedText}
              style={{ flex: 1, fontSize: 16, color: colors.text, backgroundColor: 'transparent' }}
            />
          </View>

          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#FF6600',
              paddingVertical: 14,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Plus color="#FFFFFF" size={18} />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
              ADD NEW ITEM
            </Text>
          </Pressable>
        </View>

        {/* Categories Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}>
          {CATEGORIES.map((catObj) => {
            const isActive = activeCat === catObj.id;
            return (
              <Pressable
                key={catObj.id}
                onPress={() => setActiveCat(catObj.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  backgroundColor: isActive ? '#FF6600' : 'transparent',
                  borderWidth: 1,
                  borderColor: isActive ? '#FF6600' : colors.border,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', color: isActive ? '#FFFFFF' : colors.subtext }}>
                  {catObj.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Food Items */}
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          {filteredItems.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* Food Image Banner */}
              <View style={{ height: 160, backgroundColor: isDarkMode ? '#2A2A2A' : '#E2E8F0', position: 'relative' }}>
                <Image
                  source={{ uri: item.image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />

                {!item.available && (
                  <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: isDarkMode ? 'rgba(19, 19, 19, 0.75)' : 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <View style={{ borderWidth: 2, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 8, transform: [{ rotate: '12deg' }] }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.mutedText, letterSpacing: 4, textTransform: 'uppercase' }}>OUT OF STOCK</Text>
                    </View>
                  </View>
                )}

                {/* Edit / Delete Floating Buttons */}
                <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8, zIndex: 2 }}>
                  <Pressable
                    onPress={() => setEditItem(item)}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(19,19,19,0.75)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Edit2 color="#FFFFFF" size={15} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (dbProducts && dbProducts.some((p) => p.id === item.id)) {
                        deleteProduct.mutate(item.id);
                      }
                    }}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(19,19,19,0.75)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 color="#EF4444" size={15} />
                  </Pressable>
                </View>
              </View>

              {/* Card Details */}
              <View style={{ padding: 16 }}>
                <View style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: item.available ? colors.subtext : colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {item.category}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: item.available ? colors.text : colors.mutedText }}>{item.name}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: item.available ? '#FF6600' : colors.mutedText }}>{item.price}</Text>
                </View>

                <Text style={{ fontSize: 13, color: item.available ? colors.subtext : colors.mutedText, lineHeight: 18, marginBottom: 12 }}>
                  {item.desc}
                </Text>

                {/* Available Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', color: item.available ? '#FF6600' : colors.mutedText }}>
                    {item.available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </Text>
                  <Switch value={item.available} onValueChange={() => toggleAvail(item.id, item.available)} trackColor={{ false: '#353534', true: '#FF6600' }} thumbColor="#FFFFFF" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
