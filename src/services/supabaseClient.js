import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://swnocdeyclhzevdgtdrz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_r_NCnZLMgP24OLqNgdrnPg_MYzoskik';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
