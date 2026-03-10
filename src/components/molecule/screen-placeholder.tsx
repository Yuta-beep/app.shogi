import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenPlaceholderProps = {
  title: string;
};

export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-black text-ink">{title}</Text>
        <Text className="mt-3 text-center text-sm text-[#6b4532]">
          この画面のUI再現は次ステップで実装します。
        </Text>
        <Link
          href="/home"
          className="mt-6 rounded-md border border-accent bg-[#fff7e6] px-4 py-2 text-sm font-bold text-ink"
        >
          ホームに戻る
        </Link>
      </View>
    </SafeAreaView>
  );
}
