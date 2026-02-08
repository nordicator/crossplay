# CrossPlay Authentication Flow

A complete React Native Expo authentication system with Spotify and Apple Music integration.

## Features

- ✅ Username/Password authentication with Supabase
- ✅ Account creation with profile setup
- ✅ Spotify OAuth integration (ready to implement)
- ✅ Apple Music integration (iOS ready)
- ✅ Beautiful UI with your custom color palette
- ✅ Auto-navigation based on auth state
- ✅ Expo Router file-based navigation

## Color Palette

- Primary (Dark Green): `#143D29`
- Secondary (Medium Dark Green): `#1A5F3F`
- Tertiary (Medium Green): `#60936C`
- Light (Off White): `#E8E7E3`
- Accent (Yellow-Green): `#D1C766`

## Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app)
- Supabase project (already configured)
- Spotify Developer Account
- Apple Developer Account (for Apple Music)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Spotify OAuth:**

   a. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   
   b. Create or select your app
   
   c. Add redirect URIs:
      - For development: `exp://localhost:8081/--/spotify-callback`
      - For production: Add your custom scheme (e.g., `crossplay://spotify-callback`)
   
   d. Update `app/(connect)/connect-service.tsx`:
      ```typescript
      const SPOTIFY_CLIENT_ID = 'your_client_id_here';
      ```

3. **Configure Apple Music (iOS only):**

   a. Set up MusicKit in Apple Developer Portal
   
   b. Get your Developer Token
   
   c. Implement MusicKit authorization (see TODO comments in connect-service.tsx)

## Project Structure

```
app/
├── _layout.tsx              # Root layout with auth state management
├── index.tsx                # Entry point (redirects to login)
├── (auth)/                  # Authentication screens
│   ├── _layout.tsx
│   ├── login.tsx           # Login screen
│   └── signup.tsx          # Signup screen
├── (connect)/              # Music service connection
│   ├── _layout.tsx
│   └── connect-service.tsx # Spotify/Apple Music connection
└── (tabs)/                 # Main app (after auth)
    ├── _layout.tsx
    └── index.tsx           # Home screen

lib/
└── supabase.ts             # Supabase client configuration

constants/
└── Colors.ts               # Your color palette
```

## Database Schema

Your Supabase tables are already set up:

- `users` - Username registry
- `profiles` - User display names
- `connected_accounts` - Music service connections
- `rooms` - Music rooms
- `room_members` - Room participants
- `room_events` - Playback events
- `spotify_tokens` - (legacy, use connected_accounts)

## Running the App

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Authentication Flow

1. **New User:**
   - Signup screen → Create account → Connect music service → Home

2. **Returning User:**
   - Login screen → Check for connected service:
     - Has service → Home
     - No service → Connect music service → Home

3. **Navigation Logic:**
   - Handled automatically by `app/_layout.tsx`
   - Checks auth state and connected services
   - Redirects to appropriate screen

## Implementing Spotify Token Exchange

The current implementation gets the authorization code from Spotify. You need to create a backend endpoint to exchange it for access/refresh tokens.

### Option 1: Supabase Edge Function

Create a Supabase Edge Function:

```typescript
// supabase/functions/spotify-token-exchange/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { code, userId } = await req.json()
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
  })
  
  const tokens = await tokenResponse.json()
  
  // Get user profile from Spotify
  const profileResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })
  const profile = await profileResponse.json()
  
  // Save to database
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  await supabase.from('connected_accounts').insert({
    user_id: userId,
    provider: 'spotify',
    provider_user_id: profile.id,
    display_name: profile.display_name,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope,
    token_type: tokens.token_type,
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

Then call it from your app:

```typescript
const response = await fetch('YOUR_SUPABASE_URL/functions/v1/spotify-token-exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, userId: user.id }),
})
```

## Apple Music Implementation

For iOS, you'll need to:

1. Install MusicKit: `expo install expo-apple-authentication`
2. Request user token from MusicKit
3. Save to `connected_accounts` table with `apple_music_user_token`

See [Apple MusicKit Documentation](https://developer.apple.com/documentation/musickit)

## Security Notes

- Never expose Spotify Client Secret in your app
- Use Supabase Edge Functions or a secure backend for token exchanges
- Refresh tokens should be stored securely
- Consider implementing token refresh logic

## Troubleshooting

**"Redirect URI mismatch" error:**
- Make sure your Spotify app's redirect URIs match exactly
- For Expo Go, use `exp://` scheme
- For production, use your custom scheme from app.json

**Navigation not working:**
- Check that all route groups have `_layout.tsx` files
- Verify Expo Router is properly installed
- Clear Metro bundler cache: `npx expo start -c`

**Supabase connection issues:**
- Verify URL and anon key are correct
- Check your Supabase project is not paused
- Ensure RLS policies allow the operations

## Next Steps

1. Add Spotify token exchange endpoint
2. Implement Apple Music authorization
3. Add token refresh logic
4. Build the main app features (rooms, playback, etc.)
5. Add error handling and loading states
6. Implement social login (future v2)

## Support

For issues or questions:
- Check Expo Router docs: https://docs.expo.dev/router/introduction/
- Supabase docs: https://supabase.com/docs
- Spotify OAuth guide: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
