import { supabase } from '../supabase';
import { InsertTables, Tables } from '../../types/database';
import { handleError } from '../errorHandler';

export const favoritesRepository = {
  async listForUser(userId: string): Promise<Tables<'favorites'>[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, products:product_id(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (error) throw error;
      return (count || 0) > 0;
    } catch (error) {
      handleError(error);
      return false;
    }
  },

  async add(userId: string, productId: string): Promise<Tables<'favorites'>> {
    try {
      const existing = await this.isFavorite(userId, productId);
      if (existing) {
        const { data, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .maybeSingle();
        if (error) throw error;
        if (data) return data as Tables<'favorites'>;
      }
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, product_id: productId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'favorites'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async remove(userId: string, productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async toggle(userId: string, productId: string): Promise<boolean> {
    const isFav = await this.isFavorite(userId, productId);
    if (isFav) {
      await this.remove(userId, productId);
      return false;
    } else {
      await this.add(userId, productId);
      return true;
    }
  },
};
