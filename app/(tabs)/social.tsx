import * as React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { BottomDrawer } from '@/components/bottom-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const FRIENDS = [
  { id: 'f1', name: 'Ayaan', track: 'Sunlit Park', artist: 'Nova Bloom', service: 'spotify' as const },
  { id: 'f2', name: 'Mia', track: 'Quiet Tide', artist: 'Mira Vox', service: 'apple' as const },
  { id: 'f3', name: 'Noah', track: 'Night Window', artist: 'Solace', service: 'spotify' as const },
  { id: 'f4', name: 'Lena', track: 'Soft Echo', artist: 'Sable Day', service: 'apple' as const },
];

const OTHERS = [
  { id: 'o1', name: 'Kai', track: 'Morning Glow', artist: 'Cinder & Co.', service: 'spotify' as const },
  { id: 'o2', name: 'Zara', track: 'Velvet Drift', artist: 'Lowtide', service: 'apple' as const },
];

type Friend = (typeof FRIENDS)[number];

const PROFILE_PLACEHOLDER = require('@/assets/images/blank-pfp.jpg');

export default function SocialScreen() {
  const [query, setQuery] = React.useState('');
  const [activeList, setActiveList] = React.useState<'friends' | 'others'>('friends');
  const [focused, setFocused] = React.useState(false);
  const [selected, setSelected] = React.useState<Friend | null>(null);

  const baseList = focused ? (activeList === 'friends' ? FRIENDS : OTHERS) : FRIENDS;
  const normalized = query.trim().toLowerCase();
  const visible = normalized.length
    ? baseList.filter((friend) => friend.name.toLowerCase().includes(normalized))
    : baseList;

  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <View className="px-5 pt-4">
        {!focused && (
          <View className="gap-2 pb-4">
            <Text className="text-3xl font-semibold text-[#3b2f28]">Social</Text>
            <Text className="text-[14px] text-[#9b7c6b]">
              See what your friends are listening to right now.
            </Text>
          </View>
        )}

        <View className="gap-3">
          <View className="flex-row items-center gap-3 rounded-full border border-[#eaded2] bg-[#fffaf4] px-4 py-2">
            <FontAwesome name="search" size={16} color="#9b7c6b" />
            <Input
              placeholder="Search people"
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="h-8 border-0 bg-transparent px-0"
            />
          </View>

          {focused ? (
            <View className="flex-row rounded-full bg-[#efe1d4] p-1">
              <Pressable
                onPress={() => setActiveList('friends')}
                className={`flex-1 items-center rounded-full py-2 ${
                  activeList === 'friends' ? 'bg-[#fffaf4]' : 'bg-transparent'
                }`}>
                <Text
                  className={`text-[12px] font-semibold ${
                    activeList === 'friends' ? 'text-[#f27663]' : 'text-[#9b7c6b]'
                  }`}>
                  Friends
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveList('others')}
                className={`flex-1 items-center rounded-full py-2 ${
                  activeList === 'others' ? 'bg-[#fffaf4]' : 'bg-transparent'
                }`}>
                <Text
                  className={`text-[12px] font-semibold ${
                    activeList === 'others' ? 'text-[#f27663]' : 'text-[#9b7c6b]'
                  }`}>
                  Others
                </Text>
              </Pressable>
            </View>
          ) : (
            <Button className="rounded-2xl" onPress={() => undefined}>
              Create crossplay session
            </Button>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-safe-offset-6 pt-4 gap-3"
        showsVerticalScrollIndicator={false}>
        {visible.map((friend) => (
          <Pressable
            key={friend.id}
            onPress={() => setSelected(friend)}
            className="flex-row items-center gap-4 rounded-3xl border border-[#efe1d4] bg-[#fff7ef] px-4 py-3 shadow-sm">
            <Image source={PROFILE_PLACEHOLDER} className="h-11 w-11 rounded-full" />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-[#3b2f28]">{friend.name}</Text>
              <Text className="text-[12px] text-[#a08474]">
                {friend.track} · {friend.artist}
              </Text>
            </View>
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${
                friend.service === 'spotify' ? 'bg-[#22c55e]' : 'bg-[#f472b6]'
              }`}>
              <FontAwesome
                name={friend.service === 'spotify' ? 'spotify' : 'apple'}
                size={16}
                color="#fff6ee"
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <BottomDrawer isOpen={!!selected} onClose={() => setSelected(null)} height={420}>
        <View className="gap-1 pb-4">
          <Text className="text-center text-[18px] font-semibold text-[#3b2f28]">
            {selected?.name}
          </Text>
          <Text className="text-center text-[13px] text-[#a08474]">
            {selected ? `${selected.track} · ${selected.artist}` : ''}
          </Text>
        </View>

        <View className="rounded-3xl bg-[#fffaf4] px-3 py-2">
          <ActionRow icon="headphones" label="Listen along" />
          <Separator className="my-1" />
          <ActionRow icon="play-circle" label="Play song" />
          <Separator className="my-1" />
          <ActionRow icon="share-alt" label="Request crossplay" />
          <Separator className="my-1" />
          <ActionRow icon="user" label="View profile" />
        </View>

        <View className="items-center pt-4">
          <Button variant="ghost" onPress={() => setSelected(null)}>
            Close
          </Button>
        </View>
      </BottomDrawer>
    </View>
  );
}

function ActionRow({ icon, label }: { icon: React.ComponentProps<typeof FontAwesome>['name']; label: string }) {
  return (
    <Pressable className="flex-row items-center gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#efe1d4]">
        <FontAwesome name={icon} size={16} color="#3b2f28" />
      </View>
      <Text className="text-[15px] font-medium text-[#3b2f28]">{label}</Text>
    </Pressable>
  );
}
