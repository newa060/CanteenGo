import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { profileRepository } from '../repositories/profileRepository';
import { Tables, UpdateTables } from '../../types/database';
import { UserRole } from '../../types';
import { showSuccessToast } from '../errorHandler';

export const PROFILE_QUERY_KEY = 'profile';
export const PROFILES_QUERY_KEY = 'profiles';

export const useProfile = (id: string | undefined | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, id],
    queryFn: () => profileRepository.getById(id as string),
    enabled: !!id && (options?.enabled ?? true),
  });
};

export const useProfileByEmail = (email: string | undefined | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, 'email', email],
    queryFn: () => profileRepository.getByEmail(email as string),
    enabled: !!email && (options?.enabled ?? true),
  });
};

export const useProfilesByRole = (role: UserRole | undefined | null) => {
  return useQuery({
    queryKey: [PROFILES_QUERY_KEY, 'role', role],
    queryFn: () => profileRepository.listByRole(role as UserRole),
    enabled: !!role,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTables<'profiles'> }) =>
      profileRepository.update(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData([PROFILE_QUERY_KEY, data.id], data);
      queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY] });
      showSuccessToast('Profile updated successfully');
    },
  });
};
