import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { HomeCommonHeader } from '@/components/organism/home-common-header';
import { homeAssets } from '@/constants/home-assets';
import {
  HOME_GACHA_ICON_SIZE,
  HOME_PVP_BADGE_HEIGHT,
  HOME_PVP_BADGE_WIDTH,
  HOME_SIDE_ACTION_TOP,
  HOME_TITLE_BACK_BUTTON_TOP,
} from '@/features/home/ui/home-layout';

type HomeHeaderSectionProps = {
  onPressBackToTitle: () => void;
  onPressMatching: () => void;
  onPressGachaBallIcon: () => void;
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
  onPressBackToTitle,
  onPressMatching,
  onPressGachaBallIcon,
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
    <View pointerEvents="box-none">
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
        accessibilityRole="button"
        accessibilityLabel="タイトル画面へ戻る"
        onPress={onPressBackToTitle}
        style={{ top: HOME_TITLE_BACK_BUTTON_TOP }}
        className="absolute right-4 z-10 rounded-lg border border-[#8e6428] bg-[#d2a860] px-3 py-2 active:opacity-80"
      >
        <Text className="text-center text-xs font-black text-[#4b2e1f]">タイトルへ</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="PVP対戦へ"
        onPress={onPressMatching}
        pointerEvents="auto"
        style={{
          top: HOME_SIDE_ACTION_TOP,
          width: HOME_PVP_BADGE_WIDTH,
          height: HOME_PVP_BADGE_HEIGHT,
        }}
        className="absolute right-[-20px] z-10 active:scale-95"
      >
        <Image
          source={homeAssets.pvpBadge}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ガチャ玉の色の説明を開く"
        onPress={onPressGachaBallIcon}
        style={{
          top: HOME_SIDE_ACTION_TOP,
          left: 20,
          width: HOME_GACHA_ICON_SIZE,
          height: HOME_GACHA_ICON_SIZE,
        }}
        className="absolute z-10 active:opacity-80"
      >
        <Image
          source={homeAssets.gachaBallIcon}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>
    </View>
  );
}
