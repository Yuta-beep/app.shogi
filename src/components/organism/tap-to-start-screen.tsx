import { Pressable, Text, View } from 'react-native';

type TapToStartScreenProps = {
  onPressStart: () => void;
};

export function TapToStartScreen({ onPressStart }: TapToStartScreenProps) {
  return (
    <View className="flex-1 items-center justify-end px-6 pb-16">
      <Pressable
        onPress={onPressStart}
        className="w-full max-w-xs rounded-xl border-2 border-[#ffd56a] bg-[#8b0000]/90 px-6 py-4 active:scale-95"
      >
        <Text className="text-center text-lg font-black tracking-wider text-[#ffe6a5]">
          タップしてホームへ
        </Text>
      </Pressable>
    </View>
  );
}
