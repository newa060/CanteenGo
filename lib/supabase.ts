import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';

const SUPABASE_URL_VALUE = SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY_VALUE = SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient<Database>(SUPABASE_URL_VALUE, SUPABASE_ANON_KEY_VALUE, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const getSupabase = () => supabase;

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export type SupabaseClient = typeof supabase;
