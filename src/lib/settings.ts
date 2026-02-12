import AsyncStorage from '@react-native-async-storage/async-storage';

export type SettingSection = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const STORAGE_KEY = 'settings';

export const settings: SettingSection[] = [
  {
    id: 'account',
    title: 'Account',
    subtitle: 'Username, email, linked services',
    href: '/settings/account',
  },
  {
    id: 'playback',
    title: 'Playback',
    subtitle: 'Sync preferences and defaults',
    href: '/settings/playback',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    subtitle: 'Visibility and sharing controls',
    href: '/settings/privacy',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Push, email, and alerts',
    href: '/settings/notifications',
  },
];

export type AppSettings = {
  preferredPlaybackService?: 'spotify' | 'apple' | null;
};

export const getDefaultSettings = (): AppSettings => ({
  preferredPlaybackService: null,
});

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(stored) } as AppSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return getDefaultSettings();
  }
};

export const saveSettings = async (next: AppSettings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};
