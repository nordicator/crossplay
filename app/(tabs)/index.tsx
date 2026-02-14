import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { appleMusicRemote } from '@/src/lib/apple-music-remote';
import { supabase } from '@/src/lib/supabase';

const HOTLINE_BLING_STORE_ID = '1440839721';
const SCROBBLES_KEY = 'sostenuto.scrobbles';
const MAX_SCROBBLES = 25;
type ScrobbleEntry = { title: string; artist: string; playedAt: string };

const STATS = [
  { id: 'minutes', label: 'Minutes listened', value: '1,284' },
  { id: 'genre', label: 'Top genre', value: 'Bedroom pop' },
  { id: 'rooms', label: 'Rooms hosted', value: '5' },
];

const TOP_TRACKS = [
  { id: 't1', title: 'Soft Halo', artist: 'Nova Bloom', plays: '31 plays' },
  { id: 't2', title: 'Coastline Eyes', artist: 'Solace', plays: '24 plays' },
  { id: 't3', title: 'Amber Street', artist: 'Mira Vox', plays: '19 plays' },
  { id: 't4', title: 'Daydream Drive', artist: 'Sable Day', plays: '14 plays' },
];

export default function HomeScreen() {
  const [playingTestTrack, setPlayingTestTrack] = React.useState(false);
  const [controlling, setControlling] = React.useState(false);
  const [scrobbles, setScrobbles] = React.useState<ScrobbleEntry[]>([]);
  const [nowPlaying, setNowPlaying] = React.useState<{
    title: string | null;
    artist: string | null;
    albumTitle: string | null;
    durationMs: number;
    playbackState: number;
  } | null>(null);
  const currentTrackKeyRef = React.useRef<string | null>(null);
  const trackStartRef = React.useRef<number | null>(null);
  const scrobbledTrackKeyRef = React.useRef<string | null>(null);

  const loadScrobbles = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SCROBBLES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ScrobbleEntry[];
      setScrobbles(Array.isArray(parsed) ? parsed : []);
    } catch {
      // no-op
    }
  }, []);

  React.useEffect(() => {
    loadScrobbles().catch(() => undefined);
  }, [loadScrobbles]);

  const saveScrobble = React.useCallback(
    async (track: { title: string; artist: string; albumTitle: string | null; durationMs: number }) => {
      const entry = {
        title: track.title,
        artist: track.artist,
        playedAt: new Date().toISOString(),
      };

      try {
        const raw = await AsyncStorage.getItem(SCROBBLES_KEY);
        const current = raw ? ((JSON.parse(raw) as ScrobbleEntry[]) ?? []) : [];
        const next = [entry, ...current].slice(0, MAX_SCROBBLES);
        await AsyncStorage.setItem(SCROBBLES_KEY, JSON.stringify(next));
        setScrobbles(next);
      } catch {
        // no-op
      }

      // Optional cloud scrobble; safe to fail if table doesn't exist yet.
      await supabase.from('playback_scrobbles').insert({
        provider: 'apple_music',
        track_title: track.title,
        artist_name: track.artist,
        album_title: track.albumTitle,
        duration_ms: track.durationMs,
        played_at: entry.playedAt,
      });
    },
    []
  );

  const playHotlineBling = async () => {
    if (!appleMusicRemote.isAvailable) {
      Alert.alert('Not available', 'Apple Music controls are only available on iOS.');
      return;
    }

    setPlayingTestTrack(true);
    try {
      const authStatus = await appleMusicRemote.requestAuthorization();
      if (authStatus !== 3) {
        Alert.alert('Apple Music', 'Please allow Apple Music access first.');
        return;
      }

      await appleMusicRemote.setQueue([HOTLINE_BLING_STORE_ID], true);
      const current = await appleMusicRemote.getNowPlaying();
      setNowPlaying(
        current
          ? {
              title: current.title,
              artist: current.artist,
              albumTitle: current.albumTitle,
              durationMs: current.durationMs,
              playbackState: current.playbackState,
            }
          : null
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start Apple Music track.';
      Alert.alert('Apple Music error', message);
    } finally {
      setPlayingTestTrack(false);
    }
  };

  const runTransportAction = async (action: 'prev' | 'next' | 'toggle') => {
    if (!appleMusicRemote.isAvailable) return;
    setControlling(true);
    try {
      if (action === 'prev') await appleMusicRemote.skipToPrevious();
      if (action === 'next') await appleMusicRemote.skipToNext();
      if (action === 'toggle') {
        if (nowPlaying?.playbackState === 1) await appleMusicRemote.pause();
        else await appleMusicRemote.play();
      }
      const current = await appleMusicRemote.getNowPlaying();
      setNowPlaying(
        current
          ? {
              title: current.title,
              artist: current.artist,
              albumTitle: current.albumTitle,
              durationMs: current.durationMs,
              playbackState: current.playbackState,
            }
          : null
      );
    } catch {
      Alert.alert('Playback control failed', 'Could not update Apple Music playback.');
    } finally {
      setControlling(false);
    }
  };

  React.useEffect(() => {
    if (!appleMusicRemote.isAvailable) return;

    let active = true;

    const refreshNowPlaying = async () => {
      try {
        const current = await appleMusicRemote.getNowPlaying();
        if (!active) return;
        setNowPlaying(
          current
            ? {
                title: current.title,
                artist: current.artist,
                albumTitle: current.albumTitle,
                durationMs: current.durationMs,
                playbackState: current.playbackState,
              }
            : null
        );
      } catch {
        if (!active) return;
        setNowPlaying(null);
      }
    };

    refreshNowPlaying().catch(() => undefined);
    const interval = setInterval(() => {
      refreshNowPlaying().catch(() => undefined);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!nowPlaying?.title || !nowPlaying.artist) return;
    const key = `${nowPlaying.title}|${nowPlaying.artist}`;

    if (key !== currentTrackKeyRef.current) {
      currentTrackKeyRef.current = key;
      trackStartRef.current = Date.now();
    }

    if (nowPlaying.playbackState !== 1) return;
    if (scrobbledTrackKeyRef.current === key) return;

    const startedAt = trackStartRef.current ?? Date.now();
    const elapsedMs = Date.now() - startedAt;
    const thresholdMs = Math.min(
      Math.max(Math.floor(nowPlaying.durationMs * 0.5), 30_000),
      240_000
    );

    if (elapsedMs >= thresholdMs) {
      scrobbledTrackKeyRef.current = key;
      saveScrobble({
        title: nowPlaying.title,
        artist: nowPlaying.artist,
        albumTitle: nowPlaying.albumTitle,
        durationMs: nowPlaying.durationMs,
      }).catch(() => undefined);
    }
  }, [nowPlaying, saveScrobble]);

  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <ScrollView
        contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-[#3b2f28]">Crossplay</Text>
          <Text className="text-[14px] text-[#9b7c6b]">
            Your listening snapshot, ready to sync.
          </Text>
        </View>

        <View className="flex-row gap-3">
          {STATS.map((stat) => (
            <Card key={stat.id} className="flex-1 px-3 py-3">
              <Text className="text-[16px] font-semibold text-[#3b2f28]">{stat.value}</Text>
              <Text className="text-[12px] text-[#a08474]">{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Card className="px-4 py-4">
          <Text className="text-[18px] font-semibold text-[#3b2f28]">Currently listening to</Text>
          {nowPlaying?.title ? (
            <View className="mt-2">
              <Text className="text-[15px] font-semibold text-[#3b2f28]">{nowPlaying.title}</Text>
              <Text className="text-[12px] text-[#a08474]">{nowPlaying.artist ?? 'Unknown artist'}</Text>
              <Text className="mt-1 text-[11px] text-[#b19787]">
                {nowPlaying.playbackState === 1 ? 'Playing' : 'Paused'}
              </Text>
            </View>
          ) : (
            <Text className="mt-2 text-[12px] text-[#a08474]">
              Nothing from Apple Music detected yet.
            </Text>
          )}
          <View className="mt-3 flex-row gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => runTransportAction('prev')}
              disabled={controlling}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => runTransportAction('toggle')}
              disabled={controlling}>
              {nowPlaying?.playbackState === 1 ? 'Pause' : 'Play'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => runTransportAction('next')}
              disabled={controlling}>
              Next
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={async () => {
                try {
                  await appleMusicRemote.seekTo(60_000);
                } catch {
                  Alert.alert('Seek failed', 'Could not jump to 1:00.');
                }
              }}
              disabled={controlling}>
              Jump to 1:00
            </Button>
          </View>
          <View className="mt-3">
            <Button size="sm" variant="secondary" onPress={playHotlineBling} disabled={playingTestTrack}>
              {playingTestTrack ? 'Loading track...' : 'Play Hotline Bling (Test)'}
            </Button>
          </View>
        </Card>

        <Card className="px-4 py-4">
          <Text className="text-[18px] font-semibold text-[#3b2f28]">Recent scrobbles</Text>
          {scrobbles.length ? (
            <View className="mt-3 gap-2">
              {scrobbles.slice(0, 5).map((entry) => (
                <View key={`${entry.playedAt}-${entry.title}`} className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-[#3b2f28]">{entry.title}</Text>
                    <Text className="text-[12px] text-[#a08474]">{entry.artist}</Text>
                  </View>
                  <Text className="text-[11px] text-[#b19787]">
                    {new Date(entry.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-2 text-[12px] text-[#a08474]">No scrobbles yet.</Text>
          )}
        </Card>

        <Card className="px-4 py-4">
          <Text className="text-[18px] font-semibold text-[#3b2f28]">Most listened</Text>
          <View className="mt-3 gap-3">
            {TOP_TRACKS.map((track, index) => (
              <View key={track.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#3b2f28]">{track.title}</Text>
                    <Text className="text-[12px] text-[#a08474]">{track.artist}</Text>
                  </View>
                  <Text className="text-[12px] text-[#b19787]">{track.plays}</Text>
                </View>
                {index < TOP_TRACKS.length - 1 ? <Separator /> : null}
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
