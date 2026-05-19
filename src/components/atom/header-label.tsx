import { Pressable, Text } from 'react-native';

type HeaderLabelProps = {
  text: string;
  onPress?: () => void;
};

export function HeaderLabel({ text, onPress }: HeaderLabelProps) {
  const label = (
    <Text
      numberOfLines={1}
      className="text-[17px] font-black text-[#4b2e1f]"
      style={{ fontFamily: 'ShipporiMincho_700Bold' }}
    >
      {text}
    </Text>
  );

  if (!onPress) {
    return label;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="ユーザーネームを変更"
      className="self-start active:opacity-70"
    >
      {label}
    </Pressable>
  );
}
