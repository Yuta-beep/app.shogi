import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { ImageSourcePropType } from 'react-native';

type CurrencyChipProps = {
  iconSource: ImageSourcePropType;
  value: number;
};

export function CurrencyChip({ iconSource, value }: CurrencyChipProps) {
  return (
    <View className="flex-row items-center gap-1" style={{ transform: [{ translateY: 2 }] }}>
      <Image source={iconSource} contentFit="contain" style={{ width: 32, height: 32 }} />
      <Text className="text-[14px] font-black text-[#4b2e1f]">{value}</Text>
    </View>
  );
}
