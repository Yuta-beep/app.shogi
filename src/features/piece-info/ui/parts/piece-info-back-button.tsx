import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import { pieceInfoAssets } from '@/constants/piece-info-assets';
import {
  PIECE_INFO_BACK_BUTTON_HEIGHT,
  PIECE_INFO_BACK_BUTTON_RIGHT,
  PIECE_INFO_BACK_BUTTON_TOP,
  PIECE_INFO_BACK_BUTTON_WIDTH,
} from '@/features/piece-info/ui/piece-info-layout';

type PieceInfoBackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function PieceInfoBackButton({ onPress, disabled = false }: PieceInfoBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="戻る"
      onPress={onPress}
      disabled={disabled}
      testID="back-button"
      style={{
        position: 'absolute',
        top: PIECE_INFO_BACK_BUTTON_TOP,
        right: PIECE_INFO_BACK_BUTTON_RIGHT,
        zIndex: 10,
        width: PIECE_INFO_BACK_BUTTON_WIDTH,
        height: PIECE_INFO_BACK_BUTTON_HEIGHT,
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={pieceInfoAssets.backButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
