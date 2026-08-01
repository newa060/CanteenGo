import { create } from 'zustand';
import { Profile, UserRole } from '../types';
import { authService } from '../lib/services/authService';
import { profileRepository } from '../lib/repositories/profileRepository';
import { canteenRepository } from '../lib/repositories/canteenRepository';
import { Tables } from '../types/database';
import { handleError } from '../lib/errorHandler';
import { isAdminEmail } from '../constants';

type AuthProfile = Profile & Tables<'profiles'>;

interface AuthState {
  user: AuthProfile | null;
  role: UserRole | null;
  canteenCode: string | null;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: AuthProfile | null) => void;
  setRole: (role: UserRole | null) => void;
  setCanteenCode: (code: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (val: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  fetchAndSetProfile: (userId: string) => Promise<AuthProfile | null>;
}

const ensureAdminCanteen = async (profile: Tables<'profiles'>): Promise<Tables<'profiles'>> => {
  if (profile.role === 'admin' && !profile.canteen_id) {
    try {
      const existing = await canteenRepository.list();
      let canteen = existing[0];
      if (!canteen) {
        const code = `CG-HUB-${Math.floor(1000 + Math.random() * 9000)}`;
        canteen = await canteenRepository.create({
          name: 'Main Canteen',
          code: code,
          is_active: true,
        });
      }
      const updated = await profileRepository.update(profile.id, {
        canteen_id: canteen.id,
        canteen_code: canteen.code,
      });
      return updated;
    } catch (e) {
      console.warn('Failed to auto-provision admin canteen:', e);
    }
  }
  return profile;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  canteenCode: null,
  isLoading: true,
  initialized: false,

  setUser: (user) => set({ user, role: (user?.role as UserRole) || null, canteenCode: user?.canteen_code || null }),
  setRole: (role) => set({ role }),
  setCanteenCode: (canteenCode) => set({ canteenCode }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (initialized) => set({ initialized }),

  logout: async () => {
    try {
      await authService.signOut();
    } catch (e) {
      handleError(e);
    }
    set({ user: null, role: null, canteenCode: null, isLoading: false });
  },

  fetchAndSetProfile: async (userId: string) => {
    try {
      let profile = await profileRepository.getById(userId);
      if (profile) {
        // Ensure admin emails always have admin role (sync if drifted)
        const role: UserRole = isAdminEmail(profile.email) ? 'admin' : (profile.role as UserRole);
        if (role !== profile.role) {
          profile = await profileRepository.update(userId, { role });
        }
        profile = await ensureAdminCanteen(profile);
        set({
          user: profile as AuthProfile,
          role: profile.role as UserRole,
          canteenCode: profile.canteen_code,
        });
        return profile as AuthProfile;
      }
    } catch (e) {
      handleError(e);
    }
    return null;
  },

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const session = await authService.getCurrentSession();

      if (session?.user) {
        const supabaseUser = session.user;
        let profile = await profileRepository.getById(supabaseUser.id);

        if (profile) {
          // Sync admin role if email matches
          const role: UserRole = isAdminEmail(profile.email) ? 'admin' : (profile.role as UserRole);
          if (role !== profile.role) {
            profile = await profileRepository.update(profile.id, { role });
          }
          profile = await ensureAdminCanteen(profile);
          set({
            user: profile as AuthProfile,
            role: profile.role as UserRole,
            canteenCode: profile.canteen_code,
          });
        } else {
          const email = supabaseUser.email || '';
          const role: UserRole = isAdminEmail(email)
            ? 'admin'
            : (supabaseUser.user_metadata?.role as UserRole) || 'student';
          const full_name = supabaseUser.user_metadata?.full_name as string | undefined;

          try {
            let newProfile = await profileRepository.create({
              id: supabaseUser.id,
              email,
              full_name: full_name || email.split('@')[0],
              role,
              canteen_code: supabaseUser.user_metadata?.canteen_code as string | undefined,
              canteen_id: null,
              avatar_url: null,
            });
            newProfile = await ensureAdminCanteen(newProfile);
            set({
              user: newProfile as AuthProfile,
              role: newProfile.role as UserRole,
              canteenCode: newProfile.canteen_code,
            });
          } catch (e) {
            handleError(e);
          }
        }
      } else {
        set({ user: null, role: null, canteenCode: null });
      }
    } catch (error) {
      handleError(error);
      set({ user: null, role: null, canteenCode: null });
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },
}));
