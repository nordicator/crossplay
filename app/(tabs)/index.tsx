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

import { env } from '@/src/lib/env';
import { generateCodeChallenge, generateCodeVerifier } from '@/src/lib/pkce';
import { supabase } from '@/src/lib/supabase';
import { getOrCreateUser, getStoredUsername, setStoredUsername } from '@/src/lib/user';

const SPOTIFY_VERIFIER_KEY = 'crossplay.spotify.code_verifier';
const SPOTIFY_USERNAME_KEY = 'crossplay.spotify.username';

export default function HomeScreen() {
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Crossplay</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a username"
          value={username}
          autoCapitalize="none"
          onChangeText={setUsername}
        />
        <Pressable
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleSaveUsername}
          disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rooms</Text>
        <Pressable
          style={[styles.button, !canCreate && styles.buttonDisabled]}
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
          style={[styles.button, !canJoin && styles.buttonDisabled]}
          onPress={handleJoinRoom}
          disabled={!canJoin}>
          <Text style={styles.buttonText}>Join Room</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f6f7fb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d2d6e0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#222222',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
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
    backgroundColor: '#e0e4ef',
  },
  secondaryButtonText: {
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
});
