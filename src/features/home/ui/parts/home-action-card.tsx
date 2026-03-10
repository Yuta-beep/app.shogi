import { Pressable, Text } from 'react-native';

type HomeActionCardProps = {
  label: string;
  emoji: string;
  onPress: () => void;
};

export function HomeActionCard({ label, emoji, onPress }: HomeActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="h-24 flex-1 items-center justify-center rounded-lg border-2 border-[#8b0000] bg-[#fff7e6] active:scale-95"
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text className="mt-2 text-center text-[13px] font-bold text-ink">{label}</Text>
    </Pressable>
  );
}
