import { supabase } from '../supabase';
import { InsertTables, Tables, UpdateTables } from '../../types/database';
import { handleError } from '../errorHandler';

export const categoryRepository = {
  async list(canteenId?: string): Promise<Tables<'categories'>[]> {
    try {
      let query = supabase.from('categories').select('*').order('name');
      if (canteenId) {
        query = query.eq('canteen_id', canteenId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as Tables<'categories'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getById(id: string): Promise<Tables<'categories'> | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'categories'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(category: InsertTables<'categories'>): Promise<Tables<'categories'>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(category as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'categories'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateTables<'categories'>): Promise<Tables<'categories'>> {
    try {
      const { data, error } = await (supabase.from('categories') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'categories'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
