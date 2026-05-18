import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import { pieceShopAssets } from '@/constants/piece-shop-assets';
import {
  PIECE_SHOP_BACK_BUTTON_HEIGHT,
  PIECE_SHOP_BACK_BUTTON_WIDTH,
} from '@/features/piece-shop/ui/piece-shop-layout';

type PieceShopBackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function PieceShopBackButton({ onPress, disabled = false }: PieceShopBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="戻る"
      onPress={onPress}
      disabled={disabled}
      testID="back-button"
      style={{
        width: PIECE_SHOP_BACK_BUTTON_WIDTH,
        height: PIECE_SHOP_BACK_BUTTON_HEIGHT,
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={pieceShopAssets.backButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
