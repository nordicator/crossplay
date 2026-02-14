import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';

import { appleMusicRemote } from '@/src/lib/apple-music-remote';
import { upsertProviderConnection } from '@/src/lib/streaming';
import { getCurrentUserId } from '@/src/lib/user';

export default function AppleAuthScreen() {
  const [status, setStatus] = React.useState('Requesting Apple Music access...');

  React.useEffect(() => {
    const describeError = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object') {
        const maybe = error as { message?: unknown; localizedDescription?: unknown };
        if (typeof maybe.message === 'string') return maybe.message;
        if (typeof maybe.localizedDescription === 'string') return maybe.localizedDescription;
        try {
          return JSON.stringify(error);
        } catch {
          return 'Unknown object error';
        }
      }
      return String(error);
    };

    const run = async () => {
      if (!appleMusicRemote.isAvailable) {
        setStatus('Apple Music controls are not available on this device.');
        return;
      }

      const authStatus = await appleMusicRemote.requestAuthorization();
      if (authStatus !== 3) {
        setStatus('Apple Music access was not granted.');
        return;
      }

      const caps = await appleMusicRemote.requestCapabilities();
      if (!caps?.musicCatalogPlayback) {
        setStatus('Apple Music playback is not available for this account.');
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        setStatus('You must be signed in to connect Apple Music.');
        return;
      }

      await upsertProviderConnection({
        userId,
        providerKey: 'apple_music',
        status: 'connected',
      }).catch((error) => {
        throw new Error(`Database save step failed: ${describeError(error)}`);
      });

      router.replace('/');
    };

    run().catch((error) => {
      const message = describeError(error);
      setStatus(`Apple Music authorization failed: ${message}`);
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#f9f1e8] px-6">
      <ActivityIndicator />
      <Text className="mt-3 text-center text-[14px] text-[#7a5b4c]">{status}</Text>
    </View>
  );
}
