import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Card } from '@/components/ui/card';

export default function NotificationsSettingsScreen() {
  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe pb-safe px-5">
      <View className="gap-4 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-[#efe1d4] bg-[#fff7ef]">
          <FontAwesome name="chevron-left" size={16} color="#3b2f28" />
        </Pressable>
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-[#3b2f28]">Notifications</Text>
          <Text className="text-[14px] text-[#9b7c6b]">
            Choose which alerts you want to receive.
          </Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <Card className="w-full max-w-[420px] px-6 py-8">
          <Text className="text-center text-[14px] text-[#9b7c6b]">
            Notification settings content goes here.
          </Text>
        </Card>
      </View>
    </View>
  );
}
