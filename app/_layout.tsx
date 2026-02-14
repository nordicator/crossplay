import '../global.css';

import * as React from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';
import 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    const isLoginRoute =
      segments[0] === 'auth' && (segments.length === 1 || segments[1] === 'index');

    if (!session && !isLoginRoute) {
      router.replace('/auth');
      return;
    }

    if (session && isLoginRoute) {
      router.replace('/(tabs)');
    }
  }, [ready, session, segments, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f9f1e8]">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/index" />
            <Stack.Screen name="auth/spotify" />
            <Stack.Screen name="auth/apple" />
            <Stack.Screen name="room/[code]" options={{ title: 'Room' }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
