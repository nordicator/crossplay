import { Stack } from 'expo-router';

export default function SettingsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="playback" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
