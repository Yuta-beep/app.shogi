import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import { gachaRoomAssets } from '@/constants/gacha-room-assets';
import {
  GACHA_ROOM_BACK_BUTTON_HEIGHT,
  GACHA_ROOM_BACK_BUTTON_WIDTH,
} from '@/features/gacha-room/ui/gacha-room-layout';

type GachaRoomBackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function GachaRoomBackButton({ onPress, disabled = false }: GachaRoomBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="戻る"
      onPress={onPress}
      disabled={disabled}
      testID="back-button"
      style={{
        width: GACHA_ROOM_BACK_BUTTON_WIDTH,
        height: GACHA_ROOM_BACK_BUTTON_HEIGHT,
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={gachaRoomAssets.backButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
