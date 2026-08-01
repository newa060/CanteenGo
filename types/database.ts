import type { UserRole, OrderStatus } from './index';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          canteen_code: string | null;
          canteen_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: UserRole;
          avatar_url?: string | null;
          canteen_code?: string | null;
          canteen_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          canteen_code?: string | null;
          canteen_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      canteens: {
        Row: {
          id: string;
          name: string;
          code: string;
          image_url: string | null;
          location: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          image_url?: string | null;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          image_url?: string | null;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          image_url: string | null;
          canteen_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url?: string | null;
          canteen_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string | null;
          canteen_id?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          category_id: string;
          is_available: boolean;
          canteen_id: string | null;
          rating: number | null;
          preparation_time_mins: number | null;
          stock: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          image_url: string;
          category_id: string;
          is_available?: boolean;
          canteen_id?: string | null;
          rating?: number | null;
          preparation_time_mins?: number | null;
          stock?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string;
          category_id?: string;
          is_available?: boolean;
          canteen_id?: string | null;
          rating?: number | null;
          preparation_time_mins?: number | null;
          stock?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          student_id: string;
          student_name: string | null;
          canteen_id: string | null;
          status: OrderStatus;
          total_amount: number;
          payment_method: string | null;
          payment_receipt_url: string | null;
          pickup_code: string | null;
          pickup_time: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          student_name?: string | null;
          canteen_id?: string | null;
          status?: OrderStatus;
          total_amount: number;
          payment_method?: string | null;
          payment_receipt_url?: string | null;
          pickup_code?: string | null;
          pickup_time?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          student_name?: string | null;
          canteen_id?: string | null;
          status?: OrderStatus;
          total_amount?: number;
          payment_method?: string | null;
          payment_receipt_url?: string | null;
          pickup_code?: string | null;
          pickup_time?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'order' | 'system' | 'promo';
          is_read: boolean;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: 'order' | 'system' | 'promo';
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'order' | 'system' | 'promo';
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
