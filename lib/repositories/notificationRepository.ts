import { supabase } from '../supabase';
import { InsertTables, Tables } from '../../types/database';
import { handleError } from '../errorHandler';

export const notificationRepository = {
  async listForUser(userId: string, includeRead: boolean = true): Promise<Tables<'notifications'>[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!includeRead) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Tables<'notifications'>[]) || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async getById(id: string): Promise<Tables<'notifications'> | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'notifications'> | null;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async create(notification: InsertTables<'notifications'>): Promise<Tables<'notifications'> | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification as any)
        .select()
        .single();
      if (error) {
        // If RLS policy prevents inserting notification for another user, catch silently
        console.log('[Notification DB Warning]:', error.message);
        return null;
      }
      return data as Tables<'notifications'>;
    } catch (error) {
      console.log('[Notification DB Warning]:', error);
      return null;
    }
  },

  async markAsRead(id: string): Promise<Tables<'notifications'>> {
    try {
      const { data, error } = await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'notifications'>;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async unreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      handleError(error);
      return 0;
    }
  },
};
