import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesRepository } from '../repositories/favoritesRepository';
import { showSuccessToast } from '../errorHandler';

export const FAVORITES_QUERY_KEY = 'favorites';
export const FAVORITE_CHECK_KEY = 'favorite_check';

export const useFavorites = (userId: string | undefined | null) => {
  return useQuery({
    queryKey: [FAVORITES_QUERY_KEY, userId],
    queryFn: () => favoritesRepository.listForUser(userId as string),
    enabled: !!userId,
  });
};

export const useIsFavorite = (userId: string | undefined | null, productId: string | undefined | null) => {
  return useQuery({
    queryKey: [FAVORITE_CHECK_KEY, userId, productId],
    queryFn: () => favoritesRepository.isFavorite(userId as string, productId as string),
    enabled: !!userId && !!productId,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, productId }: { userId: string; productId: string }) =>
      favoritesRepository.toggle(userId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [FAVORITE_CHECK_KEY, variables.userId, variables.productId] });
    },
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, productId }: { userId: string; productId: string }) =>
      favoritesRepository.add(userId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [FAVORITE_CHECK_KEY, variables.userId, variables.productId] });
      showSuccessToast('Added to favorites');
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, productId }: { userId: string; productId: string }) =>
      favoritesRepository.remove(userId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [FAVORITE_CHECK_KEY, variables.userId, variables.productId] });
      showSuccessToast('Removed from favorites');
    },
  });
};
