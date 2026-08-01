import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '../repositories/categoryRepository';
import { InsertTables, UpdateTables } from '../../types/database';
import { showSuccessToast } from '../errorHandler';

export const CATEGORIES_QUERY_KEY = 'categories';
export const CATEGORY_QUERY_KEY = 'category';

export const useCategories = (canteenId?: string) => {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY, canteenId],
    queryFn: () => categoryRepository.list(canteenId),
  });
};

export const useCategory = (id: string | undefined | null) => {
  return useQuery({
    queryKey: [CATEGORY_QUERY_KEY, id],
    queryFn: () => categoryRepository.getById(id as string),
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (category: InsertTables<'categories'>) => categoryRepository.create(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
      showSuccessToast('Category created successfully');
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTables<'categories'> }) =>
      categoryRepository.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData([CATEGORY_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
      showSuccessToast('Category updated successfully');
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
      showSuccessToast('Category deleted');
    },
  });
};
