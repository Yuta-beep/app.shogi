import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import { deckBuilderAssets } from '@/constants/deck-builder-assets';
import {
  DECK_BUILDER_BACK_BUTTON_HEIGHT,
  DECK_BUILDER_BACK_BUTTON_MARGIN_LEFT,
  DECK_BUILDER_BACK_BUTTON_MARGIN_RIGHT,
  DECK_BUILDER_BACK_BUTTON_WIDTH,
} from '@/features/deck-builder/ui/deck-builder-layout';

type DeckBuilderBackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function DeckBuilderBackButton({ onPress, disabled = false }: DeckBuilderBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="戻る"
      onPress={onPress}
      disabled={disabled}
      testID="back-button"
      style={{
        width: DECK_BUILDER_BACK_BUTTON_WIDTH,
        height: DECK_BUILDER_BACK_BUTTON_HEIGHT,
        marginRight: DECK_BUILDER_BACK_BUTTON_MARGIN_RIGHT,
        marginLeft: DECK_BUILDER_BACK_BUTTON_MARGIN_LEFT,
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={deckBuilderAssets.backButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
