import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';
import { getOrCreateUser, getStoredUsername, setStoredUsername } from '@/src/lib/user';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';
const MOCK_TOP_TRACKS = [
  { id: 't1', title: 'Crimson Skies', artist: 'Nova Bloom', plays: '28 plays' },
  { id: 't2', title: 'Late Train Home', artist: 'Solace', plays: '22 plays' },
  { id: 't3', title: 'Gilded Coast', artist: 'Mira Vox', plays: '18 plays' },
];
const MOCK_STATS = [
  { id: 's1', label: 'Minutes listened', value: '1,420' },
  { id: 's2', label: 'Top genre', value: 'Indie pop' },
  { id: 's3', label: 'Rooms hosted', value: '6' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);

  const canCreate = username.trim().length > 0 && !isWorking;
  const canJoin = roomCode.trim().length > 0 && !isWorking;

  useEffect(() => {
    getStoredUsername()
      .then((stored) => {
        if (stored) setUsername(stored);
      })
      .catch(() => {
        // ignore storage errors
      });
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

  useFocusEffect(
    useCallback(() => {
      refreshConnections().catch(() => undefined);
    }, [refreshConnections])
  );

  const handleSaveUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Please enter a username before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await setStoredUsername(trimmed);
      await refreshConnections();
    } catch {
      Alert.alert('Save failed', 'Could not save username.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRoom = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Please enter a username before creating a room.');
      return;
    }

    setIsWorking(true);
    try {
      const { user_id } = await getOrCreateUser(trimmed);

      const { data: roomData, error: roomError } = await supabase.rpc(
        'create_room_with_code',
        { code_len: 6 }
      );

      if (roomError) throw roomError;

      const room = Array.isArray(roomData) ? roomData[0] : roomData;
      if (!room) throw new Error('Room creation failed');

      await supabase
        .from('rooms')
        .update({ host_user_id: user_id })
        .eq('id', room.id);

      await supabase
        .from('room_members')
        .upsert({ room_id: room.id, user_id });

      router.push(`/room/${room.room_code}`);
    } catch {
      Alert.alert('Create room failed', 'Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmed = roomCode.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Room code required', 'Enter a room code to join.');
      return;
    }
    router.push(`/room/${trimmed}`);
  };

  const handleCopyCode = async () => {
    if (!roomCode.trim()) return;
    await Clipboard.setStringAsync(roomCode.trim().toUpperCase());
    Alert.alert('Copied', 'Room code copied to clipboard.');
  };

  const handleConnectSpotify = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Please save a username first.');
      return;
    }

    try {
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      await AsyncStorage.setItem(SPOTIFY_VERIFIER_KEY, codeVerifier);
      await AsyncStorage.setItem(SPOTIFY_USERNAME_KEY, trimmed);

      const scopes = [
        'user-read-playback-state',
        'user-modify-playback-state',
      ].join(' ');

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
      Alert.alert('Username required', 'Please save a username first.');
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert('Not supported', 'Apple Music auth is not supported on Android in v1.');
      return;
    }

    router.push('/auth/apple');
  };

  const statusText = useMemo(() => {
    if (!username.trim()) return 'Set a username to enable connections.';
    return 'Connections are tied to your username.';
  }, [username]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>Crossplay</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Your listening snapshot, ready to sync.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {MOCK_STATS.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Most listened</Text>
          {MOCK_TOP_TRACKS.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackText}>
                <Text style={styles.trackTitle}>{track.title}</Text>
                <Text style={styles.trackArtist}>{track.artist}</Text>
              </View>
              <Text style={styles.trackPlays}>{track.plays}</Text>
            </View>
          ))}
        </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a username"
          value={username}
          autoCapitalize="none"
          onChangeText={setUsername}
        />
        <Pressable
          style={[styles.button, { backgroundColor: theme.tint }, isSaving && styles.buttonDisabled]}
          onPress={handleSaveUsername}
          disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Rooms</Text>
        <Pressable
          style={[styles.button, { backgroundColor: theme.tint }, !canCreate && styles.buttonDisabled]}
          onPress={handleCreateRoom}
          disabled={!canCreate}>
          {isWorking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Room</Text>
          )}
        </Pressable>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            placeholder="Enter room code"
            value={roomCode}
            autoCapitalize="characters"
            onChangeText={setRoomCode}
          />
          <Pressable style={styles.secondaryButton} onPress={handleCopyCode}>
            <Text style={styles.secondaryButtonText}>Copy</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.button, { backgroundColor: theme.tint }, !canJoin && styles.buttonDisabled]}
          onPress={handleJoinRoom}
          disabled={!canJoin}>
          <Text style={styles.buttonText}>Join Room</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Connections</Text>
        <Text style={styles.caption}>{statusText}</Text>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionLabel}>Spotify</Text>
          <Text style={styles.connectionStatus}>
            {spotifyConnected ? 'Connected' : 'Not connected'}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={handleConnectSpotify}>
            <Text style={styles.secondaryButtonText}>Connect</Text>
          </Pressable>
        </View>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionLabel}>Apple Music</Text>
          <Text style={styles.connectionStatus}>
            {appleConnected ? 'Connected' : 'Not connected'}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={handleConnectApple}>
            <Text style={styles.secondaryButtonText}>Connect</Text>
          </Pressable>
        </View>
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
    gap: 18,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionCard: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  trackText: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  trackArtist: {
    fontSize: 12,
    color: '#6b7280',
  },
  trackPlays: {
    fontSize: 12,
    color: '#9ca3af',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff7ed',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
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
});
