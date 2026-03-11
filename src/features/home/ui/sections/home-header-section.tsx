import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';

type HomeHeaderSectionProps = {
  onPressMatching: () => void;
  playerName: string;
  playerRank: number;
  playerExp: number;
};

export function HomeHeaderSection({
  onPressMatching,
  playerName,
  playerRank,
  playerExp,
}: HomeHeaderSectionProps) {
  return (
    <View className="px-4 pt-0 -mt-4">
      <View className="h-24 w-full overflow-hidden rounded-xl">
        <Image
          source={homeAssets.userBar}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
        <View className="absolute inset-0 -mt-3 items-center justify-center">
          <Text
            className="text-[28px] text-[#2f1b14]"
            style={{
              fontFamily: 'ShipporiMincho_700Bold',
              textShadowColor: 'rgba(47, 27, 20, 0.22)',
              textShadowOffset: { width: 0.6, height: 0.6 },
              textShadowRadius: 0.4,
            }}
          >
            {playerName}
          </Text>
        </View>
        <Text className="absolute bottom-2 right-3 text-sm font-black text-white">{`◆ランク ${playerRank} / EXP ${playerExp}`}</Text>
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

      <View pointerEvents="none" className="absolute left-5 top-28 h-16 w-16">
        <Image
          source={homeAssets.gachaBallIcon}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}
