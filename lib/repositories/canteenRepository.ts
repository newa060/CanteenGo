import { supabase } from '../supabase';
import { Tables, InsertTables, UpdateTables } from '../../types/database';
import { handleError } from '../errorHandler';

export const canteenRepository = {
  async getById(id: string): Promise<Tables<'canteens'> | null> {
    try {
      const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'canteens'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getByCode(code: string): Promise<Tables<'canteens'> | null> {
    try {
      const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'canteens'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async list(): Promise<Tables<'canteens'>[]> {
    try {
      const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as Tables<'canteens'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(canteen: InsertTables<'canteens'>): Promise<Tables<'canteens'>> {
    try {
      const { data, error } = await supabase
        .from('canteens')
        .insert(canteen as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'canteens'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateTables<'canteens'>): Promise<Tables<'canteens'>> {
    try {
      const { data, error } = await (supabase.from('canteens') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'canteens'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
