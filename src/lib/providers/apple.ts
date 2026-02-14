import { env } from '@/src/lib/env';
import type { UniversalTrack } from '@/src/lib/types';

export async function fetchAppleDeveloperToken(): Promise<string> {
  const anonKey = env.supabaseAnonKey();
  const response = await fetch(`${env.supabaseFunctionsBase()}/apple-developer-token`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Apple developer token fetch failed: ${response.status} ${body}`.trim());
  }
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) {
    throw new Error('Apple developer token missing');
  }
  return payload.token;
}

export async function searchAppleTracks(
  query: string,
  developerToken: string,
  storefront = 'us'
): Promise<UniversalTrack[]> {
  const url = new URL(`https://api.music.apple.com/v1/catalog/${storefront}/search`);
  url.searchParams.set('term', query);
  url.searchParams.set('types', 'songs');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${developerToken}` },
  });

  if (!response.ok) {
    throw new Error(`Apple Music search failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: { songs?: { data?: any[] } };
  };

  const items = payload.results?.songs?.data ?? [];

  return items.map((song) => ({
    title: song.attributes?.name ?? 'Unknown',
    artist: song.attributes?.artistName ?? 'Unknown',
    durationMs: song.attributes?.durationInMillis ?? 0,
    isrc: song.attributes?.isrc ?? null,
    providers: {
      apple: {
        id: song.id,
        url: song.attributes?.url ?? null,
      },
    },
  }));
}
