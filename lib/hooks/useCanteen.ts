import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canteenRepository } from '../repositories/canteenRepository';
import { UpdateTables } from '../../types/database';
import { showSuccessToast } from '../errorHandler';

export const CANTEEN_QUERY_KEY = 'canteen';

export const useCanteen = (id: string | null | undefined) => {
  return useQuery({
    queryKey: [CANTEEN_QUERY_KEY, id],
    queryFn: () => canteenRepository.getById(id as string),
    enabled: !!id,
  });
};

export const useCanteenByCode = (code: string | null | undefined) => {
  return useQuery({
    queryKey: [CANTEEN_QUERY_KEY, 'code', code],
    queryFn: () => canteenRepository.getByCode(code as string),
    enabled: !!code,
  });
};

export const useUpdateCanteen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTables<'canteens'> }) =>
      canteenRepository.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData([CANTEEN_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [CANTEEN_QUERY_KEY] });
      showSuccessToast('Canteen settings saved!');
    },
  });
};
