import * as React from 'react';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { appleMusicRemote } from '@/src/lib/apple-music-remote';
import { fetchAppleDeveloperToken, searchAppleTracks } from '@/src/lib/providers/apple';
import { ensureSpotifyAccessToken, searchSpotifyTracks } from '@/src/lib/providers/spotify';
import { supabase } from '@/src/lib/supabase';
import type { Room, UniversalTrack } from '@/src/lib/types';
import { getOrCreateUser, getStoredUsername } from '@/src/lib/user';

type Provider = 'spotify' | 'apple';

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [room, setRoom] = React.useState<Room | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [provider, setProvider] = React.useState<Provider>('spotify');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<UniversalTrack[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [tick, setTick] = React.useState(Date.now());

  const roomCode = Array.isArray(code) ? code[0] : code;

  React.useEffect(() => {
    getStoredUsername().then(setUsername).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!username) return;
    getOrCreateUser(username)
      .then(({ user_id }) => setUserId(user_id))
      .catch(() => undefined);
  }, [username]);

  React.useEffect(() => {
    if (!roomCode) {
      setError('Missing room code.');
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
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

    load().catch(() => {
      if (!active) return;
      setError('Room not found.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [roomCode]);

  React.useEffect(() => {
    if (!room || !userId) return;
    supabase
      .from('room_members')
      .upsert({ room_id: room.id, user_id: userId })
      .then(() => undefined)
      .catch(() => undefined);
  }, [room, userId]);

  React.useEffect(() => {
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
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  React.useEffect(() => {
    if (!room?.is_playing) return;
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [room?.is_playing]);

  const currentPosition = React.useMemo(() => {
    if (!room) return 0;
    const base = room.position_ms ?? 0;
    const updatedAt = room.updated_at_ms ?? Date.now();
    if (!room.is_playing) return base;
    return base + Math.max(0, tick - updatedAt);
  }, [room, tick]);

  const handleCopyCode = async () => {
    if (!room?.room_code) return;
    await Clipboard.setStringAsync(room.room_code);
    Alert.alert('Copied', 'Room code copied to clipboard.');
  };

  const pushPlayback = async (next: Partial<Room>) => {
    if (!room) return;
    const update = {
      is_playing: next.is_playing ?? room.is_playing ?? false,
      position_ms: next.position_ms ?? room.position_ms ?? 0,
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

  const seekBy = async (deltaMs: number) => {
    if (!room) return;
    const duration = room.current_track?.durationMs ?? Number.MAX_SAFE_INTEGER;
    const next = Math.min(Math.max(0, currentPosition + deltaMs), duration);
    if (room.current_track?.providers?.apple?.id && appleMusicRemote.isAvailable) {
      await appleMusicRemote.seekTo(next);
    }
    await pushPlayback({ position_ms: next });
  };

  const togglePlay = async () => {
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
    await pushPlayback({ is_playing: !room.is_playing, position_ms: currentPosition });
  };

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || !username) return;
    setSearching(true);
    try {
      if (provider === 'spotify') {
        const token = await ensureSpotifyAccessToken(username);
        const found = await searchSpotifyTracks(trimmed, token);
        setResults(found);
      } else {
        const developerToken = await fetchAppleDeveloperToken();
        const found = await searchAppleTracks(trimmed, developerToken);
        setResults(found);
      }
    } catch {
      Alert.alert('Search failed', 'Unable to search tracks.');
    } finally {
      setSearching(false);
    }
  };

  const setTrack = async (track: UniversalTrack) => {
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
  };

  return (
    <View className="flex-1 bg-[#ffffff] pt-safe">
      <ScrollView contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[22px] font-semibold text-[#3b2f28]">
            Room {roomCode ?? '--'}
          </Text>
          <Button size="sm" variant="secondary" onPress={handleCopyCode}>
            Copy Code
          </Button>
        </View>

        {loading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Card className="px-4 py-6">
            <Text className="text-center text-[14px] text-[#9b7c6b]">{error}</Text>
          </Card>
        ) : (
          <>
            <Card className="px-4 py-4">
              <Text className="text-[16px] font-semibold text-[#3b2f28]">Now Playing</Text>
              <View className="mt-2">
                <Text className="text-[15px] font-semibold text-[#3b2f28]">
                  {room?.current_track?.title ?? 'No track selected'}
                </Text>
                <Text className="text-[12px] text-[#9b7c6b]">
                  {room?.current_track?.artist ?? 'Pick a track to get started'}
                </Text>
                <Text className="mt-1 text-[11px] text-[#b19787]">
                  {room?.is_playing ? 'Playing' : 'Paused'} · {Math.floor(currentPosition / 1000)}s
                </Text>
              </View>

              <View className="mt-4 flex-row items-center gap-3">
                <Pressable
                  onPress={() => seekBy(-15000)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4]">
                  <FontAwesome name="backward" size={14} color="#3b2f28" />
                </Pressable>
                <Pressable
                  onPress={togglePlay}
                  className="h-12 w-12 items-center justify-center rounded-full bg-[#3b2f28]">
                  <FontAwesome name={room?.is_playing ? 'pause' : 'play'} size={14} color="#fff6ee" />
                </Pressable>
                <Pressable
                  onPress={() => seekBy(15000)}
                  className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4]">
                  <FontAwesome name="forward" size={14} color="#3b2f28" />
                </Pressable>
              </View>
            </Card>

            <Card className="px-4 py-4">
              <Text className="text-[16px] font-semibold text-[#3b2f28]">Set Track</Text>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() => setProvider('spotify')}
                  className={`flex-1 rounded-full px-3 py-2 ${
                    provider === 'spotify' ? 'bg-[#1db954]' : 'bg-[#f3e7dc]'
                  }`}>
                  <Text
                    className={`text-center text-[12px] font-semibold ${
                      provider === 'spotify' ? 'text-white' : 'text-[#7a5b4c]'
                    }`}>
                    Spotify
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProvider('apple')}
                  className={`flex-1 rounded-full px-3 py-2 ${
                    provider === 'apple' ? 'bg-[#f472b6]' : 'bg-[#f3e7dc]'
                  }`}>
                  <Text
                    className={`text-center text-[12px] font-semibold ${
                      provider === 'apple' ? 'text-white' : 'text-[#7a5b4c]'
                    }`}>
                    Apple
                  </Text>
                </Pressable>
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <Input
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search for a track"
                  className="flex-1 rounded-2xl"
                />
                <Button variant="dark" size="sm" onPress={runSearch}>
                  Search
                </Button>
              </View>

              <View className="mt-4 gap-2">
                {searching ? (
                  <View className="items-center py-4">
                    <ActivityIndicator />
                  </View>
                ) : results.length === 0 ? (
                  <Text className="text-[12px] text-[#a08474]">No results yet.</Text>
                ) : (
                  results.map((track, index) => (
                    <Pressable
                      key={`${track.id}-${index}`}
                      onPress={() => setTrack(track)}
                      className="rounded-2xl border border-[#efe1d4] bg-[#fff7ef] px-3 py-3">
                      <Text className="text-[14px] font-semibold text-[#3b2f28]">{track.title}</Text>
                      <Text className="text-[12px] text-[#9b7c6b]">{track.artist}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
