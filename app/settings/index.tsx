import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { settings } from '@/src/lib/settings';

export default function SettingsIndex() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Customize your Crossplay experience.</Text>
        </View>

        <View style={styles.list}>
          {settings.map((item) => (
            <Pressable key={item.id} style={styles.listRow} onPress={() => router.push(item.href)}>
              <View style={styles.listText}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 18,
  },
  header: {
    gap: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listText: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 22,
    color: '#9ca3af',
  },
});
