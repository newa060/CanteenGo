import { supabase } from '../supabase';
import { UserRole, Profile } from '../../types';
import { InsertTables, Tables } from '../../types/database';
import { handleError } from '../errorHandler';

export interface SignInWithOtpParams {
  email: string;
  shouldCreateUser?: boolean;
}

export interface VerifyOtpParams {
  email: string;
  code: string;
}

export interface SignUpParams {
  email: string;
  password?: string;
  full_name?: string;
  role: UserRole;
  canteen_code?: string;
}

const DEFAULT_ROLE: UserRole = 'student';

export const authService = {
  async signInWithOtp({ email, shouldCreateUser = true }: SignInWithOtpParams) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser,
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async verifyOtp({ email, code }: VerifyOtpParams) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async signInWithPassword(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async signUp({ email, password, full_name, role = DEFAULT_ROLE, canteen_code }: SignUpParams) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password ?? `${Math.random().toString(36).slice(2, 10)}`,
        options: {
          data: {
            full_name: full_name ?? email.split('@')[0],
            role,
            canteen_code,
          },
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async resetPasswordForEmail(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      handleError(error);
      return null;
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      handleError(error);
      return null;
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
