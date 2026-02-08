import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fetchAppleDeveloperToken } from '@/src/lib/providers/apple';
import { supabase } from '@/src/lib/supabase';
import { getStoredUsername } from '@/src/lib/user';

export default function AppleAuthScreen() {
  const [developerToken, setDeveloperToken] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading Apple Music...');

  useEffect(() => {
    fetchAppleDeveloperToken()
      .then(setDeveloperToken)
      .catch(() => {
        setStatus('Failed to fetch Apple developer token.');
      });
  }, []);

  const html = useMemo(() => {
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
    <div style="font-family: -apple-system, sans-serif; padding: 16px;">
      Authorizing Apple Music...
    </div>
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
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.text}>{status}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        javaScriptEnabled
        source={{ html }}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    textAlign: 'center',
  },
});
