import { Pressable, Text, View } from 'react-native';

type CommonHeaderProps = {
  title: string;
  rank?: number;
  exp?: number;
  onBack?: () => void;
};

export function CommonHeader({ title, rank = 1, exp = 0, onBack }: CommonHeaderProps) {
  return (
    <View className="mx-4 pt-3">
      <View
        className="relative h-16 flex-row items-center justify-between overflow-visible rounded-[14px] border-2 border-[#b88a3b] bg-[#e5cfa7] px-4"
        style={{
          shadowColor: 'rgba(49,27,17,0.28)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 14,
          elevation: 7,
        }}
      >
        <View className="absolute inset-[4px] rounded-[10px] border border-[rgba(120,80,30,0.28)]" />

        <View className="absolute bottom-[-7px] left-1/2 h-[14px] w-[14px] -translate-x-1/2 rotate-45 border-b border-r border-[#8e6428] bg-[#d2a860]" />

        <View className="min-w-[72px] flex-row items-center gap-2">
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityLabel="戻る"
              className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(120,80,30,0.4)] bg-[#f2dfbf] active:translate-y-[1px]"
            >
              <Text className="text-lg font-black text-[#4b2e1f]">←</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mx-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-center text-[28px] tracking-[0.08em] text-[#4b2e1f]"
            style={{ fontFamily: 'ShipporiMincho_700Bold' }}
          >
            {title}
          </Text>
        </View>

        <View className="min-w-[72px] flex-row items-center justify-end gap-2">
          <View className="h-2 w-2 rotate-45 border border-[#9b6a27] bg-[#d6aa60]" />
          <Text className="text-[15px] font-black text-[#4b2e1f]">{`ランク ${rank} / EXP ${exp}`}</Text>
        </View>
      </View>
    </View>
  );
}
