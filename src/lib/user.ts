import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';

const USERNAME_KEY = 'crossplay.username';

export async function getStoredUsername(): Promise<string | null> {
  return AsyncStorage.getItem(USERNAME_KEY);
}

export async function setStoredUsername(username: string): Promise<void> {
  await AsyncStorage.setItem(USERNAME_KEY, username);
}

export async function getOrCreateUser(username: string): Promise<{ user_id: string }> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ username }, { onConflict: 'username' })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return { user_id: data.id as string };
}
