import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/src/lib/env';

export const supabase = createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
