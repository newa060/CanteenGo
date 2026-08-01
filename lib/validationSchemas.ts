import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, { message: 'Verification code must be 6 digits' }),
});

export const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const canteenCodeSchema = z.object({
  code: z.string().length(6, { message: 'Canteen code must be 6 characters' }),
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().min(1, { message: 'Quantity must be at least 1' }),
      unit_price: z.number().min(0),
    })
  ).min(1, { message: 'Order must contain at least one item' }),
  total_amount: z.number().min(0),
  payment_method: z.string().optional(),
  payment_receipt_url: z.string().optional(),
  pickup_time: z.string().optional(),
  notes: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string(),
  price: z.number().min(0, { message: 'Price must be a positive number' }),
  image_url: z.string().optional(),
  category_id: z.string().optional(),
  is_available: z.boolean().optional(),
  stock: z.number().optional(),
  preparation_time_mins: z.number().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
});

export type EmailInput = z.infer<typeof emailSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
