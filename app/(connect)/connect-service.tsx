import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppleMusicAuth } from '@superfan-app/apple-music-auth';

// Important: For Spotify OAuth, you need to set these values
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; // TODO: Add your Spotify Client ID
const SPOTIFY_REDIRECT_URI = Linking.createURL('spotify-callback'); // Will be like exp://... or crossplay://spotify-callback
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

WebBrowser.maybeCompleteAuthSession();

export default function ConnectServiceScreen() {
  const [loading, setLoading] = useState<'spotify' | 'apple' | null>(null);
  const router = useRouter();
  const { requestAuthorization, getUserToken } = useAppleMusicAuth();

  const handleSpotifyConnect = async () => {
    setLoading('spotify');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveUserId = user?.id ?? GUEST_USER_ID;

      // Spotify OAuth scopes
      const scopes = [
        'user-read-email',
        'user-read-private',
        'user-library-read',
        'user-top-read',
        'playlist-read-private',
        'playlist-read-collaborative',
        'streaming',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
      ].join(' ');

      const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${SPOTIFY_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${effectiveUserId}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        SPOTIFY_REDIRECT_URI
      );

      if (result.type === 'success') {
        const { url } = result;
        const code = new URL(url).searchParams.get('code');
        
        if (code) {
          // Send code to your backend to exchange for tokens
          // You'll need to create a Supabase Edge Function or API endpoint for this
          // For now, we'll show a placeholder
          Alert.alert(
            'Success',
            'Spotify authorization code received. Implement token exchange on backend.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  // After backend exchange, save to connected_accounts table
                  // Then router.replace('/(tabs)') will be called by _layout.tsx
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAppleMusicConnect = async () => {
    setLoading('apple');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveUserId = user?.id ?? GUEST_USER_ID;

      if (Platform.OS === 'ios') {
        const authStatus = await requestAuthorization();
        if (authStatus !== 'authorized') {
          throw new Error('Apple Music authorization was not granted');
        }

        const userToken = await getUserToken();
        if (!userToken) {
          throw new Error('Failed to get Apple Music user token');
        }

        if (user) {
          const { error: insertError } = await supabase
            .from('connected_accounts')
            .insert({
              user_id: effectiveUserId,
              provider: 'apple',
              apple_music_user_token: userToken,
            });

          if (insertError) throw insertError;
        } else {
          await AsyncStorage.setItem('guest_apple_music_user_token', userToken);
        }

        Alert.alert('Apple Music', 'Connected!');
      } else {
        Alert.alert('Not Available', 'Apple Music is only available on iOS');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip for now?',
      'You can connect a music service later from settings',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Music</Text>
          <Text style={styles.subtitle}>
            Choose your preferred music streaming service
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.serviceButton,
              styles.spotifyButton,
              loading === 'spotify' && styles.buttonDisabled,
            ]}
            onPress={handleSpotifyConnect}
            disabled={loading !== null}
          >
            {loading === 'spotify' ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <View style={styles.spotifyIcon}>
                  <Text style={styles.iconText}>♫</Text>
                </View>
                <Text style={styles.serviceButtonText}>Connect Spotify</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.serviceButton,
              styles.appleButton,
              loading === 'apple' && styles.buttonDisabled,
            ]}
            onPress={handleAppleMusicConnect}
            disabled={loading !== null}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <View style={styles.appleIcon}>
                  <Text style={styles.iconText}></Text>
                </View>
                <Text style={styles.serviceButtonText}>Connect Apple Music</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
  },
  appleButton: {
    backgroundColor: '#FA2D48',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  spotifyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: 'bold',
  },
  serviceButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 24,
  },
  skipText: {
    color: Colors.light,
    fontSize: 16,
  },
});
