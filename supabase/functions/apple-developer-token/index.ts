// Supabase Edge Function: apple-developer-token
// Generates an Apple Music developer token (JWT).

import { SignJWT, importPKCS8 } from 'npm:jose@5.6.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const teamId = Deno.env.get('APPLE_MUSIC_TEAM_ID');
    const keyId = Deno.env.get('APPLE_MUSIC_KEY_ID');
    const privateKey = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY');

    if (!teamId || !keyId || !privateKey) {
      return new Response(JSON.stringify({ error: 'Missing Apple Music env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    // Apple allows up to 6 months (15777000 seconds). Use 180 days.
    const exp = now + 60 * 60 * 24 * 180;

    const pkcs8 = privateKey.includes('BEGIN PRIVATE KEY')
      ? privateKey
      : `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

    const key = await importPKCS8(pkcs8, 'ES256');

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(key);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
