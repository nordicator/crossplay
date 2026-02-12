import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { settings } from '@/src/lib/settings';

const BLANK_PFP = require('@/assets/images/blank-pfp.jpg');

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>Profile</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>Manage your crossplay experience.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Image source={BLANK_PFP} style={styles.avatar} />
            <View style={styles.profileText}>
              <Text style={styles.cardTitle}>Ayaan</Text>
              <Text style={styles.cardSubtitle}>@ayaan</Text>
            </View>
          </View>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.tint }]}>
            <Text style={styles.primaryButtonText}>Edit profile</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
        </View>

        <View style={styles.list}>
          {settings.map((item) => (
            <Pressable
              key={item.id}
              style={styles.listRow}
              onPress={() => {
                router.push(item.href);
              }}>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardSubtitle: {
    color: '#6b7280',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileText: {
    gap: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
  },
  primaryButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff7ed',
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
