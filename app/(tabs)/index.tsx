import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const STATS = [
  { id: 'minutes', label: 'Minutes listened', value: '1,284' },
  { id: 'genre', label: 'Top genre', value: 'Bedroom pop' },
  { id: 'rooms', label: 'Rooms hosted', value: '5' },
];

const TOP_TRACKS = [
  { id: 't1', title: 'Soft Halo', artist: 'Nova Bloom', plays: '31 plays' },
  { id: 't2', title: 'Coastline Eyes', artist: 'Solace', plays: '24 plays' },
  { id: 't3', title: 'Amber Street', artist: 'Mira Vox', plays: '19 plays' },
  { id: 't4', title: 'Daydream Drive', artist: 'Sable Day', plays: '14 plays' },
];

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <ScrollView
        contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-[#3b2f28]">Crossplay</Text>
          <Text className="text-[14px] text-[#9b7c6b]">
            Your listening snapshot, ready to sync.
          </Text>
        </View>

        <View className="flex-row gap-3">
          {STATS.map((stat) => (
            <Card key={stat.id} className="flex-1 px-3 py-3">
              <Text className="text-[16px] font-semibold text-[#3b2f28]">{stat.value}</Text>
              <Text className="text-[12px] text-[#a08474]">{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Card className="px-4 py-4">
          <Text className="text-[18px] font-semibold text-[#3b2f28]">Most listened</Text>
          <View className="mt-3 gap-3">
            {TOP_TRACKS.map((track, index) => (
              <View key={track.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#3b2f28]">{track.title}</Text>
                    <Text className="text-[12px] text-[#a08474]">{track.artist}</Text>
                  </View>
                  <Text className="text-[12px] text-[#b19787]">{track.plays}</Text>
                </View>
                {index < TOP_TRACKS.length - 1 ? <Separator /> : null}
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
