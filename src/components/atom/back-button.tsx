import { Pressable, Text } from 'react-native';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
};

export function BackButton({ onPress, label = '戻る', disabled = false }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-md border border-accent bg-[#fff8e1] px-3 py-1 active:scale-95 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <Text className="text-sm font-bold text-ink">{`< ${label}`}</Text>
    </Pressable>
  );
}
