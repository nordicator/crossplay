import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

type ConnectionsCardProps = {
  username: string;
};

export function ConnectionsCard({ username }: ConnectionsCardProps) {
  const [spotifyConnected, setSpotifyConnected] = React.useState(false);
  const [appleConnected, setAppleConnected] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const trimmed = username.trim();

  const refresh = React.useCallback(async () => {
    if (!trimmed) {
      setSpotifyConnected(false);
      setAppleConnected(false);
      return;
    }

    setChecking(true);
    try {
      const [spotifyResult, appleResult] = await Promise.all([
        supabase
          .from('connected_accounts')
          .select('id')
          .eq('provider', 'spotify')
          .eq('username', trimmed)
          .maybeSingle(),
        supabase
          .from('connected_accounts')
          .select('id')
          .eq('provider', 'apple')
          .eq('username', trimmed)
          .maybeSingle(),
      ]);

      setSpotifyConnected(Boolean(spotifyResult.data));
      setAppleConnected(Boolean(appleResult.data));
    } catch {
      // no-op for display only
    } finally {
      setChecking(false);
    }
  }, [trimmed]);

  React.useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const connectSpotify = async () => {
    if (!trimmed) {
      Alert.alert('Username required', 'Save a username before connecting Spotify.');
      return;
    }

    try {
      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      await AsyncStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
      await AsyncStorage.setItem(SPOTIFY_USERNAME_KEY, trimmed);

      const scopes = ['user-read-playback-state', 'user-modify-playback-state'].join(' ');

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', env.spotifyClientId());
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', env.spotifyRedirectUri());
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', String(Date.now()));

      await WebBrowser.openAuthSessionAsync(authUrl.toString(), env.spotifyRedirectUri());
    } catch {
      Alert.alert('Spotify connection failed', 'Please try again.');
    }
  };

  const connectApple = () => {
    if (!trimmed) {
      Alert.alert('Username required', 'Save a username before connecting Apple Music.');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert('Not supported', 'Apple Music auth is not supported on Android yet.');
      return;
    }

    try {
      router.push('/auth/apple');
    } catch {
      WebBrowser.openBrowserAsync?.('/auth/apple');
    }
  };

  return (
    <Card className="bg-[#fff1e7]">
      <CardHeader className="flex-row items-center justify-between">
        <View>
          <CardTitle>Streaming services</CardTitle>
          <CardDescription>
            {trimmed ? 'Connections follow your username.' : 'Add a username to connect services.'}
          </CardDescription>
        </View>
        {checking ? <ActivityIndicator /> : null}
      </CardHeader>
      <CardContent className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-[#3b2f28]">Spotify</Text>
            <Text className="text-[12px] text-[#9a7f70]">
              {spotifyConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <Button size="sm" variant="secondary" onPress={connectSpotify}>
            {spotifyConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-[#3b2f28]">Apple Music</Text>
            <Text className="text-[12px] text-[#9a7f70]">
              {appleConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <Button size="sm" variant="secondary" onPress={connectApple}>
            {appleConnected ? 'Manage' : 'Connect'}
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
