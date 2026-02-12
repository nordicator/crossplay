import * as React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { settings } from '@/src/lib/settings';

const PROFILE_PLACEHOLDER = require('@/assets/images/blank-pfp.jpg');

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-[#f9f1e8] pt-safe">
      <ScrollView
        contentContainerClassName="px-5 pb-safe-offset-8 pt-4 gap-5"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-[#3b2f28]">Profile</Text>
          <Text className="text-[14px] text-[#9b7c6b]">Manage your crossplay presence.</Text>
        </View>

        <Card className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            <Image source={PROFILE_PLACEHOLDER} className="h-14 w-14 rounded-full" />
            <View>
              <Text className="text-[20px] font-semibold text-[#3b2f28]">Ayaan</Text>
              <Text className="text-[13px] text-[#a08474]">@ayaan</Text>
            </View>
          </View>
          <View className="pt-4">
            <Button className="rounded-2xl">Edit profile</Button>
          </View>
        </Card>

        <View className="gap-2">
          <Text className="text-[16px] font-semibold text-[#3b2f28]">Settings</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}
