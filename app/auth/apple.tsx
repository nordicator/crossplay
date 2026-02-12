import { router } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fetchAppleDeveloperToken } from '@/src/lib/providers/apple';
import { supabase } from '@/src/lib/supabase';
import { getStoredUsername } from '@/src/lib/user';

export default function AppleAuthScreen() {
  const [developerToken, setDeveloperToken] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('Loading Apple Music...');

  React.useEffect(() => {
    fetchAppleDeveloperToken()
      .then(setDeveloperToken)
      .catch(() => setStatus('Failed to fetch Apple developer token.'));
  }, []);

  const html = React.useMemo(() => {
    if (!developerToken) return null;

    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>
  </head>
  <body>
    <script>
      document.addEventListener('musickitloaded', async () => {
        try {
          const music = MusicKit.configure({
            developerToken: '${developerToken}',
            app: { name: 'Crossplay', build: '1.0.0' },
          });
          const token = await music.authorize();
          window.ReactNativeWebView.postMessage(token);
        } catch (err) {
          window.ReactNativeWebView.postMessage('ERROR:' + (err && err.message ? err.message : 'auth_failed'));
        }
      });
    </script>
    <div style="font-family: -apple-system, sans-serif; padding: 16px;">Authorizing Apple Music...</div>
  </body>
</html>`;
  }, [developerToken]);

  const handleMessage = async (event: any) => {
    const data = event.nativeEvent.data as string;
    if (data.startsWith('ERROR:')) {
      setStatus('Apple Music authorization failed.');
      return;
    }

    const username = await getStoredUsername();
    if (!username) {
      setStatus('Missing username for Apple Music connection.');
      return;
    }

    const { error } = await supabase.from('connected_accounts').upsert({
      username,
      provider: 'apple',
      apple_music_user_token: data,
    });

    if (error) {
      setStatus('Failed to save Apple Music token.');
      return;
    }

    router.replace('/');
  };

  if (!html) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f9f1e8] px-6">
        <ActivityIndicator />
        <Text className="mt-3 text-center text-[14px] text-[#7a5b4c]">{status}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f9f1e8]">
      <WebView originWhitelist={['*']} javaScriptEnabled source={{ html }} onMessage={handleMessage} />
    </View>
  );
}
