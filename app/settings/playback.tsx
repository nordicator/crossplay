import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';
import { getStoredUsername } from '@/src/lib/user';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

type Service = 'spotify' | 'apple';

export default function PlaybackSettingsScreen() {
  const [username, setUsername] = React.useState('');
  const [spotifyConnected, setSpotifyConnected] = React.useState(false);
  const [appleConnected, setAppleConnected] = React.useState(false);
  const [preferred, setPreferred] = React.useState<Service | null>(null);

  React.useEffect(() => {
    getStoredUsername()
      .then((stored) => stored && setUsername(stored))
      .catch(() => undefined);
  }, []);

  const refreshConnections = React.useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setSpotifyConnected(false);
      setAppleConnected(false);
      return;
    }

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
  }, [username]);

  React.useEffect(() => {
    refreshConnections().catch(() => undefined);
  }, [refreshConnections]);

  const connectSpotify = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Set a username in your profile first.');
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
      Alert.alert('Spotify auth failed', 'Please try again.');
    }
  };

  const connectApple = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Set a username in your profile first.');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert('Not supported', 'Apple Music auth is not supported on Android yet.');
      return;
    }

    router.push('/auth/apple');
  };

  const canPickSpotify = spotifyConnected;
  const canPickApple = appleConnected;

  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <ScrollView contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5">
        <View className="gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4] bg-[#fff7ef]">
            <FontAwesome name="chevron-left" size={16} color="#3b2f28" />
          </Pressable>
          <View className="gap-2">
            <Text className="text-3xl font-semibold text-[#3b2f28]">Playback</Text>
            <Text className="text-[14px] text-[#9b7c6b]">
              Connect a service and set your default player.
            </Text>
          </View>
        </View>

        <Card className="px-4 py-4">
          <Text className="text-[16px] font-semibold text-[#3b2f28]">Connections</Text>
          <Text className="text-[12px] text-[#9b7c6b]">
            {username.trim()
              ? 'Connections stay tied to your username.'
              : 'Add a username in profile to enable connections.'}
          </Text>

          <View className="mt-4 gap-4">
            <ServiceRow
              label="Spotify"
              connected={spotifyConnected}
              onConnect={connectSpotify}
              buttonLabel={spotifyConnected ? 'Reconnect' : 'Connect'}
            />
            <RadioRow
              label="Use Spotify for playback"
              active={preferred === 'spotify'}
              disabled={!canPickSpotify}
              onPress={() => canPickSpotify && setPreferred('spotify')}
            />

            <Separator className="my-2" />

            <ServiceRow
              label="Apple Music"
              connected={appleConnected}
              onConnect={connectApple}
              buttonLabel={appleConnected ? 'Manage' : 'Connect'}
            />
            <RadioRow
              label="Use Apple Music for playback"
              active={preferred === 'apple'}
              disabled={!canPickApple}
              onPress={() => canPickApple && setPreferred('apple')}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function ServiceRow({
  label,
  connected,
  onConnect,
  buttonLabel,
}: {
  label: string;
  connected: boolean;
  onConnect: () => void;
  buttonLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-[#3b2f28]">{label}</Text>
        <Text className="text-[12px] text-[#9b7c6b]">
          {connected ? 'Connected' : 'Not connected'}
        </Text>
      </View>
      <Button size="sm" variant="secondary" onPress={onConnect}>
        {buttonLabel}
      </Button>
    </View>
  );
}

function RadioRow({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-full px-3 py-2 ${
        disabled ? 'bg-[#f3e7dc]' : 'bg-[#fffaf4]'
      }`}>
      <View
        className={`h-4 w-4 rounded-full border ${
          active ? 'border-[#f27663] bg-[#f27663]' : 'border-[#d8c6b9] bg-transparent'
        }`}
      />
      <Text
        className={`text-[13px] ${disabled ? 'text-[#c4b0a2]' : 'text-[#7a5b4c]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
