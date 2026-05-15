import { Image } from 'expo-image';
import { useWindowDimensions, View } from 'react-native';

import { stageShogiBattleAssets } from '@/constants/stage-shogi-battle-assets';
import type { Side } from '@/features/stage-shogi/domain/game-rules';

type Props = {
  /** ローカルプレイヤー視点の勝敗（`player`＝あなたの勝ち → 勝利画像） */
  winner: Side;
};

export function BattleEndResultOverlay({ winner }: Props) {
  const { width, height } = useWindowDimensions();
  const source =
    winner === 'player' ? stageShogiBattleAssets.victory : stageShogiBattleAssets.defeat;
  const imgW = Math.min(width * 0.92, 560);
  const imgH = Math.min(height * 0.58, 520);

  return (
    <View
      className="absolute inset-0 z-[600] items-center justify-center bg-black/50"
      pointerEvents="box-none"
    >
      <Image
        source={source}
        contentFit="contain"
        style={{ width: imgW, height: imgH }}
        accessibilityLabel={winner === 'player' ? '勝利' : '敗北'}
      />
    </View>
  );
}
