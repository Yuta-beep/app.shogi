import { Pressable } from 'react-native';

type TapToStartScreenProps = {
  onPressStart: () => void;
};

export function TapToStartScreen({ onPressStart }: TapToStartScreenProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="ホームへ進む"
      className="flex-1"
      onPress={onPressStart}
    />
  );
}
