import { supabase } from '../supabase';
import { InsertTables, Tables, UpdateTables } from '../../types/database';
import { handleError } from '../errorHandler';

export interface ProductListParams {
  categoryId?: string;
  canteenId?: string;
  isAvailable?: boolean;
  search?: string;
}

export const productRepository = {
  async list(params: ProductListParams = {}): Promise<Tables<'products'>[]> {
    try {
      let query = supabase.from('products').select('*').order('name');

      if (params.categoryId) {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.canteenId) {
        query = query.eq('canteen_id', params.canteenId);
      }
      if (params.isAvailable !== undefined) {
        query = query.eq('is_available', params.isAvailable);
      }
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Tables<'products'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getById(id: string): Promise<Tables<'products'> | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'products'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(product: InsertTables<'products'>): Promise<Tables<'products'>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product as any)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'products'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateTables<'products'>): Promise<Tables<'products'>> {
    try {
      const { data, error } = await (supabase.from('products') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'products'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async toggleAvailability(id: string, isAvailable: boolean): Promise<Tables<'products'>> {
    return this.update(id, { is_available: isAvailable });
  },

  async decrementStock(id: string, quantity: number): Promise<void> {
    try {
      const { data: productRaw, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      const product = productRaw as any;

      if (product.stock !== null) {
        const newStock = Math.max(0, product.stock - quantity);
        const isAvailable = newStock > 0;
        await this.update(id, { stock: newStock, is_available: isAvailable });
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
