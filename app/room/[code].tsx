import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchAppleDeveloperToken, searchAppleTracks } from '@/src/lib/providers/apple';
import { ensureSpotifyAccessToken, searchSpotifyTracks } from '@/src/lib/providers/spotify';
import { supabase } from '@/src/lib/supabase';
import type { Room, UniversalTrack } from '@/src/lib/types';
import { getOrCreateUser, getStoredUsername } from '@/src/lib/user';
import { appleMusicRemote } from '@/src/lib/apple-music-remote';

type Provider = 'spotify' | 'apple';

export default function RoomScreen() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>('spotify');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UniversalTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const roomCode = Array.isArray(code) ? code[0] : code;

  useEffect(() => {
    getStoredUsername().then(setUsername).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!username) return;
    getOrCreateUser(username)
      .then(({ user_id }) => setUserId(user_id))
      .catch(() => undefined);
  }, [username]);

  useEffect(() => {
    if (!roomCode) {
      setError('Missing room code.');
      setLoading(false);
      return;
    }

    let active = true;

    const loadRoom = async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (!active) return;

      if (loadError || !data) {
        setError('Room not found.');
        setLoading(false);
        return;
      }

      setRoom(data as Room);
      setError(null);
      setLoading(false);
    };

    loadRoom().catch(() => {
      if (!active) return;
      setError('Room not found.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room || !userId) return;

    supabase
      .from('room_members')
      .upsert({ room_id: room.id, user_id: userId })
      .then(() => undefined)
      .catch(() => undefined);
  }, [room, userId]);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as Room);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room?.is_playing) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.is_playing]);

  const displayedPosition = useMemo(() => {
    if (!room) return 0;
    const base = room.position_ms ?? 0;
    const updatedAt = room.updated_at_ms ?? Date.now();
    if (!room.is_playing) return base;
    const delta = Math.max(0, nowMs - updatedAt);
    return base + delta;
  }, [room, nowMs]);

  const handleCopy = async () => {
    if (!room?.room_code) return;
    await Clipboard.setStringAsync(room.room_code);
    Alert.alert('Copied', 'Room code copied to clipboard.');
  };

  const updatePlayback = async (payload: Partial<Room>) => {
    if (!room) return;
    const update = {
      is_playing: payload.is_playing ?? room.is_playing ?? false,
      position_ms: payload.position_ms ?? room.position_ms ?? 0,
      updated_at_ms: Date.now(),
    };

    setRoom({ ...room, ...update });

    await supabase.from('rooms').update(update).eq('id', room.id);

    if (userId) {
      await supabase.from('room_events').insert({
        room_id: room.id,
        type: 'PLAYBACK_UPDATE',
        payload: update,
        actor_user_id: userId,
      });
    }
  };

  const handleSeek = async (deltaMs: number) => {
    if (!room) return;
    const duration = room.current_track?.durationMs ?? Number.MAX_SAFE_INTEGER;
    const next = Math.min(Math.max(0, displayedPosition + deltaMs), duration);
    if (room.current_track?.providers?.apple?.id && appleMusicRemote.isAvailable) {
      await appleMusicRemote.seekTo(next);
    }
    await updatePlayback({ position_ms: next });
  };

  const handleTogglePlay = async () => {
    if (!room) return;
    if (room.current_track?.providers?.apple?.id && appleMusicRemote.isAvailable) {
      if (room.is_playing) {
        await appleMusicRemote.pause();
      } else {
        const auth = await appleMusicRemote.requestAuthorization();
        if (auth !== 3) {
          Alert.alert('Apple Music', 'Apple Music access is required to control playback.');
        } else {
          await appleMusicRemote.play();
        }
      }
    }
    await updatePlayback({ is_playing: !room.is_playing, position_ms: displayedPosition });
  };

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !username) return;
    setSearching(true);
    try {
      if (provider === 'spotify') {
        const token = await ensureSpotifyAccessToken(username);
        const results = await searchSpotifyTracks(trimmed, token);
        setSearchResults(results);
      } else {
        const developerToken = await fetchAppleDeveloperToken();
        const results = await searchAppleTracks(trimmed, developerToken);
        setSearchResults(results);
      }
    } catch {
      Alert.alert('Search failed', 'Unable to search tracks.');
    } finally {
      setSearching(false);
    }
  };

  const handleSetTrack = async (track: UniversalTrack) => {
    if (!room) return;
    const update = {
      current_track: track,
      is_playing: false,
      position_ms: 0,
      updated_at_ms: Date.now(),
    };

    setRoom({ ...room, ...update });

    await supabase.from('rooms').update(update).eq('id', room.id);

    if (userId) {
      await supabase.from('room_events').insert({
        room_id: room.id,
        type: 'SET_TRACK',
        payload: track,
        actor_user_id: userId,
      });
    }

    if (track.providers?.apple?.id && appleMusicRemote.isAvailable) {
      const auth = await appleMusicRemote.requestAuthorization();
      if (auth !== 3) {
        Alert.alert('Apple Music', 'Apple Music access is required to start playback.');
        return;
      }
      await appleMusicRemote.setQueue([track.providers.apple.id], true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text>Loading room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !room) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text>{error ?? 'Room not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Room {room.room_code}</Text>
        <Pressable style={styles.secondaryButton} onPress={handleCopy}>
          <Text style={styles.secondaryButtonText}>Copy Code</Text>
        </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Now Playing</Text>
        <Text style={styles.trackTitle}>{room.current_track?.title ?? 'No track selected'}</Text>
        <Text style={styles.trackArtist}>{room.current_track?.artist ?? ''}</Text>
        <Text style={styles.trackMeta}>
          {room.is_playing ? 'Playing' : 'Paused'} · {Math.floor(displayedPosition / 1000)}s
        </Text>

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => handleSeek(-10_000)}>
            <Text style={styles.secondaryButtonText}>-10s</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleTogglePlay}>
            <Text style={styles.buttonText}>{room.is_playing ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => handleSeek(10_000)}>
            <Text style={styles.secondaryButtonText}>+10s</Text>
          </Pressable>
        </View>
      </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Track</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, provider === 'spotify' && styles.chipActive]}
            onPress={() => setProvider('spotify')}>
            <Text style={[styles.chipText, provider === 'spotify' && styles.chipTextActive]}>
              Spotify
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, provider === 'apple' && styles.chipActive]}
            onPress={() => setProvider('apple')}>
            <Text style={[styles.chipText, provider === 'apple' && styles.chipTextActive]}>
              Apple
            </Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Search tracks"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>{searching ? 'Searching...' : 'Search'}</Text>
        </Pressable>

        {searchResults.map((track) => (
          <Pressable
            key={`${track.title}-${track.artist}-${track.durationMs}`}
            style={styles.resultRow}
            onPress={() => handleSetTrack(track)}>
            <Text style={styles.resultTitle}>{track.title}</Text>
            <Text style={styles.resultArtist}>{track.artist}</Text>
          </Pressable>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 24,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f6f7fb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  trackArtist: {
    color: '#5b6472',
  },
  trackMeta: {
    color: '#5b6472',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e0e4ef',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e0e4ef',
  },
  chipActive: {
    backgroundColor: '#222222',
  },
  chipText: {
    fontWeight: '600',
    color: '#000',
  },
  chipTextActive: {
    color: '#fff',
  },
  resultRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e9f0',
  },
  resultTitle: {
    fontWeight: '600',
  },
  resultArtist: {
    color: '#5b6472',
  },
});
