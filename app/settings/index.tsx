import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { settings } from '@/src/lib/settings';

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <ScrollView
        contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5"
        showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4] bg-[#fff7ef]">
            <FontAwesome name="chevron-left" size={16} color="#3b2f28" />
          </Pressable>
          <View className="gap-2">
            <Text className="text-3xl font-semibold text-[#3b2f28]">Settings</Text>
            <Text className="text-[14px] text-[#9b7c6b]">
              Tweak playback, privacy, and notifications.
            </Text>
          </View>
        </View>

        <Card className="px-0 py-0">
          {settings.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.href)}
              className="flex-row items-center px-4 py-4">
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#3b2f28]">{item.title}</Text>
                <Text className="text-[12px] text-[#a08474]">{item.subtitle}</Text>
              </View>
              <Text className="text-[18px] text-[#c3aa9a]">›</Text>
              {index < settings.length - 1 ? (
                <Separator className="absolute bottom-0 left-4 right-4" />
              ) : null}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
