import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const matchingBg = require('../../../../assets/matching/matching-bg.png');

export function MatchingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="absolute inset-0">
        <Image source={matchingBg} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        <View className="absolute inset-0 bg-black/40" />
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <View className="w-full max-w-[240px] rounded-xl bg-white/90 p-4 shadow-lg">
          <Text className="text-center text-base font-black text-[#1f2937]">マッチング中</Text>
          <Text className="mt-2 text-center text-sm text-[#4b5563]">対戦相手を探しています</Text>

          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <View className="h-full rounded-full bg-blue-500" style={{ width: '62%' }} />
          </View>

          <Pressable onPress={() => router.replace('/home')} className="mt-4 self-center rounded-lg bg-red-500 px-4 py-2 active:scale-95">
            <Text className="text-sm font-black text-white">キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
