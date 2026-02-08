export type UniversalTrack = {
  title: string;
  artist: string;
  durationMs: number;
  isrc?: string | null;
  providers: {
    spotify?: { id: string; uri?: string | null; url?: string | null } | null;
    apple?: { id: string; url?: string | null } | null;
  };
};

export type Room = {
  id: string;
  room_code: string;
  host_user_id?: string | null;
  is_playing?: boolean | null;
  position_ms?: number | null;
  updated_at_ms?: number | null;
  current_track?: UniversalTrack | null;
};

export type ConnectedAccount = {
  id: string;
  username: string;
  provider: 'spotify' | 'apple';
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | number | null;
  apple_music_user_token?: string | null;
};
