import { NativeModules, Platform } from 'react-native';

const { AppleMusicRemote } = NativeModules;

export type AppleNowPlaying = {
  title: string | null;
  artist: string | null;
  albumTitle: string | null;
  durationMs: number;
  playbackState: number;
};

export const appleMusicRemote = {
  isAvailable: Platform.OS === 'ios' && Boolean(AppleMusicRemote),
  async requestAuthorization(): Promise<number> {
    if (!AppleMusicRemote) return -1;
    return AppleMusicRemote.requestAuthorization();
  },
  async requestCapabilities(): Promise<{ musicCatalogPlayback: boolean; addToCloudMusicLibrary: boolean } | null> {
    if (!AppleMusicRemote) return null;
    return AppleMusicRemote.requestCapabilities();
  },
  async setQueue(storeIDs: string[], play = true): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.setQueue(storeIDs, play);
  },
  async play(): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.play();
  },
  async pause(): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.pause();
  },
  async skipToNext(): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.skipToNext();
  },
  async skipToPrevious(): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.skipToPrevious();
  },
  async seekTo(milliseconds: number): Promise<boolean> {
    if (!AppleMusicRemote) return false;
    return AppleMusicRemote.seekTo(milliseconds);
  },
  async getNowPlaying(): Promise<AppleNowPlaying | null> {
    if (!AppleMusicRemote) return null;
    return AppleMusicRemote.getNowPlaying();
  },
};
