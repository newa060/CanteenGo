export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
export const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'canteengo';

export const ADMIN_EMAILS_KEY = 'EXPO_PUBLIC_ADMIN_EMAILS';

// Comma-separated list of emails that are always assigned the 'admin' role
export const ADMIN_EMAILS: string[] = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email: string): boolean =>
  ADMIN_EMAILS.includes(email.trim().toLowerCase());

export const APP_NAME = 'CanteenGo';
export const APP_VERSION = '1.0.0';

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
