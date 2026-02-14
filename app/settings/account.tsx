import * as React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/src/lib/supabase';
import { getCurrentProfile, updateCurrentProfile } from '@/src/lib/user';

export default function AccountSettingsScreen() {
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [favoriteGenres, setFavoriteGenres] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getCurrentProfile()
      .then((profile) => {
        if (!profile) return;
        setUsername(profile.username);
        setDisplayName(profile.display_name);
        setFavoriteGenres(profile.favorite_genres.join(', '));
      })
      .catch(() => undefined);
  }, []);

  const saveProfile = async () => {
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();
    const genres = favoriteGenres
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean);

    if (!trimmedUsername) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    if (!trimmedDisplayName) {
      Alert.alert('Display name required', 'Please enter a display name.');
      return;
    }

    setSaving(true);
    try {
      await updateCurrentProfile({
        username: trimmedUsername,
        display_name: trimmedDisplayName,
        favorite_genres: genres,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe pb-safe px-5">
      <ScrollView contentContainerClassName="gap-4 pt-4 pb-6">
        <View className="gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4] bg-[#fff7ef]">
            <FontAwesome name="chevron-left" size={16} color="#3b2f28" />
          </Pressable>
          <View className="gap-2">
            <Text className="text-3xl font-semibold text-[#3b2f28]">Account</Text>
            <Text className="text-[14px] text-[#9b7c6b]">
              Manage your profile details.
            </Text>
          </View>
        </View>

        <Card className="w-full max-w-[420px] px-4 py-4 gap-3">
          <Text className="text-[14px] font-semibold text-[#3b2f28]">Username</Text>
          <Input autoCapitalize="none" value={username} onChangeText={setUsername} />

          <Text className="text-[14px] font-semibold text-[#3b2f28]">Display Name</Text>
          <Input value={displayName} onChangeText={setDisplayName} />

          <Text className="text-[14px] font-semibold text-[#3b2f28]">
            Favorite Genres (comma-separated)
          </Text>
          <Input value={favoriteGenres} onChangeText={setFavoriteGenres} />

          <View className="pt-2 gap-2">
            <Button onPress={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button variant="secondary" onPress={signOut}>
              Sign Out
            </Button>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
