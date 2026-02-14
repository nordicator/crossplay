import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';

const USERNAME_KEY = 'crossplay.username';
const DISPLAY_NAME_KEY = 'crossplay.display_name';
const FAVORITE_GENRES_KEY = 'crossplay.favorite_genres';

export type AppProfile = {
  id: string;
  username: string;
  display_name: string;
  favorite_genres: string[];
};

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, favorite_genres')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id as string,
    username: data.username as string,
    display_name: data.display_name as string,
    favorite_genres: (data.favorite_genres as string[] | null) ?? [],
  };
}

export async function getStoredUsername(): Promise<string | null> {
  try {
    const profile = await getCurrentProfile();
    if (profile?.username) {
      await AsyncStorage.setItem(USERNAME_KEY, profile.username);
      return profile.username;
    }
  } catch {
    // Fall back to local cache when profile fetch fails.
  }
  return AsyncStorage.getItem(USERNAME_KEY);
}

export async function setStoredUsername(username: string): Promise<void> {
  await AsyncStorage.setItem(USERNAME_KEY, username);
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from('profiles').update({ username }).eq('id', userId);
}

export async function getOrCreateUser(username: string): Promise<{ user_id: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('No signed-in user');
  }

  if (username.trim()) {
    await supabase.from('profiles').update({ username: username.trim() }).eq('id', userId);
  }

  return { user_id: userId };
}

export async function updateCurrentProfile(payload: {
  username?: string;
  display_name?: string;
  favorite_genres?: string[];
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('No signed-in user');
  }

  const updatePayload: Record<string, unknown> = {};
  if (typeof payload.username === 'string') {
    updatePayload.username = payload.username.trim();
    await AsyncStorage.setItem(USERNAME_KEY, payload.username.trim());
  }
  if (typeof payload.display_name === 'string') {
    updatePayload.display_name = payload.display_name.trim();
    await AsyncStorage.setItem(DISPLAY_NAME_KEY, payload.display_name.trim());
  }
  if (Array.isArray(payload.favorite_genres)) {
    updatePayload.favorite_genres = payload.favorite_genres;
    await AsyncStorage.setItem(FAVORITE_GENRES_KEY, JSON.stringify(payload.favorite_genres));
  }

  const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
  if (error) {
    throw error;
  }
}
