import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';
import { getStoredUsername } from '@/src/lib/user';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

export default function PlaybackSettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [preferred, setPreferred] = useState<'spotify' | 'apple' | null>(null);

  const canSelectSpotify = spotifyConnected;
  const canSelectApple = appleConnected;

  useEffect(() => {
    getStoredUsername()
      .then((stored) => {
        if (stored) setUsername(stored);
      })
      .catch(() => undefined);
  }, []);

  const refreshConnections = useCallback(async () => {
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

  useEffect(() => {
    refreshConnections().catch(() => undefined);
  }, [refreshConnections]);

  const handleConnectSpotify = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Set a username in your profile first.');
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
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Set a username in your profile first.');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert('Not supported', 'Apple Music auth is not supported on Android in v1.');
      return;
    }

    router.push('/auth/apple');
  };

  const statusText = useMemo(() => {
    if (!username.trim()) return 'Set a username in your profile to enable connections.';
    return 'Connections are tied to your username.';
  }, [username]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>Playback</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Connect a service and pick your default.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connections</Text>
          <Text style={styles.caption}>{statusText}</Text>

          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>Spotify</Text>
            <Text style={styles.connectionStatus}>{spotifyConnected ? 'Connected' : 'Not connected'}</Text>
            <Pressable style={styles.secondaryButton} onPress={handleConnectSpotify}>
              <Text style={styles.secondaryButtonText}>Connect</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.selector, !canSelectSpotify && styles.selectorDisabled]}
            onPress={() => canSelectSpotify && setPreferred('spotify')}>
            <View style={[styles.radio, preferred === 'spotify' && styles.radioActive]} />
            <Text style={styles.selectorText}>Use Spotify for playback</Text>
          </Pressable>

          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>Apple Music</Text>
            <Text style={styles.connectionStatus}>{appleConnected ? 'Connected' : 'Not connected'}</Text>
            <Pressable style={styles.secondaryButton} onPress={handleConnectApple}>
              <Text style={styles.secondaryButtonText}>Connect</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.selector, !canSelectApple && styles.selectorDisabled]}
            onPress={() => canSelectApple && setPreferred('apple')}>
            <View style={[styles.radio, preferred === 'apple' && styles.radioActive]} />
            <Text style={styles.selectorText}>Use Apple Music for playback</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  primaryButton: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff7ed',
    fontWeight: '600',
  },
  caption: {
    color: '#5b6472',
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
    color: '#5b6472',
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  selectorDisabled: {
    opacity: 0.45,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5f5',
  },
  radioActive: {
    borderColor: '#f9735b',
    backgroundColor: 'rgba(249, 115, 91, 0.2)',
  },
  selectorText: {
    fontSize: 14,
    color: '#1f2937',
  },
});
