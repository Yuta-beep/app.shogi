import { Modal, Pressable, Text, TextInput, View } from 'react-native';

type EditDisplayNameModalProps = {
  visible: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
};

export function EditDisplayNameModal({
  visible,
  value,
  onChangeValue,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: EditDisplayNameModalProps) {
  const canSubmit = value.trim().length > 0 && !isSubmitting;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
          <Text className="text-base font-black text-[#2f1b14]">ユーザーネームを変更</Text>
          <Text className="mt-1 text-xs font-semibold text-[#5c4033]">
            表示名を入力して保存してください
          </Text>
          <TextInput
            value={value}
            onChangeText={onChangeValue}
            placeholder="ユーザーネームを入力"
            placeholderTextColor="#9ca3af"
            maxLength={20}
            autoFocus
            editable={!isSubmitting}
            className="mt-3 rounded-md border border-[#8b0000]/30 bg-white px-3 py-2 text-sm text-[#1f2937]"
          />
          {error ? (
            <Text className="mt-2 text-center text-xs font-bold text-red-700">{error}</Text>
          ) : null}
          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              className="flex-1 rounded-md bg-[#8b0000] px-3 py-2 disabled:opacity-40"
            >
              <Text className="text-center font-black text-[#ffd56a]">保存</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2 disabled:opacity-40"
            >
              <Text className="text-center font-black text-[#7f1d1d]">キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
