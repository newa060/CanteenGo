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
import { ArrowLeft, Camera, Check, CheckCircle2, ChevronDown, Edit2, Plus, Search, Tag, Trash2, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getThemeColors, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../../lib/hooks/useCategories';
import { useCreateProduct, useDeleteProduct, useProducts, useToggleProductAvailability, useUpdateProduct } from '../../lib/hooks/useProducts';
import { cloudinaryService, optimizeImageUrl } from '../../lib/cloudinary';
import { showSuccessToast, showErrorToast } from '../../lib/errorHandler';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { supabase } from '../../lib/supabase';


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
  const createCategory = useCreateCategory();
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
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Re-populate form when editItem changes
  React.useEffect(() => {
    if (visible) {
      setName(editItem?.name || '');
      setDesc(editItem?.desc || '');
      setPrice(editItem ? String(editItem.priceNum) : '');
      setCategory(editItem?.category_id || '');
      setImageUri(editItem?.image || null);
      setAvailable(editItem ? editItem.available : true);
      setShowCategoryPicker(false);
      setNewCatName('');
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

      let canteenIdToUse = user?.canteen_id;
      if (!canteenIdToUse) {
        const { data: canteens } = await supabase.from('canteens').select('id').limit(1);
        if (canteens && canteens.length > 0) {
          canteenIdToUse = canteens[0].id;
        }
      }

      let categoryIdToUse = category;
      if (!categoryIdToUse) {
        if (dbCategories && dbCategories.length > 0) {
          categoryIdToUse = dbCategories[0].id;
        } else {
          const createdCat = await createCategory.mutateAsync({
            name: 'General',
            canteen_id: canteenIdToUse || undefined,
          });
          categoryIdToUse = createdCat?.id || '';
        }
      }

      if (isEdit && editItem) {
        await updateProduct.mutateAsync({
          id: editItem.id,
          updates: {
            category_id: categoryIdToUse || undefined,
            name: name.trim(),
            description: desc.trim() || undefined,
            price: priceNum,
            is_available: available,
            image_url: finalImageUrl,
          } as any,
        });
      } else {
        await createProduct.mutateAsync({
          canteen_id: canteenIdToUse || undefined,
          category_id: categoryIdToUse,
          name: name.trim(),
          description: desc.trim() || undefined,
          price: priceNum,
          is_available: available,
          image_url: finalImageUrl,
        });
      }

      onClose();
    } catch (e: any) {
      showErrorToast(e?.message || (isEdit ? 'Failed to update item' : 'Failed to create item'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      showErrorToast('Please enter a category name');
      return;
    }
    const existing = dbCategories?.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setCategory(existing.id);
      setNewCatName('');
      setShowCategoryPicker(false);
      showSuccessToast(`Selected "${existing.name}"`);
      return;
    }

    setIsCreatingCat(true);
    try {
      let canteenIdToUse = user?.canteen_id;
      if (!canteenIdToUse) {
        const { data: canteens } = await supabase.from('canteens').select('id').limit(1);
        if (canteens && canteens.length > 0) {
          canteenIdToUse = canteens[0].id;
        }
      }
      const created = await createCategory.mutateAsync({
        name: trimmed,
        canteen_id: canteenIdToUse || undefined,
      });
      if (created?.id) {
        setCategory(created.id);
      }
      setNewCatName('');
      setShowCategoryPicker(false);
    } catch (e: any) {
      showErrorToast(e?.message || 'Failed to add category');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const selectedCategoryObj = dbCategories?.find((c) => c.id === category);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View
            style={{
              height: '86%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
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
                paddingHorizontal: 20,
                paddingVertical: 18,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {isEdit ? 'Edit Menu Item' : 'Add Menu Item'}
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>

            {/* Form Scroll Content */}
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Image Uploader */}
              <Pressable
                onPress={handlePickImage}
                style={{
                  borderWidth: 1,
                  borderColor: imageUri ? colors.border : (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                  borderStyle: imageUri ? 'solid' : 'dashed',
                  borderRadius: 12,
                  height: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.background,
                  overflow: 'hidden',
                }}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Camera color={colors.subtext} size={24} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      Add Item Photo
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.mutedText }}>
                      Tap to select from device gallery
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Item Name */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>
                  Item Name <Text style={{ color: '#FF6600' }}>*</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Steam Momo (10 pcs)"
                  placeholderTextColor={colors.mutedText}
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: colors.text,
                    fontWeight: '600',
                  }}
                />
              </View>

              {/* Item Description */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>
                  Description (Optional)
                </Text>
                <TextInput
                  value={desc}
                  onChangeText={setDesc}
                  placeholder="Short description of ingredients or preparation..."
                  placeholderTextColor={colors.mutedText}
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.text,
                    minHeight: 60,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Category Selector Tile */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>
                  Category <Text style={{ color: '#FF6600' }}>*</Text>
                </Text>
                <Pressable
                  onPress={() => setShowCategoryPicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Tag color={selectedCategoryObj ? '#FF6600' : colors.mutedText} size={16} />
                    <Text style={{ fontSize: 14, fontWeight: selectedCategoryObj ? '700' : '400', color: selectedCategoryObj ? colors.text : colors.mutedText }}>
                      {selectedCategoryObj ? selectedCategoryObj.name : 'Select Category'}
                    </Text>
                  </View>
                  <ChevronDown color={colors.subtext} size={18} />
                </Pressable>
              </View>

              {/* Price */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>
                  Price <Text style={{ color: '#FF6600' }}>*</Text>
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FF6600', marginRight: 8 }}>
                    रू
                  </Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="120"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: colors.text,
                      fontWeight: '700',
                    }}
                  />
                </View>
              </View>

              {/* Available Switch */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                    Available for Order
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 2 }}>
                    Show in active student menu
                  </Text>
                </View>
                <Switch
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ false: '#353534', true: '#FF6600' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                style={{
                  flex: 1.4,
                  paddingVertical: 13,
                  borderRadius: 8,
                  backgroundColor: '#FF6600',
                  alignItems: 'center',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {submitting ? (uploadingImage ? 'Uploading...' : 'Saving...') : 'Save Item'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clean Dedicated Category Picker Sheet */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: 460,
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Select Category</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)} style={{ padding: 4 }}>
                <X color={colors.text} size={18} />
              </Pressable>
            </View>

            {/* New Category Input Row */}
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext, marginBottom: 8 }}>
                Add New Category
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder="e.g. Beverages, Snacks..."
                  placeholderTextColor={colors.mutedText}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: colors.text,
                    fontWeight: '600',
                  }}
                />
                <Pressable
                  onPress={handleCreateCategory}
                  disabled={isCreatingCat || !newCatName.trim()}
                  style={{
                    backgroundColor: '#FF6600',
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isCreatingCat || !newCatName.trim() ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                    {isCreatingCat ? '...' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category List */}
            <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ padding: 8 }}>
              {/* Option to clear category */}
              <Pressable
                onPress={() => {
                  setCategory('');
                  setShowCategoryPicker(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: !category ? (isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9') : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, color: !category ? '#FF6600' : colors.mutedText, fontWeight: !category ? '800' : '500' }}>
                  None (No Category)
                </Text>
                {!category && <Check color="#FF6600" size={16} />}
              </Pressable>

              {/* List of DB categories */}
              {(dbCategories || []).map((catObj) => {
                const isSelected = category === catObj.id;
                return (
                  <Pressable
                    key={catObj.id}
                    onPress={() => {
                      setCategory(catObj.id);
                      setShowCategoryPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(255,102,0,0.15)' : '#FFF7ED') : 'transparent',
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: isSelected ? '#FF6600' : colors.text, fontWeight: isSelected ? '800' : '500' }}>
                      {catObj.name}
                    </Text>
                    {isSelected && <Check color="#FF6600" size={16} />}
                  </Pressable>
                );
              })}

              {(!dbCategories || dbCategories.length === 0) && (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.mutedText, fontStyle: 'italic' }}>
                    No categories created yet. Enter a name above to add one.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  // optimistic toggle state: { [id]: boolean | undefined }
  const [optimisticAvail, setOptimisticAvail] = useState<Record<string, boolean>>({});

  // Category management state
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const user = useAuthStore((s) => s.user);
  const [showCatSection, setShowCatSection] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);

  const displayProducts = useMemo(() => {
    const products = (dbProducts || []) as any[];
    const catMap: Record<string, string> = {};
    (dbCategories || []).forEach((c) => { catMap[c.id] = c.name; });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category_id ? (catMap[p.category_id] || 'Uncategorized') : 'Uncategorized',
      category_id: p.category_id,
      price: `RS ${p.price}`,
      priceNum: p.price,
      available: p.is_available,
      desc: p.description,
      image: optimizeImageUrl(p.image_url, { width: 600, quality: 80 }),
    }));
  }, [dbProducts, dbCategories]);

  const CATEGORIES = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return [{ id: 'all', name: 'All' }, ...dbCategories.map((c) => ({ id: c.id, name: c.name }))];
    }
    return [{ id: 'all', name: 'All' }];
  }, [dbCategories]);

  const filteredItems = displayProducts.filter((item) => {
    const matchesCat = activeCat === 'all' || item.category_id === activeCat || item.category === activeCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleAvail = (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic update
    setOptimisticAvail((prev) => ({ ...prev, [id]: newVal }));
    if (dbProducts && dbProducts.some((p) => p.id === id)) {
      toggleAvailability.mutate(
        { id, isAvailable: newVal },
        {
          onError: () => {
            // Revert on error
            setOptimisticAvail((prev) => ({ ...prev, [id]: currentVal }));
          },
        }
      );
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    await createCategory.mutateAsync({ name: trimmed, canteen_id: user?.canteen_id || undefined } as any);
    setNewCatName('');
  };

  const handleUpdateCategory = async () => {
    if (!editingCat) return;
    await updateCategory.mutateAsync({ id: editingCat.id, updates: { name: editingCat.name } as any });
    setEditingCat(null);
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Delete Category', 'Are you sure? Items in this category will be uncategorized.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory.mutate(id) },
    ]);
  };

  if (loadingProducts) {
    return <LoadingScreen message="Loading menu items..." />;
  }

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

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={{
                flex: 1,
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
                ADD ITEM
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowCatSection(!showCatSection)}
              style={{
                paddingHorizontal: 16,
                backgroundColor: showCatSection ? 'rgba(255,102,0,0.12)' : colors.surface,
                borderWidth: 1,
                borderColor: showCatSection ? '#FF6600' : colors.border,
                paddingVertical: 14,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <ChevronDown color={showCatSection ? '#FF6600' : colors.subtext} size={16} />
              <Text style={{ color: showCatSection ? '#FF6600' : colors.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                CATEGORIES
              </Text>
            </Pressable>
          </View>

          {/* Category Management Section */}
          {showCatSection && (
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 2, color: colors.mutedText, textTransform: 'uppercase' }}>Manage Categories</Text>

              {/* Add new category */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={editingCat ? editingCat.name : newCatName}
                  onChangeText={(t) => editingCat ? setEditingCat({ ...editingCat, name: t }) : setNewCatName(t)}
                  placeholder={editingCat ? 'Edit category name...' : 'New category name...'}
                  placeholderTextColor={colors.mutedText}
                  style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: editingCat ? '#FF6600' : colors.border }}
                />
                <Pressable
                  onPress={editingCat ? handleUpdateCategory : handleCreateCategory}
                  style={{ backgroundColor: '#FF6600', borderRadius: 6, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
                >
                  {editingCat
                    ? <CheckCircle2 color="#FFFFFF" size={18} />
                    : <Plus color="#FFFFFF" size={18} />}
                </Pressable>
                {editingCat && (
                  <Pressable
                    onPress={() => setEditingCat(null)}
                    style={{ backgroundColor: colors.inputBg, borderRadius: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X color={colors.mutedText} size={18} />
                  </Pressable>
                )}
              </View>

              {/* Existing categories list */}
              {(dbCategories || []).map((cat) => (
                <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}>{cat.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => setEditingCat({ id: cat.id, name: cat.name })}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,102,0,0.1)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit2 color="#FF6600" size={14} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteCategory(cat.id)}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 color="#EF4444" size={14} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {(!dbCategories || dbCategories.length === 0) && (
                <Text style={{ color: colors.mutedText, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>No categories yet. Add one above.</Text>
              )}
            </View>
          )}
        </View>

        {/* Categories Pills - only shown if categories exist */}
        {CATEGORIES.length > 1 && (
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
        )}

        {/* Food Items */}
        <View style={{ paddingHorizontal: 20, paddingTop: CATEGORIES.length > 1 ? 0 : 16, gap: 16 }}>
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
                  style={{ width: '100%', height: '100%', opacity: (optimisticAvail[item.id] ?? item.available) ? 1 : 0.35 }}
                  resizeMode="cover"
                />

                {!(optimisticAvail[item.id] ?? item.available) && (
                  <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <View style={{ borderWidth: 2, borderColor: colors.mutedText, paddingHorizontal: 16, paddingVertical: 8, transform: [{ rotate: '12deg' }] }}>
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
                      Alert.alert(
                        'Delete Item',
                        `Are you sure you want to delete "${item.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteProduct.mutateAsync(item.id);
                              } catch (err: any) {
                                if (
                                  err?.message?.toLowerCase().includes('foreign key') ||
                                  err?.message?.toLowerCase().includes('order_items') ||
                                  err?.code === '23503'
                                ) {
                                  await toggleAvailability.mutateAsync({ id: item.id, isAvailable: false });
                                  showErrorToast('Item has order history. Marked as unavailable instead of deleting.');
                                }
                              }
                            },
                          },
                        ]
                      );
                    }}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(19,19,19,0.75)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 color="#EF4444" size={15} />
                  </Pressable>
                </View>
              </View>

              {/* Card Details */}
              <View style={{ padding: 16 }}>
                {!!item.category && (
                  <View style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: item.available ? colors.subtext : colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      {item.category}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: item.available ? colors.text : colors.mutedText }}>{item.name}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: item.available ? '#FF6600' : colors.mutedText }}>{item.price}</Text>
                </View>

                <Text style={{ fontSize: 13, color: item.available ? colors.subtext : colors.mutedText, lineHeight: 18, marginBottom: 12 }}>
                  {item.desc}
                </Text>

                {/* Available Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', color: (optimisticAvail[item.id] ?? item.available) ? '#FF6600' : colors.mutedText }}>
                    {(optimisticAvail[item.id] ?? item.available) ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </Text>
                  <Switch value={optimisticAvail[item.id] ?? item.available} onValueChange={() => toggleAvail(item.id, optimisticAvail[item.id] ?? item.available)} trackColor={{ false: '#353534', true: '#FF6600' }} thumbColor="#FFFFFF" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
