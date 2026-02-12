import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MOCK_TOP_TRACKS = [
  { id: 't1', title: 'Crimson Skies', artist: 'Nova Bloom', plays: '28 plays' },
  { id: 't2', title: 'Late Train Home', artist: 'Solace', plays: '22 plays' },
  { id: 't3', title: 'Gilded Coast', artist: 'Mira Vox', plays: '18 plays' },
];
const MOCK_STATS = [
  { id: 's1', label: 'Minutes listened', value: '1,420' },
  { id: 's2', label: 'Top genre', value: 'Indie pop' },
  { id: 's3', label: 'Rooms hosted', value: '6' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const subtitle = useMemo(() => 'Your listening snapshot, ready to sync.', []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>Crossplay</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>{subtitle}</Text>
        </View>

        <View style={styles.statsRow}>
          {MOCK_STATS.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Most listened</Text>
          {MOCK_TOP_TRACKS.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackText}>
                <Text style={styles.trackTitle}>{track.title}</Text>
                <Text style={styles.trackArtist}>{track.artist}</Text>
              </View>
              <Text style={styles.trackPlays}>{track.plays}</Text>
            </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionCard: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  trackText: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  trackArtist: {
    fontSize: 12,
    color: '#6b7280',
  },
  trackPlays: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
