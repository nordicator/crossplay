import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomDrawer } from '@/components/bottom-drawer';

type Friend = {
  id: string;
  name: string;
  track: string;
  service: 'spotify' | 'apple';
};

const FRIENDS: Friend[] = [
  { id: '1', name: 'Ayaan', track: 'Sunset Drive', service: 'spotify' },
  { id: '2', name: 'Mia', track: 'Golden Hour', service: 'apple' },
  { id: '3', name: 'Noah', track: 'Night City Lights', service: 'spotify' },
];

const OTHERS: Friend[] = [
  { id: '4', name: 'Lena', track: 'Lo‑Fi Focus', service: 'spotify' },
  { id: '5', name: 'Kai', track: 'Midnight Rain', service: 'apple' },
];

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'friends' | 'others'>('friends');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Friend | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const baseList = useMemo(() => {
    if (isSearchFocused) {
      return mode === 'friends' ? FRIENDS : OTHERS;
    }
    return FRIENDS;
  }, [isSearchFocused, mode]);

  const visibleList =
    query.trim().length === 0
      ? baseList
      : baseList.filter((item) =>
          item.name.toLowerCase().includes(query.trim().toLowerCase())
        );

  const showList = visibleList.length > 0 && (!isSearchFocused || query.trim().length > 0);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.root}>
      {!isSearchFocused && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: Fonts.rounded }]}>
            Social
          </Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            See what your friends are listening to right now.
          </Text>
        </View>
      )}

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
          <FontAwesome name="search" size={16} color={theme.icon} />
          <TextInput
            placeholder="Search people"
            placeholderTextColor="rgba(148, 163, 184, 0.9)"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {isSearchFocused && (
          <View style={[styles.segmentWrapper, { backgroundColor: 'rgba(148, 163, 184, 0.16)' }]}>
            <SegmentChip
              label="Friends"
              active={mode === 'friends'}
              onPress={() => setMode('friends')}
              tint={theme.tint}
            />
            <SegmentChip
              label="Others"
              active={mode === 'others'}
              onPress={() => setMode('others')}
              tint={theme.tint}
            />
          </View>
        )}

        {!isSearchFocused && (
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.tint }]}
            onPress={() => {
              // purely visual for now
            }}>
            <Text style={styles.primaryButtonText}>Create crossplay session</Text>
          </Pressable>
        )}
      </View>

      {showList && (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
          showsVerticalScrollIndicator={false}>
          {visibleList.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelected(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? '#fef3c7' : 'rgba(255,255,255,0.96)',
                },
              ]}>
              <View style={styles.cardText}>
                <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                <Text style={styles.cardTrack}>Listening to {item.track}</Text>
              </View>
              <StreamingBadge service={item.service} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <BottomDrawer isOpen={!!selected} onClose={() => setSelected(null)} initialHeight={420}>
        <Text style={styles.modalTitle}>{selected?.name}</Text>
        <Text style={styles.modalSubtitle}>
          {selected ? `Listening to ${selected.track}` : ''}
        </Text>

        <View style={styles.modalActions}>
          <OptionRow icon="headphones" label="Listen along" />
          <OptionRow icon="play-circle" label="Play song" />
          <OptionRow icon="share-alt" label="Request crossplay" />
        </View>

        <Pressable style={styles.modalCancel} onPress={() => setSelected(null)}>
          <Text style={styles.modalCancelText}>Close</Text>
        </Pressable>
      </BottomDrawer>
    </View>
    </SafeAreaView>
  );
}

type SegmentChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  tint: string;
};

function SegmentChip({ label, active, onPress, tint }: SegmentChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentChip,
        {
          backgroundColor: active ? '#ffffff' : 'transparent',
          shadowOpacity: active ? 0.12 : 0,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <Text
        style={[
          styles.segmentLabel,
          {
            color: active ? tint : '#64748b',
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StreamingBadge({ service }: { service: Friend['service'] }) {
  if (service === 'spotify') {
    return (
      <View style={[styles.badge, { backgroundColor: '#16a34a' }]}>
        <FontAwesome name="spotify" size={16} color="#ecfeff" />
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: '#fb7185' }]}>
      <FontAwesome name="apple" size={16} color="#fff7ed" />
    </View>
  );
}

function OptionRow({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome>['name']; label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]}>
      <View style={styles.optionIcon}>
        <FontAwesome name={icon} size={18} color="#0f172a" />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    gap: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
  },
  searchSection: {
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 2,
    fontSize: 15,
  },
  segmentWrapper: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fefce8',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 1,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardTrack: {
    fontSize: 13,
    color: '#6b7280',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalActions: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  modalCancel: {
    marginTop: 6,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#4b5563',
  },
});
