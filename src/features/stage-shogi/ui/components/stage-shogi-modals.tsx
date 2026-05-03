import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';

import { resolvePieceImageSource } from '@/lib/piece-image';
import { Side } from '@/features/stage-shogi/domain/game-rules';
import { InspectingPieceState } from '@/features/stage-shogi/ui/stage-shogi-screen.presenters';
import { getPieceImageSource } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import type {
  PendingPromotion,
  TimeActionMode,
} from '@/features/stage-shogi/ui/use-stage-shogi-screen';

export function StageShogiResultOverlay({
  winner,
  clearRewardText,
}: {
  winner: Side | null;
  clearRewardText: string | null;
}) {
  if (!winner) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 p-6">
      <View
        className={`w-full max-w-sm rounded-2xl border-2 p-6 ${
          winner === 'player' ? 'border-yellow-500 bg-[#fffbeb]' : 'border-[#7f1d1d] bg-[#fff5f5]'
        }`}
      >
        <Text
          className={`text-center text-3xl font-black ${
            winner === 'player' ? 'text-yellow-600' : 'text-[#7f1d1d]'
          }`}
        >
          {winner === 'player' ? '勝利！' : '敗北...'}
        </Text>
        <Text className="mt-2 text-center text-sm font-bold text-gray-500">
          {winner === 'player' ? 'おめでとうございます！' : 'またチャレンジしよう'}
        </Text>
        {clearRewardText ? (
          <Text className="mt-3 text-center text-xs font-bold text-[#14532d]">
            {clearRewardText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function StageShogiPromotionModal({
  pendingPromotion,
  onCommit,
}: {
  pendingPromotion: PendingPromotion | null;
  onCommit: (kind: 'promote' | 'nonPromote') => void;
}) {
  if (!pendingPromotion) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/35 p-6">
      <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
        <Text className="text-base font-black text-ink">成りますか？</Text>
        <View className="mt-3 flex-row gap-3">
          <Pressable
            testID="promotion-yes"
            className="flex-1 rounded-md bg-[#166534] px-3 py-2"
            onPress={() => {
              onCommit('promote');
            }}
          >
            <Text className="text-center font-bold text-white">成る</Text>
          </Pressable>
          <Pressable
            testID="promotion-no"
            className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
            onPress={() => {
              onCommit('nonPromote');
            }}
          >
            <Text className="text-center font-bold text-white">成らない</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function StageShogiHouseSkillModal({
  pending,
  onUseSkill,
  onCancel,
}: {
  pending: { row: number; col: number } | null;
  onUseSkill: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={pending != null}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/35 p-6">
        <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
          <Text className="text-base font-black text-ink">「家」駒のスキル</Text>
          <Text className="mt-2 text-xs text-[#6b4532]">
            自陣4行の空マスに「民」を1体召喚します。盤上の「民」が合計5体いるときは使用できません。
          </Text>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              className="flex-1 rounded-md bg-[#166534] px-3 py-2"
              onPress={() => {
                onUseSkill();
              }}
            >
              <Text className="text-center font-bold text-white">スキル使用</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-md bg-[#6b7280] px-3 py-2"
              onPress={() => {
                onCancel();
              }}
            >
              <Text className="text-center font-bold text-white">キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function StageShogiTimeActionModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: { row: number; col: number } | null;
  onConfirm: (mode: TimeActionMode) => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  return (
    <View className="absolute inset-0 items-center justify-center bg-black/35 p-6">
      <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
        <Text className="text-base font-black text-ink">「時」駒の行動を選択</Text>
        <View className="mt-3 flex-row gap-3">
          <Pressable
            className="flex-1 rounded-md bg-[#166534] px-3 py-2"
            onPress={() => {
              onConfirm('skill');
            }}
          >
            <Text className="text-center font-bold text-white">スキル使用</Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
            onPress={() => {
              onConfirm('normal');
            }}
          >
            <Text className="text-center font-bold text-white">通常移動</Text>
          </Pressable>
        </View>
        <Pressable className="mt-3 rounded-md bg-[#6b7280] px-3 py-2" onPress={onCancel}>
          <Text className="text-center font-bold text-white">キャンセル</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StageShogiSkillToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View className="rounded-lg bg-black/75 px-4 py-2">
        <Text className="text-sm font-black text-white">{text}</Text>
      </View>
    </View>
  );
}

export function StageShogiInspectModal({
  inspectingPiece,
  onClose,
}: {
  inspectingPiece: InspectingPieceState;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!inspectingPiece} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
          {inspectingPiece &&
          resolvePieceImageSource({
            pieceCode: inspectingPiece.pieceCode,
            char: inspectingPiece.char,
            imageSignedUrl: inspectingPiece.imageSignedUrl,
          }) ? (
            <Image
              source={
                getPieceImageSource({
                  pieceCode: inspectingPiece.pieceCode,
                  char: inspectingPiece.char,
                  imageSignedUrl: inspectingPiece.imageSignedUrl,
                })!
              }
              contentFit="contain"
              style={{ width: 56, height: 56, alignSelf: 'center' }}
            />
          ) : inspectingPiece?.imageSignedUrl ? (
            <Image
              source={{ uri: inspectingPiece.imageSignedUrl }}
              contentFit="contain"
              style={{ width: 56, height: 56, alignSelf: 'center' }}
            />
          ) : (
            <Text className="text-center text-3xl font-black text-[#2f1b14]">
              {inspectingPiece?.char}
            </Text>
          )}
          <Text className="mt-1 text-center text-base font-black text-[#2f1b14]">
            {inspectingPiece?.name}
          </Text>
          <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
          <Text className="mt-1 text-sm text-[#1f2937]">{inspectingPiece?.desc}</Text>
          <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【行動範囲】</Text>
          <Text className="mt-1 text-sm text-[#1f2937]">{inspectingPiece?.move}</Text>
          <Pressable onPress={onClose} className="mt-4 rounded-md bg-[#8b0000] px-3 py-2">
            <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
