import { Image } from 'expo-image';
import { Modal, Pressable, Text, TextInput, View, ScrollView } from 'react-native';

import { AppLoadingScreen } from '@/components/module/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { UiScreenShell } from '@/components/module/ui-screen-shell';
import { useDeckBuilderScreen } from '@/features/deck-builder/ui/use-deck-builder-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const deckAssets = {
  bg: require('../../../../assets/deck-builder/deck-bg.png'),
  board: require('../../../../assets/deck-builder/shogi-board.png'),
} as const;

export function DeckBuilderScreen() {
  const vm = useDeckBuilderScreen();
  const { isReady: areAssetsReady } = useAssetPreload([deckAssets.bg, deckAssets.board]);
  useScreenBgm('deckBuilder');

  if (vm.isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <UiScreenShell title="マイデッキ作成" subtitle="将棋盤に駒を配置して保存">
      <View className="overflow-hidden rounded-2xl border border-[#8b0000]/50">
        <Image source={deckAssets.bg} contentFit="cover" style={{ width: '100%', height: 180 }} />
      </View>

      <View className="mt-3 rounded-2xl border-4 border-[#a27700] bg-[#e4c58f] p-3">
        <Image source={deckAssets.board} contentFit="contain" style={{ width: '100%', height: 260 }} />
      </View>

      {/* 所持駒パレット */}
      <View className="mt-4 rounded-xl border border-[#8b0000]/30 bg-white p-3">
        <Text className="text-sm font-black text-[#2f1b14]">所持駒（タップで詳細）</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {vm.ownedPieces.map((piece) => (
            <Pressable
              key={piece.char}
              onPress={() => {
                void playSe('tap');
                vm.openPieceDetail(piece);
              }}
              className="h-10 w-10 items-center justify-center rounded-md border border-[#8b0000]/40 bg-[#fff7e6] active:scale-95"
            >
              <Text className="text-lg font-black text-[#2f1b14]">{piece.char}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 操作ボタン */}
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={() => { void playSe('tap'); vm.openDefaultModal(); }}
          className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-[#8b0000]/40 bg-white px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#2f1b14]">デフォルト</Text>
        </Pressable>
        <Pressable
          onPress={() => { void playSe('tap'); vm.openLoadModal(); }}
          className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-[#8b0000]/40 bg-white px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#2f1b14]">読込</Text>
        </Pressable>
        <Pressable
          onPress={() => { void playSe('confirm'); vm.openSaveModal(); }}
          className="h-20 flex-1 items-center justify-center rounded-xl bg-[#8b0000] px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#ffe6a5]">保存</Text>
        </Pressable>
      </View>

      {/* 駒詳細モーダル */}
      <Modal visible={!!vm.selectedPiece} transparent animationType="fade" onRequestClose={vm.closePieceDetail}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-3xl font-black text-[#2f1b14] text-center">{vm.selectedPiece?.char}</Text>
            <Text className="mt-1 text-base font-black text-[#2f1b14] text-center">{vm.selectedPiece?.name}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{vm.selectedPiece?.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【行動範囲】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{vm.selectedPiece?.move}</Text>
            <Pressable
              onPress={() => { void playSe('cancel'); vm.closePieceDetail(); }}
              className="mt-4 rounded-md bg-[#8b0000] px-3 py-2"
            >
              <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* デッキ保存モーダル */}
      <Modal visible={vm.saveModalOpen} transparent animationType="fade" onRequestClose={vm.closeSaveModal}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-base font-black text-[#2f1b14]">デッキを保存</Text>
            <TextInput
              value={vm.deckName}
              onChangeText={vm.setDeckName}
              placeholder="デッキ名を入力"
              placeholderTextColor="#9ca3af"
              className="mt-3 rounded-md border border-[#8b0000]/30 bg-white px-3 py-2 text-sm text-[#1f2937]"
            />
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => { void playSe('confirm'); vm.saveDeck(); }}
                className="flex-1 rounded-md bg-[#8b0000] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffd56a]">保存</Text>
              </Pressable>
              <Pressable
                onPress={() => { void playSe('cancel'); vm.closeSaveModal(); }}
                className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2"
              >
                <Text className="text-center font-black text-[#7f1d1d]">キャンセル</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* デッキ読込モーダル */}
      <Modal visible={vm.loadModalOpen} transparent animationType="fade" onRequestClose={vm.closeLoadModal}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-base font-black text-[#2f1b14]">デッキを読込</Text>
            <ScrollView className="mt-3 max-h-64">
              {vm.savedDecks.length === 0 ? (
                <Text className="text-sm text-[#6b4532]">保存済みデッキがありません。</Text>
              ) : (
                vm.savedDecks.map((deck) => (
                  <View key={deck.id} className="mb-2 flex-row items-center justify-between rounded-lg border border-[#8b0000]/20 bg-white px-3 py-2">
                    <View className="flex-1">
                      <Text className="text-sm font-black text-[#2f1b14]">{deck.name}</Text>
                      <Text className="text-xs text-[#6b4532]">{deck.savedAt}</Text>
                    </View>
                    <Pressable
                      onPress={() => { void playSe('cancel'); vm.deleteDeck(deck.id); }}
                      className="ml-2 rounded px-2 py-1 active:opacity-70"
                      style={{ backgroundColor: '#fee2e2' }}
                    >
                      <Text className="text-xs font-black text-[#b91c1c]">削除</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => { void playSe('cancel'); vm.closeLoadModal(); }}
              className="mt-3 rounded-md border border-[#8b0000] bg-white px-3 py-2"
            >
              <Text className="text-center font-black text-[#7f1d1d]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* デフォルト読込確認モーダル */}
      <Modal visible={vm.defaultModalOpen} transparent animationType="fade" onRequestClose={vm.closeDefaultModal}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-xs rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-center text-base font-black text-[#2f1b14]">デフォルトデッキを読込みますか？</Text>
            <Text className="mt-1 text-center text-xs text-[#6b4532]">現在の配置がリセットされます。</Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => { void playSe('confirm'); vm.loadDefault(); }}
                className="flex-1 rounded-md bg-[#8b0000] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffd56a]">はい</Text>
              </Pressable>
              <Pressable
                onPress={() => { void playSe('cancel'); vm.closeDefaultModal(); }}
                className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2"
              >
                <Text className="text-center font-black text-[#7f1d1d]">いいえ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </UiScreenShell>
  );
}
