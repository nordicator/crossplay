import * as React from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/src/lib/supabase';
import { updateCurrentProfile } from '@/src/lib/user';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = React.useState<Mode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [favoriteGenres, setFavoriteGenres] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }

    if (isSignUp && (!cleanUsername || !cleanDisplayName)) {
      Alert.alert('Missing fields', 'Username and display name are required for signup.');
      return;
    }

    if (isSignUp && !/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      Alert.alert(
        'Invalid username',
        'Use 3-24 characters: lowercase letters, numbers, and underscores.'
      );
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName,
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          const genres = favoriteGenres
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean);
          await updateCurrentProfile({
            username: cleanUsername,
            display_name: cleanDisplayName,
            favorite_genres: genres,
          });
          router.replace('/(tabs)');
        } else {
          Alert.alert('Check your email', 'Confirm your email, then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      Alert.alert('Auth error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-safe-offset-8 pt-10 gap-5">
          <View className="gap-2">
            <Text className="text-3xl font-semibold text-[#3b2f28]">Sostenuto</Text>
            <Text className="text-[14px] text-[#9b7c6b]">
              {isSignUp ? 'Create your account.' : 'Sign in to your account.'}
            </Text>
          </View>

          <Card className="px-4 py-4 gap-3">
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              secureTextEntry
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />

            {isSignUp ? (
              <>
                <Input
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                />
                <Input
                  placeholder="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
                <Input
                  placeholder="Favorite genres (comma-separated)"
                  value={favoriteGenres}
                  onChangeText={setFavoriteGenres}
                />
              </>
            ) : null}

            <Button onPress={handleSubmit} disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>

            <Button
              variant="ghost"
              onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
              disabled={loading}>
              {isSignUp ? 'Have an account? Sign in' : 'No account? Create one'}
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
