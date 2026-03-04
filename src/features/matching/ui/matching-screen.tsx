import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

export function MatchingScreen() {
  const router = useRouter();

  return (
    <UiScreenShell title="マッチング中" subtitle="三十世紀将棋">
      <View className="mx-auto w-full max-w-[260px] rounded-xl bg-white/90 p-4 shadow-lg">
        <Text className="text-center text-base font-black text-[#1f2937]">オンライン対戦</Text>
        <Text className="mt-2 text-center text-sm text-[#4b5563]">対戦相手を探しています</Text>

        <View className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
          <View className="h-full rounded-full bg-blue-500" style={{ width: '62%' }} />
        </View>

        <Pressable
          onPress={() => router.replace('/home')}
          className="mt-4 self-center rounded-lg bg-red-500 px-4 py-2 active:scale-95"
        >
          <Text className="text-sm font-black text-white">キャンセル</Text>
        </Pressable>
      </View>
    </UiScreenShell>
  );
}
