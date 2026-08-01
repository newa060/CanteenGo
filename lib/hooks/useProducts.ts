import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productRepository, ProductListParams } from '../repositories/productRepository';
import { InsertTables, UpdateTables } from '../../types/database';
import { showSuccessToast } from '../errorHandler';

export const PRODUCTS_QUERY_KEY = 'products';
export const PRODUCT_QUERY_KEY = 'product';

export const useProducts = (params: ProductListParams = {}) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, params],
    queryFn: () => productRepository.list(params),
  });
};

export const useProduct = (id: string | undefined | null) => {
  return useQuery({
    queryKey: [PRODUCT_QUERY_KEY, id],
    queryFn: () => productRepository.getById(id as string),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (product: InsertTables<'products'>) => productRepository.create(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      showSuccessToast('Product created successfully');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTables<'products'> }) =>
      productRepository.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData([PRODUCT_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      showSuccessToast('Product updated successfully');
    },
  });
};

export const useToggleProductAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      productRepository.toggleAvailability(id, isAvailable),
    onSuccess: (data) => {
      queryClient.setQueryData([PRODUCT_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      showSuccessToast('Product deleted');
    },
  });
};
