import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { stageShogiBattleAssets } from '@/constants/stage-shogi-battle-assets';
import {
  STAGE_SHOGI_BACK_BUTTON_HEIGHT,
  STAGE_SHOGI_BACK_BUTTON_LEFT,
  STAGE_SHOGI_BACK_BUTTON_TOP_BELOW_SAFE_AREA,
  STAGE_SHOGI_BACK_BUTTON_WIDTH,
} from '@/features/stage-shogi/ui/stage-shogi-layout';

type StageShogiBackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function StageShogiBackButton({ onPress, disabled = false }: StageShogiBackButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="戻る"
      onPress={onPress}
      disabled={disabled}
      testID="back-button"
      style={{
        position: 'absolute',
        top: insets.top + STAGE_SHOGI_BACK_BUTTON_TOP_BELOW_SAFE_AREA,
        left: STAGE_SHOGI_BACK_BUTTON_LEFT,
        zIndex: 50,
        width: STAGE_SHOGI_BACK_BUTTON_WIDTH,
        height: STAGE_SHOGI_BACK_BUTTON_HEIGHT,
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={stageShogiBattleAssets.backButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
