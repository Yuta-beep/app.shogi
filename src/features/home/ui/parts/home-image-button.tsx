import { Image } from 'expo-image';
import { Pressable } from 'react-native';

type HomeImageButtonProps = {
  source: number;
  onPress: () => void;
};

export function HomeImageButton({ source, onPress }: HomeImageButtonProps) {
  return (
    <Pressable onPress={onPress} className="h-20 flex-1 active:scale-95">
      <Image source={source} contentFit="contain" style={{ width: '100%', height: '100%' }} />
    </Pressable>
  );
}
