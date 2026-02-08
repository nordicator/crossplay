const requireSupabaseUrl = (): string => {
  const value = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error('Missing required env var: EXPO_PUBLIC_SUPABASE_URL');
  return value;
};

const requireSupabaseAnonKey = (): string => {
  const value = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error('Missing required env var: EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return value;
};

const requireSpotifyClientId = (): string => {
  const value = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!value) throw new Error('Missing required env var: EXPO_PUBLIC_SPOTIFY_CLIENT_ID');
  return value;
};

const requireSpotifyRedirectUri = (): string => {
  const value = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI;
  if (!value) throw new Error('Missing required env var: EXPO_PUBLIC_SPOTIFY_REDIRECT_URI');
  return value;
};

export const env = {
  supabaseUrl: requireSupabaseUrl,
  supabaseAnonKey: requireSupabaseAnonKey,
  spotifyClientId: requireSpotifyClientId,
  spotifyRedirectUri: requireSpotifyRedirectUri,
  supabaseFunctionsBase: () =>
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE || `${requireSupabaseUrl()}/functions/v1`,
};
