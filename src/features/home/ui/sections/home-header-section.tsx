import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { HomeCommonHeader } from '@/components/organism/home-common-header';
import { homeAssets } from '@/constants/home-assets';

type HomeHeaderSectionProps = {
  onPressMatching: () => void;
  playerName: string;
  playerRank: number;
  playerExp: number;
  pawnCurrency: number;
  goldCurrency: number;
  stamina?: number;
  maxStamina?: number;
  nextRecoveryAt?: string | null;
};

export function HomeHeaderSection({
  onPressMatching,
  playerName,
  playerRank,
  playerExp,
  pawnCurrency,
  goldCurrency,
  stamina,
  maxStamina,
  nextRecoveryAt,
}: HomeHeaderSectionProps) {
  return (
    <View>
      <HomeCommonHeader
        userName={playerName}
        rank={playerRank}
        exp={playerExp}
        pawnCurrency={pawnCurrency}
        goldCurrency={goldCurrency}
        stamina={stamina}
        maxStamina={maxStamina}
        nextRecoveryAt={nextRecoveryAt}
      />

      <Pressable
        onPress={onPressMatching}
        className="absolute right-5 top-[88px] h-14 w-24 active:scale-95"
      >
        <Image
          source={homeAssets.pvpBadge}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      <View pointerEvents="none" className="absolute left-5 top-[88px] h-16 w-16">
        <Image
          source={homeAssets.gachaBallIcon}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}
