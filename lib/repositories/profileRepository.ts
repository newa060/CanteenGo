import { supabase } from '../supabase';
import { InsertTables, Tables, UpdateTables } from '../../types/database';
import { handleError } from '../errorHandler';
import { Profile, UserRole } from '../../types';

export const profileRepository = {
  async getById(id: string): Promise<Tables<'profiles'> | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'profiles'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getByEmail(email: string): Promise<Tables<'profiles'> | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'profiles'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getByCanteenCode(canteen_code: string): Promise<Tables<'profiles'>[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('canteen_code', canteen_code);
      if (error) throw error;
      return (data as Tables<'profiles'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(profile: InsertTables<'profiles'>): Promise<Tables<'profiles'>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profile as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'profiles'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateTables<'profiles'>): Promise<Tables<'profiles'>> {
    try {
      const { data, error } = await (supabase.from('profiles') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'profiles'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async listByRole(role: UserRole): Promise<Tables<'profiles'>[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role);
      if (error) throw error;
      return (data as Tables<'profiles'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
