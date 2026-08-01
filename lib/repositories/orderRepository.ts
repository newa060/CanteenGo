import { supabase } from '../supabase';
import { InsertTables, Tables, UpdateTables } from '../../types/database';
import { handleError } from '../errorHandler';
import { OrderStatus, UserRole } from '../../types';

export interface CreateOrderData {
  student_id: string;
  student_name?: string;
  canteen_id?: string;
  total_amount: number;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  payment_method?: string;
  payment_receipt_url?: string;
  pickup_time?: string;
  notes?: string;
}

export const orderRepository = {
  async listForStudent(studentId: string): Promise<Tables<'orders'>[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Tables<'orders'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async listForCanteen(canteenId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*, products(id, name, price))')
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (canteenId) {
        query = query.eq('canteen_id', canteenId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async listAllByStatus(status?: OrderStatus, canteenId?: string): Promise<Tables<'orders'>[]> {
    try {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (status) {
        query = query.eq('status', status);
      }
      if (canteenId) {
        query = query.eq('canteen_id', canteenId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as Tables<'orders'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getById(id: string): Promise<Tables<'orders'> | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'orders'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getWithItems(orderId: string): Promise<{ order: Tables<'orders'>; items: Tables<'order_items'>[] } | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items(*, products:product_id(*))
        `
        )
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const raw = data as any;
      return {
        order: data as Tables<'orders'>,
        items: raw?.order_items || [],
      };
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(orderData: CreateOrderData): Promise<Tables<'orders'>> {
    try {
      const pickupCode = generatePickupCode();

      const { data: orderRaw, error: orderError } = await supabase
        .from('orders')
        .insert({
          student_id: orderData.student_id,
          student_name: orderData.student_name,
          canteen_id: orderData.canteen_id,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          payment_receipt_url: orderData.payment_receipt_url,
          pickup_time: orderData.pickup_time,
          pickup_code: pickupCode,
          notes: orderData.notes,
          status: 'pending',
        } as any)
        .select()
        .single();
      if (orderError) throw orderError;
      const order = orderRaw as Tables<'orders'>;
      const isValidUuid = (s: string) =>
        typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      const orderItems = orderData.items
        .filter((item) => isValidUuid(item.product_id))
        .map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems as any);
        if (itemsError) {
          console.warn('Order items insert warning:', itemsError.message);
        }
      }

      return order;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<Tables<'orders'>> {
    try {
      const { data, error } = await (supabase.from('orders') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'orders'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async update(id: string, updates: UpdateTables<'orders'>): Promise<Tables<'orders'>> {
    try {
      const { data, error } = await (supabase.from('orders') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'orders'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getOrderItems(orderId: string): Promise<Tables<'order_items'>[]> {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products:product_id(*)')
        .eq('order_id', orderId);
      if (error) throw error;
      return (data as any[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
