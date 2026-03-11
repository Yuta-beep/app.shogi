import { Text } from 'react-native';

type HeaderLabelProps = {
  text: string;
};

export function HeaderLabel({ text }: HeaderLabelProps) {
  return (
    <Text
      numberOfLines={1}
      className="text-[17px] font-black text-[#4b2e1f]"
      style={{ fontFamily: 'ShipporiMincho_700Bold' }}
    >
      {text}
    </Text>
  );
}
