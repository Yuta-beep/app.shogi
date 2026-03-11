import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';
import { CommonHeader } from '@/features/home/ui/parts/common-header';

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
    <View className="-mt-2">
      <CommonHeader title={playerName} rank={playerRank} exp={playerExp} />

      <Pressable
        onPress={onPressMatching}
        className="absolute right-5 top-[82px] h-14 w-24 active:scale-95"
      >
        <Image
          source={homeAssets.pvpBadge}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      <View pointerEvents="none" className="absolute left-5 top-[82px] h-16 w-16">
        <Image
          source={homeAssets.gachaBallIcon}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}
