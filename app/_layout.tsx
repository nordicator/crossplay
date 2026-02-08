import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AppleMusicAuthProvider } from '@superfan-app/apple-music-auth';

const APPLE_MUSIC_DEVELOPER_TOKEN =
  process.env.EXPO_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN ?? '';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasConnectedService, setHasConnectedService] = useState(false);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!APPLE_MUSIC_DEVELOPER_TOKEN) {
      console.warn(
        'Missing EXPO_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN. Apple Music auth will fail until it is set.'
      );
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkConnectedServices(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkConnectedServices(session.user.id);
      } else {
        setHasConnectedService(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkConnectedServices = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;
      setHasConnectedService(data && data.length > 0);
    } catch (error) {
      console.error('Error checking connected services:', error);
      setHasConnectedService(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inConnectGroup = segments[0] === '(connect)';

    if (!session && !inConnectGroup) {
      // Redirect to connect services if not authenticated
      router.replace('/(connect)/connect-service');
    } else if (session && !hasConnectedService && !inConnectGroup) {
      // Redirect to connect services if authenticated but no service connected
      router.replace('/(connect)/connect-service');
    } else if (session && hasConnectedService && (inAuthGroup || inConnectGroup)) {
      // Redirect to home if authenticated and has service
      router.replace('/(tabs)');
    }
  }, [session, hasConnectedService, segments, loading]);

  return (
    <AppleMusicAuthProvider developerToken={APPLE_MUSIC_DEVELOPER_TOKEN}>
      <Slot />
    </AppleMusicAuthProvider>
  );
}
