import { env } from '@/src/lib/env';
import { supabase } from '@/src/lib/supabase';
import type { ConnectedAccount, UniversalTrack } from '@/src/lib/types';

const isExpired = (expiresAt: string | number | null | undefined): boolean => {
  if (!expiresAt) return true;
  const ms = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return true;
  return Date.now() >= ms - 60_000;
};

export async function getSpotifyAccount(username: string): Promise<ConnectedAccount | null> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('provider', 'spotify')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ConnectedAccount | null) ?? null;
}

export async function ensureSpotifyAccessToken(username: string): Promise<string> {
  const account = await getSpotifyAccount(username);
  if (account?.access_token && !isExpired(account.expires_at)) {
    return account.access_token;
  }

  const response = await fetch(`${env.supabaseFunctionsBase()}/spotify-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    throw new Error(`Spotify refresh failed: ${response.status}`);
  }

  const refreshed = await getSpotifyAccount(username);
  if (!refreshed?.access_token) {
    throw new Error('Spotify refresh did not return an access token');
  }

  return refreshed.access_token;
}

export async function searchSpotifyTracks(
  query: string,
  accessToken: string
): Promise<UniversalTrack[]> {
  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    tracks?: { items?: any[] };
  };

  const items = payload.tracks?.items ?? [];

  return items.map((track) => ({
    title: track.name,
    artist: track.artists?.map((a: any) => a.name).join(', ') ?? 'Unknown',
    durationMs: track.duration_ms,
    isrc: track.external_ids?.isrc ?? null,
    providers: {
      spotify: {
        id: track.id,
        uri: track.uri,
        url: track.external_urls?.spotify ?? null,
      },
    },
  }));
}
