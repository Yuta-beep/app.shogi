import { Text, View } from 'react-native';

type CurrencyChipProps = {
  label: string;
  value: number;
};

export function CurrencyChip({ label, value }: CurrencyChipProps) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-[12px] font-black text-[#4b2e1f]">{label}</Text>
      <Text className="text-[14px] font-black text-[#4b2e1f]">{value}</Text>
    </View>
  );
}
