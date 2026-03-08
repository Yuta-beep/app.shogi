import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';

const boardImage = require('../../../../assets/stage-shogi/shogi-board.png');
const BOARD_SIZE = 9;
const BOARD_PIXEL_HEIGHT = 320;

function normalizeCellIndex(value: number) {
  if (Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE) {
    return value - 1;
  }
  if (Number.isInteger(value) && value >= 0 && value < BOARD_SIZE) {
    return value;
  }
  return null;
}

function sideBadgeClass(side: string) {
  const normalized = side.toLowerCase();
  if (normalized === 'enemy' || normalized === 'cpu' || normalized === 'gote') {
    return 'bg-[#7f1d1d] text-white';
  }
  return 'bg-[#14532d] text-white';
}

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const { snapshot } = useStageBattleScreen(params.stage);
  useScreenBgm('battle');

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（UIモック）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{snapshot.turnLabel}</Text>
        <Text className="text-base font-black text-ink">{`${snapshot.stageLabel}  先手: あなた / 後手: CPU`}</Text>
      </View>

      <View className="mt-3 overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690] p-2">
        <View style={{ width: '100%', height: BOARD_PIXEL_HEIGHT }}>
          <Image source={boardImage} contentFit="contain" style={{ width: '100%', height: BOARD_PIXEL_HEIGHT }} />

          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            {snapshot.placements.map((placement, index) => {
              const rowIndex = normalizeCellIndex(placement.row);
              const colIndex = normalizeCellIndex(placement.col);
              if (rowIndex === null || colIndex === null) {
                return null;
              }

              const cellPercent = 100 / (snapshot.boardSize || BOARD_SIZE);
              const topPercent = rowIndex * cellPercent;
              const leftPercent = colIndex * cellPercent;

              return (
                <View
                  key={`${placement.side}-${placement.row}-${placement.col}-${index}`}
                  style={{
                    position: 'absolute',
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                    width: `${cellPercent}%`,
                    height: `${cellPercent}%`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View className={`h-7 w-7 items-center justify-center rounded-full border border-white/60 ${sideBadgeClass(placement.side)}`}>
                    <Text className="text-sm font-black">{placement.char}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-sm font-bold text-ink">手駒</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">{snapshot.handLabel}</Text>
      </View>
    </UiScreenShell>
  );
}
