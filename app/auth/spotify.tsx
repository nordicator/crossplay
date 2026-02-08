import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { env } from '@/src/lib/env';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

export default function SpotifyCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState('Finishing Spotify connection...');

  useEffect(() => {
    const run = async () => {
      if (!code || Array.isArray(code)) {
        setStatus('Missing authorization code.');
        return;
      }

      const [codeVerifier, username] = await Promise.all([
        AsyncStorage.getItem(SPOTIFY_VERIFIER_KEY),
        AsyncStorage.getItem(SPOTIFY_USERNAME_KEY),
      ]);

      if (!codeVerifier || !username) {
        setStatus('Missing stored verifier or username.');
        return;
      }

      const response = await fetch(`${env.supabaseFunctionsBase()}/spotify-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: env.spotifyRedirectUri(),
          code_verifier: codeVerifier,
          username,
        }),
      });

      if (!response.ok) {
        setStatus('Spotify exchange failed.');
        return;
      }

      await AsyncStorage.removeItem(SPOTIFY_VERIFIER_KEY);
      router.replace('/');
    };

    run().catch(() => {
      setStatus('Spotify exchange failed.');
    });
  }, [code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  text: {
    textAlign: 'center',
  },
});
