import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

type Props = {
  username: string;
};

export function ConnectionsCard({ username }: Props) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const trimmed = username.trim();

  const refreshConnections = useCallback(async () => {
    if (!trimmed) {
      setSpotifyConnected(false);
      setAppleConnected(false);
      return;
    }

    setIsChecking(true);
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
      // swallow errors – purely cosmetic here
    } finally {
      setIsChecking(false);
    }
  }, [trimmed]);

  useEffect(() => {
    refreshConnections().catch(() => undefined);
  }, [refreshConnections]);

  const handleConnectSpotify = async () => {
    if (!trimmed) {
      Alert.alert('Username required', 'Please save a username first.');
      return;
    }

    try {
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      await AsyncStorage.setItem(SPOTIFY_VERIFIER_KEY, codeVerifier);
      await AsyncStorage.setItem(SPOTIFY_USERNAME_KEY, trimmed);

      const scopes = ['user-read-playback-state', 'user-modify-playback-state'].join(' ');

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', env.spotifyClientId());
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', env.spotifyRedirectUri());
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', String(Date.now()));

      await WebBrowser.openAuthSessionAsync(authUrl.toString(), env.spotifyRedirectUri());
    } catch {
      Alert.alert('Spotify auth failed', 'Please try again.');
    }
  };

  const handleConnectApple = () => {
    if (!trimmed) {
      Alert.alert('Username required', 'Please save a username first.');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert('Not supported', 'Apple Music auth is not supported on Android in v1.');
      return;
    }

    // keep same deep-link behaviour as existing app
    WebBrowser.openBrowserAsync?.('/auth/apple');
  };

  const statusText = useMemo(() => {
    if (!trimmed) return 'Set a username to enable connections.';
    return 'Connections are tied to your username.';
  }, [trimmed]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Streaming services</Text>
        {isChecking && <ActivityIndicator size="small" />}
      </View>
      <Text style={styles.caption}>{statusText}</Text>
      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>Spotify</Text>
        <Text style={[styles.connectionStatus, spotifyConnected && styles.connected]}>
          {spotifyConnected ? 'Connected' : 'Not connected'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={handleConnectSpotify}>
          <Text style={styles.secondaryButtonText}>
            {spotifyConnected ? 'Reconnect' : 'Connect'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.connectionRow}>
        <Text style={styles.connectionLabel}>Apple Music</Text>
        <Text style={[styles.connectionStatus, appleConnected && styles.connected]}>
          {appleConnected ? 'Connected' : 'Not connected'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={handleConnectApple}>
          <Text style={styles.secondaryButtonText}>
            {appleConnected ? 'Manage' : 'Connect'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  caption: {
    color: '#6b7280',
    fontSize: 13,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionLabel: {
    flex: 1,
    fontWeight: '600',
  },
  connectionStatus: {
    color: '#6b7280',
    fontSize: 13,
  },
  connected: {
    color: '#059669',
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f9735b',
  },
  secondaryButtonText: {
    color: '#fff7ed',
    fontWeight: '600',
    fontSize: 13,
  },
});

