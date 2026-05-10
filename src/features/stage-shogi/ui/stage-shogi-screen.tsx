import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import { homeAssets } from '@/constants/home-assets';
import { getNormalDungeonStagePreviewSource } from '@/constants/normal-dungeon-stage-previews';
import { StageShogiBoard } from '@/features/stage-shogi/ui/components/stage-shogi-board';
import { StageShogiHandsRow } from '@/features/stage-shogi/ui/components/stage-shogi-hands-row';
import {
  StageShogiHouseSkillModal,
  StageShogiInspectModal,
  StageShogiPromotionModal,
  StageShogiResultOverlay,
  StageShogiSkillToast,
  StageShogiTimeActionModal,
} from '@/features/stage-shogi/ui/components/stage-shogi-modals';
import { useStageShogiScreen } from '@/features/stage-shogi/ui/use-stage-shogi-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { listLocalPieceImageModules } from '@/lib/piece-image';

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const { isReady: isAuthReady, userId } = useAuthSession();
  const vm = useStageShogiScreen(stageParam, isAuthReady ? (userId ?? 'guest') : undefined);
  const { isReady: areAssetsReady } = useAssetPreload(listLocalPieceImageModules());
  useScreenBgm('battle');

  if (vm.isLoading || !areAssetsReady || vm.isBootstrappingBattle) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  const stageNo = Number(stageParam);
  const forceBlackBackground = Number.isFinite(stageNo) && stageNo === 33;
  const forceBlueBackground = Number.isFinite(stageNo) && stageNo === 43;
  const stageBattleBackgroundSource =
    Number.isFinite(stageNo) && stageNo > 0 && stageNo !== 33 && stageNo !== 43
      ? getNormalDungeonStagePreviewSource(stageNo)
      : null;

  return (
    <UiScreenShell
      title="Stage Shogi"
      subtitle="バトル画面（AI接続）"
      hideTitleText
      plainHeader
      homeButtonTextClassName="text-white"
      fullBleedBackgroundSource={stageBattleBackgroundSource ?? undefined}
      useBlackBackgroundWhenNoImage={forceBlackBackground}
      noImageBackgroundClassName={forceBlueBackground ? 'bg-blue-800' : undefined}
    >
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{`TURN ${vm.moveNo}`}</Text>
        <Text className="text-base font-black text-ink">{`${vm.snapshot.stageLabel}  手番: ${vm.sideToMove === 'player' ? 'あなた' : 'CPU'}`}</Text>
        {vm.isFinished ? (
          <Text className="mt-1 text-sm font-black text-[#7f1d1d]">{`対局終了: ${vm.winner === 'player' ? 'あなたの勝ち' : 'CPUの勝ち'}`}</Text>
        ) : null}
        {vm.aiError ? <Text className="mt-1 text-xs text-red-600">{vm.aiError}</Text> : null}
      </View>

      <View className="relative -mx-2 mt-20 mb-20">
        <View className="absolute -top-16 left-0 right-1 z-10 flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <StageShogiHandsRow
              side="enemy"
              hands={vm.hands}
              pieceSfenMapping={vm.pieceSfenMapping}
              pieceDefsByCode={vm.pieceDefsByCode}
              selectedDropPieceCode={vm.selectedDropPieceCode}
              sideToMove={vm.sideToMove}
              isAiThinking={vm.isAiThinking}
              isCreatingGame={vm.isCreatingGame}
              isFinished={vm.isFinished}
              hasPendingPromotion={vm.pendingPromotion !== null}
              pieceCatalog={vm.pieceCatalog}
              compact
              onPressPiece={vm.handleHandPiecePress}
            />
          </View>
          <View className="pointer-events-none rounded-md border border-blue-700 bg-white/80 px-2 py-1">
            <Text className="text-lg font-black text-blue-700">後手</Text>
          </View>
        </View>
        <View className="absolute -bottom-16 left-0 right-1 z-10 flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <StageShogiHandsRow
              side="player"
              hands={vm.hands}
              pieceSfenMapping={vm.pieceSfenMapping}
              pieceDefsByCode={vm.pieceDefsByCode}
              selectedDropPieceCode={vm.selectedDropPieceCode}
              sideToMove={vm.sideToMove}
              isAiThinking={vm.isAiThinking}
              isCreatingGame={vm.isCreatingGame}
              isFinished={vm.isFinished}
              hasPendingPromotion={vm.pendingPromotion !== null}
              pieceCatalog={vm.pieceCatalog}
              compact
              onPressPiece={vm.handleHandPiecePress}
            />
          </View>
          <View className="pointer-events-none rounded-md border border-blue-700 bg-white/80 px-2 py-1">
            <Text className="text-lg font-black text-blue-700">先手</Text>
          </View>
        </View>

        <StageShogiBoard
          pieces={vm.pieces}
          failedImageKeys={vm.failedImageKeys}
          onPieceImageError={vm.handlePieceImageError}
          spriteEpoch={vm.boardSpriteEpoch}
          promotionImageFlash={vm.promotionImageFlash}
          selectedCell={vm.selectedCell}
          legalTargets={vm.legalTargets}
          aiPreviewTarget={vm.aiPreviewTarget}
          enemyPreviewTargets={vm.enemyPreviewTargets}
          poisonHazardCells={vm.poisonHazardCells}
          rockObstacleCells={vm.rockObstacleCells}
          batsuHazardCells={vm.batsuHazardCells}
          thornHazardCells={vm.thornHazardCells}
          onCellPress={vm.handleBoardCellPress}
          onCellLongPress={vm.handleCellLongPress}
        />
      </View>

      <StageShogiResultOverlay winner={vm.winner} clearRewardText={vm.clearRewardText} />
      <StageShogiPromotionModal
        pendingPromotion={vm.pendingPromotion}
        onCommit={vm.commitPendingPromotion}
      />
      <StageShogiTimeActionModal
        pending={vm.pendingTimeActionCell}
        onConfirm={vm.confirmTimeAction}
        onCancel={vm.cancelTimeAction}
      />
      <StageShogiHouseSkillModal
        pending={vm.pendingHouseSkillCell}
        onUseSkill={vm.confirmHouseSkill}
        onCancel={vm.cancelHouseSkill}
      />
      <StageShogiSkillToast text={vm.skillActivationText} />

      {vm.pendingSatoriEnemyPick && vm.pendingSatoriEnemyPick.length > 1 ? (
        <Text className="mt-2 text-xs font-bold text-[#1d4ed8]">
          「悟」のスキル：味方が移動したあと、行動を止める敵駒のマスをタップしてください（王・玉は選べません）
        </Text>
      ) : null}

      {vm.pendingHeartAllyPick && vm.pendingHeartAllyPick.length > 1 ? (
        <Text className="mt-2 text-xs font-bold text-amber-900">
          「心」のスキル：味方が移動したあと、2ターン捕獲されないように守る味方駒のマスをタップしてください（王・玉は選べません）
        </Text>
      ) : null}

      {vm.selectedDropPieceCode && vm.legalTargets.length === 0 ? (
        <Text className="mt-2 text-xs text-red-600">その駒は打てる場所がありません。</Text>
      ) : null}

      <StageShogiInspectModal
        inspectingPiece={vm.inspectingPiece}
        onClose={vm.closeInspectingPiece}
      />

      {vm.isAiThinking ? (
        <View className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1">
          <Text className="text-xs font-bold text-white">Loading...</Text>
        </View>
      ) : null}
    </UiScreenShell>
  );
}
