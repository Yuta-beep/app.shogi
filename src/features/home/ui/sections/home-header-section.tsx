import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { HomeCommonHeader } from '@/components/organism/home-common-header';
import { homeAssets } from '@/constants/home-assets';

type HomeHeaderSectionProps = {
  onPressBackToTitle: () => void;
  onPressOnlineBattle: () => void;
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
  onPressOnlineBattle,
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
        accessibilityRole="button"
        accessibilityLabel="タイトル画面へ戻る"
        onPress={onPressBackToTitle}
        className="absolute right-6 top-[150px] z-10 rounded-lg border border-[#8e6428] bg-[#d2a860] px-3 py-2 active:opacity-80"
      >
        <Text className="text-center text-xs font-black text-[#4b2e1f]">タイトルへ</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="オンライン対戦へ"
        onPress={onPressOnlineBattle}
        className="absolute right-[-20px] top-[220px] z-10 h-24 w-48 active:scale-95"
      >
        <Image
          source={homeAssets.onlineBattleButton}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      <Pressable
        onPress={onPressMatching}
        className="absolute right-[-20px] top-[356px] h-14 w-24 active:scale-95"
      >
        <Image
          source={homeAssets.pvpBadge}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>

      <View pointerEvents="none" className="absolute left-5 top-[150px] h-16 w-16">
        <Image
          source={homeAssets.gachaBallIcon}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ガチャ玉の色の説明を開く"
        onPress={onPressGachaBallIcon}
        className="absolute left-5 top-[218px] z-10 h-20 w-20 active:opacity-80"
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
