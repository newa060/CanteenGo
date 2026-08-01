export type UserRole = 'student' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  canteen_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  image_url?: string;
  canteen_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: string;
  is_available: boolean;
  canteen_id?: string;
  rating?: number;
  preparation_time_mins?: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  student_id: string;
  student_name?: string;
  canteen_id?: string;
  status: OrderStatus;
  total_amount: number;
  payment_method?: string;
  pickup_code?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'system' | 'promo';
  is_read: boolean;
  created_at: string;
}
