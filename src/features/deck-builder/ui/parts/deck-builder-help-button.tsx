import { Image } from 'expo-image';
import { Pressable } from 'react-native';

import { deckBuilderAssets } from '@/constants/deck-builder-assets';
import {
  DECK_BUILDER_HELP_BUTTON_HEIGHT,
  DECK_BUILDER_HELP_BUTTON_TRANSLATE_X,
  DECK_BUILDER_HELP_BUTTON_TRANSLATE_Y,
  DECK_BUILDER_HELP_BUTTON_WIDTH,
} from '@/features/deck-builder/ui/deck-builder-layout';

type DeckBuilderHelpButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function DeckBuilderHelpButton({ onPress, disabled = false }: DeckBuilderHelpButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="デッキビルダーのヘルプ"
      onPress={onPress}
      disabled={disabled}
      testID="deck-builder-help-button"
      style={{
        width: DECK_BUILDER_HELP_BUTTON_WIDTH,
        height: DECK_BUILDER_HELP_BUTTON_HEIGHT,
        transform: [
          { translateX: DECK_BUILDER_HELP_BUTTON_TRANSLATE_X },
          { translateY: DECK_BUILDER_HELP_BUTTON_TRANSLATE_Y },
        ],
        opacity: disabled ? 0.5 : 1,
      }}
      className="active:scale-95"
    >
      <Image
        source={deckBuilderAssets.helpButton}
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
