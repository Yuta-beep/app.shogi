import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';

type HomeHeaderSectionProps = {
  onPressMatching: () => void;
  playerName: string;
  rating: number;
};

export function HomeHeaderSection({ onPressMatching, playerName, rating }: HomeHeaderSectionProps) {
  return (
    <View className="px-4 pt-3">
      <View className="h-24 w-full overflow-hidden rounded-xl">
        <Image
          source={homeAssets.userBar}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-2xl font-black text-[#2f1b14]">{playerName}</Text>
        </View>
        <Text className="absolute bottom-2 right-3 text-sm font-black text-white">{`◆レート ${rating}`}</Text>
      </View>

      <Pressable
        onPress={onPressMatching}
        className="absolute right-5 top-28 h-14 w-24 active:scale-95"
      >
        <Image
          source={homeAssets.pvpBadge}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>
    </View>
  );
}
