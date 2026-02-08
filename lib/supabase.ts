import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtibxetzhsuqpvrfhgen.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aWJ4ZXR6aHN1cXB2cmZoZ2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTkyMDIsImV4cCI6MjA4NjA3NTIwMn0.TxgDVEVXLEMwk4N5DAaYbAqFykZkMfy6FIYR-ea5DcI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
