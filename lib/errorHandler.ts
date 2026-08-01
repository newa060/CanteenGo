import Toast from 'react-native-toast-message';
import { PostgrestError, AuthError, StorageApiError } from '@supabase/supabase-js';

export type AppErrorType =
  | 'network'
  | 'auth'
  | 'validation'
  | 'database'
  | 'storage'
  | 'unknown';

export interface AppError {
  type: AppErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
}

export class CanteenGoError extends Error implements AppError {
  type: AppErrorType;
  originalError?: unknown;
  code?: string;

  constructor(type: AppErrorType, message: string, originalError?: unknown, code?: string) {
    super(message);
    this.name = 'CanteenGoError';
    this.type = type;
    this.originalError = originalError;
    this.code = code;
  }
}

export const classifyError = (error: unknown): AppError => {
  if (error instanceof CanteenGoError) return error;

  const authError = error as AuthError;
  const postgrestError = error as PostgrestError;
  const storageError = error as StorageApiError;

  if (authError?.name === 'AuthError' || typeof (error as any)?.message === 'string' && (
    (error as any).message?.toLowerCase().includes('auth') ||
    (error as any).message?.toLowerCase().includes('session') ||
    (error as any).message?.toLowerCase().includes('login') ||
    (error as any).message?.toLowerCase().includes('token') ||
    (error as any).message?.toLowerCase().includes('otp') ||
    (error as any).message?.toLowerCase().includes('invalid') ||
    (error as any).message?.toLowerCase().includes('expired')
  )) {
    return new CanteenGoError('auth', getErrorMessage(error), error, (error as any).code);
  }

  if (postgrestError?.code) {
    return new CanteenGoError('database', getErrorMessage(error), error, postgrestError.code);
  }

  if (
    (error as any)?.message?.toLowerCase().includes('network') ||
    (error as any)?.message?.toLowerCase().includes('fetch') ||
    (error as any)?.message?.toLowerCase().includes('timeout') ||
    (error as any)?.message?.toLowerCase().includes('connection') ||
    (error as any)?.name === 'NetworkError' ||
    (error as any)?.name === 'TypeError' ||
    (error as any)?.name === 'AbortError'
  ) {
    return new CanteenGoError('network', getErrorMessage(error), error);
  }

  if (storageError?.name === 'StorageApiError' || storageError?.name === 'StorageUnknownError') {
    return new CanteenGoError('storage', getErrorMessage(error), error);
  }

  if ((error as any)?.code?.startsWith('Zod') || (error as any)?.name === 'ZodError') {
    return new CanteenGoError('validation', getErrorMessage(error), error);
  }

  return new CanteenGoError('unknown', getErrorMessage(error), error);
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  const err = error as { message?: string; error?: string };
  if (err?.message) return err.message;
  if (err?.error) return err.error;
  return 'Something went wrong. Please try again.';
};

export const getUserFriendlyMessage = (err: AppError): string => {
  switch (err.type) {
    case 'network':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth':
      if (
        err.message.toLowerCase().includes('invalid login') ||
        err.message.toLowerCase().includes('invalid credentials') ||
        err.code === 'invalid_credentials'
      ) {
        return 'Invalid email or password. Please try again.';
      }
      if (err.message.toLowerCase().includes('otp') || err.code === 'otp_expired') {
        return 'Invalid or expired verification code. Please request a new one.';
      }
      if (err.message.toLowerCase().includes('user not found') || err.code === 'user_not_found') {
        return 'No account found with this email. Please sign up first.';
      }
      if (err.message.toLowerCase().includes('email already') || err.code === 'user_already_registered') {
        return 'An account with this email already exists.';
      }
      if (err.message.toLowerCase().includes('session') || err.code === 'session_not_found') {
        return 'Your session has expired. Please log in again.';
      }
      return 'Authentication failed. Please try again.';
    case 'validation':
      return 'Please check your input and try again.';
    case 'database':
      return 'Failed to load data. Please try again.';
    case 'storage':
      return 'Failed to upload/download file. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

export const handleError = (error: unknown, showToast: boolean = true): AppError => {
  const appError = classifyError(error);
  console.error(`[CanteenGo Error: ${appError.type}]`, appError.message, appError.originalError || '');
  if (showToast) {
    showErrorToast(appError);
  }
  return appError;
};

export const showErrorToast = (error: AppError | string) => {
  const message = typeof error === 'string' ? error : getUserFriendlyMessage(error);
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    topOffset: 60,
  });
};

export const showSuccessToast = (message: string) => {
  Toast.show({
    type: 'success',
    text1: 'Success',
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    topOffset: 60,
  });
};

export const showInfoToast = (message: string) => {
  Toast.show({
    type: 'info',
    text1: 'Info',
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    topOffset: 60,
  });
};
