import { supabase } from '@/src/lib/supabase';

export type ProviderKey = 'spotify' | 'apple_music';

const providerIdCache: Partial<Record<ProviderKey, string>> = {};

export async function getProviderId(providerKey: ProviderKey): Promise<string> {
  const cached = providerIdCache[providerKey];
  if (cached) return cached;

  const { data, error } = await supabase
    .from('streaming_providers')
    .select('id')
    .eq('key', providerKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Provider lookup failed for ${providerKey}: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`Missing streaming provider: ${providerKey}`);
  }

  providerIdCache[providerKey] = data.id as string;
  return data.id as string;
}

export async function isProviderConnected(userId: string, providerKey: ProviderKey): Promise<boolean> {
  const providerId = await getProviderId(providerKey);
  const { data, error } = await supabase
    .from('user_streaming_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .in('status', ['connected', 'pending'])
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

export async function upsertProviderConnection({
  userId,
  providerKey,
  status = 'connected',
  accessToken,
  refreshToken,
  tokenExpiresAt,
  externalAccountId,
  scopes,
  connectionData,
}: {
  userId: string;
  providerKey: ProviderKey;
  status?: 'connected' | 'disconnected' | 'error' | 'pending';
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  externalAccountId?: string | null;
  scopes?: string[] | null;
  connectionData?: Record<string, unknown> | null;
}): Promise<void> {
  const providerId = await getProviderId(providerKey);
  const { error } = await supabase.from('user_streaming_connections').upsert(
    {
      user_id: userId,
      provider_id: providerId,
      status,
      access_token: accessToken ?? null,
      refresh_token: refreshToken ?? null,
      token_expires_at: tokenExpiresAt ?? null,
      external_account_id: externalAccountId ?? null,
      scopes: scopes ?? [],
      connection_data: connectionData ?? {},
    },
    { onConflict: 'user_id,provider_id' }
  );

  if (error) {
    throw error;
  }
}

export async function getUserProviderConnection(userId: string, providerKey: ProviderKey) {
  const providerId = await getProviderId(providerKey);
  const { data, error } = await supabase
    .from('user_streaming_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
