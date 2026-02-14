import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { env } from '@/src/lib/env';
import { getStoredUsername } from '@/src/lib/user';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USER_ID_KEY = 'crossplay.spotify.user_id';

export default function SpotifyCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = React.useState('Finishing Spotify connection...');

  React.useEffect(() => {
    const finalize = async () => {
      if (!code || Array.isArray(code)) {
        setStatus('Missing authorization code.');
        return;
      }

      const [codeVerifier, userId, username] = await Promise.all([
        AsyncStorage.getItem(SPOTIFY_VERIFIER_KEY),
        AsyncStorage.getItem(SPOTIFY_USER_ID_KEY),
        getStoredUsername(),
      ]);

      if (!codeVerifier || !userId) {
        setStatus('Missing stored verifier or user id.');
        return;
      }

      const response = await fetch(`${env.supabaseFunctionsBase()}/spotify-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: env.spotifyRedirectUri(),
          code_verifier: codeVerifier,
          user_id: userId,
          username,
        }),
      });

      if (!response.ok) {
        setStatus('Spotify exchange failed.');
        return;
      }

      await AsyncStorage.removeItem(SPOTIFY_VERIFIER_KEY);
      await AsyncStorage.removeItem(SPOTIFY_USER_ID_KEY);
      router.replace('/');
    };

    finalize().catch(() => setStatus('Spotify exchange failed.'));
  }, [code]);

  return (
    <View className="flex-1 items-center justify-center bg-[#f9f1e8] px-6">
      <ActivityIndicator />
      <Text className="mt-3 text-center text-[14px] text-[#7a5b4c]">{status}</Text>
    </View>
  );
}
