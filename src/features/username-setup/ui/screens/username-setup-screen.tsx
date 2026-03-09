import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUsernameSetupScreen } from '@/features/username-setup/ui/use-username-setup-screen';

export function UsernameSetupScreen() {
  const { username, setUsername, isSubmitting, error, handleSubmit } = useUsernameSetupScreen();

  return (
    <SafeAreaView className="flex-1 bg-gray-900 justify-center px-8">
      <Text className="text-white text-2xl font-bold text-center mb-2">ユーザーネームを設定</Text>
      <Text className="text-gray-400 text-sm text-center mb-8">あとから変更できます</Text>

      <TextInput
        className="bg-gray-800 text-white text-lg rounded-lg px-4 py-3 mb-4"
        placeholder="ユーザーネームを入力"
        placeholderTextColor="#6b7280"
        value={username}
        onChangeText={setUsername}
        maxLength={20}
        autoFocus
      />

      {error && <Text className="text-red-400 text-sm text-center mb-4">{error}</Text>}

      <Pressable
        className="bg-yellow-500 rounded-lg py-4 items-center active:opacity-70 disabled:opacity-40"
        onPress={() => void handleSubmit()}
        disabled={isSubmitting || username.trim().length === 0}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black text-lg font-bold">決定</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}
