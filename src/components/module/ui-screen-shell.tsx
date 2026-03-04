import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UiScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function UiScreenShell({ title, subtitle, children }: UiScreenShellProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="border-b-2 border-accent/50 bg-[#f2e4c2] px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="rounded-md border border-accent px-3 py-1 active:scale-95">
            <Text className="text-sm font-bold text-ink">戻る</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/home')} className="rounded-md border border-accent px-3 py-1 active:scale-95">
            <Text className="text-sm font-bold text-ink">ホーム</Text>
          </Pressable>
        </View>
        <Text className="mt-3 text-2xl font-black text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-[#6b4532]">{subtitle}</Text> : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
