import { Text, View } from 'react-native';

import { homeMock } from '@/constants/home-mock';

export function HomeCurrencySection() {
  return (
    <View className="mt-16 flex-row gap-3 px-4">
      <View className="flex-1 rounded-xl border-2 border-[#8b0000] bg-[#fff7e6] p-3">
        <Text className="text-xs font-semibold text-[#6b4532]">歩 通貨</Text>
        <Text className="mt-1 text-2xl font-black text-[#2f1b14]">{homeMock.pawnCurrency}</Text>
      </View>
      <View className="flex-1 rounded-xl border-2 border-[#8b0000] bg-[#fff7e6] p-3">
        <Text className="text-xs font-semibold text-[#6b4532]">金 通貨</Text>
        <Text className="mt-1 text-2xl font-black text-[#a27700]">{homeMock.goldCurrency}</Text>
      </View>
    </View>
  );
}
