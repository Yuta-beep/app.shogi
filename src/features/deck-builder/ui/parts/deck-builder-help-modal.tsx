import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import {
  DECK_BUILDER_HELP_LINES,
  DECK_BUILDER_HELP_TITLE,
} from '@/features/deck-builder/ui/deck-builder-help-content';

type DeckBuilderHelpModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function DeckBuilderHelpModal({ visible, onClose }: DeckBuilderHelpModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
          <Text className="text-base font-black text-[#2f1b14]">{DECK_BUILDER_HELP_TITLE}</Text>
          <ScrollView className="mt-3 max-h-72" showsVerticalScrollIndicator={false}>
            {DECK_BUILDER_HELP_LINES.map((line) => (
              <Text
                key={line}
                className="mb-2 text-sm font-semibold leading-6 text-[#4b2e1f]"
              >{`・${line}`}</Text>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="閉じる"
            onPress={onClose}
            className="mt-3 rounded-md border border-[#8b0000] bg-white px-3 py-2 active:opacity-80"
          >
            <Text className="text-center font-black text-[#7f1d1d]">閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
