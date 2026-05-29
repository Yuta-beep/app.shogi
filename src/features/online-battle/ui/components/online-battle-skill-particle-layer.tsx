import { memo, useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';
import { splitSkillVisualPlacements } from '@/domain/battle/skill-visual-fx';
import { SkillParticleBurst } from '@/features/stage-shogi/ui/components/skill-particle-burst';
import { toViewCoord } from '@/lib/matching-server/game-bridge';
import type { PlayerSide } from '@/domain/matching-server/protocol';

const BOARD_CENTER_OVERLAY_RATIO = 0.78;
const BOARD_CENTER_OFFSET_RATIO = (1 - BOARD_CENTER_OVERLAY_RATIO) / 2;

function BoardCenterSkillEffectGroup({
  effect,
  boardSize,
  onEffectFinished,
}: {
  effect: SkillVisualEffect;
  boardSize: number;
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const { boardCenter } = splitSkillVisualPlacements(effect);
  const overlaySize = boardSize * BOARD_CENTER_OVERLAY_RATIO;
  const offset = boardSize * BOARD_CENTER_OFFSET_RATIO;

  useEffect(() => {
    if (!boardCenter) {
      onEffectFinished(effect);
    }
  }, [boardCenter, effect, onEffectFinished]);

  if (!boardCenter) return null;

  return (
    <SkillParticleBurst
      pieceChar={effect.pieceChar}
      onFinished={() => onEffectFinished(effect)}
      style={{
        position: 'absolute',
        left: offset,
        top: offset,
        width: overlaySize,
        height: overlaySize,
        zIndex: 32,
      }}
    />
  );
}

function BoardSkillEffectGroup({
  effect,
  boardSize,
  myRole,
  onEffectFinished,
}: {
  effect: SkillVisualEffect;
  boardSize: number;
  myRole: PlayerSide;
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const cellSize = boardSize / 9;
  const { board } = splitSkillVisualPlacements(effect);
  const remainingRef = useRef(board.length);

  const onBurstFinished = useCallback(() => {
    remainingRef.current -= 1;
    if (remainingRef.current <= 0) {
      onEffectFinished(effect);
    }
  }, [effect, onEffectFinished]);

  useEffect(() => {
    if (board.length === 0) {
      onEffectFinished(effect);
    }
  }, [board.length, effect, onEffectFinished]);

  if (board.length === 0) return null;

  return (
    <>
      {board.map((cell, index) => {
        const view = toViewCoord(cell.row, cell.col, myRole);
        return (
          <SkillParticleBurst
            key={`${effect.id}-board-${cell.row}-${cell.col}-${index}`}
            pieceChar={effect.pieceChar}
            onFinished={onBurstFinished}
            style={{
              position: 'absolute',
              left: view.col * cellSize,
              top: view.row * cellSize,
              width: cellSize,
              height: cellSize,
              zIndex: 28,
            }}
          />
        );
      })}
    </>
  );
}

function hasBoardLayerPlacement(effect: SkillVisualEffect): boolean {
  return effect.placements.some(
    (placement) => placement.type === 'board' || placement.type === 'board_center',
  );
}

export const OnlineBattleSkillParticleLayer = memo(function OnlineBattleSkillParticleLayer({
  effects,
  boardSize,
  myRole,
  onEffectFinished,
}: {
  effects: SkillVisualEffect[];
  boardSize: number;
  myRole: PlayerSide;
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const boardEffects = effects.filter(hasBoardLayerPlacement);
  if (boardEffects.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {boardEffects.map((effect) => {
        const { board, boardCenter } = splitSkillVisualPlacements(effect);
        return (
          <View key={effect.id} pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            {boardCenter ? (
              <BoardCenterSkillEffectGroup
                effect={effect}
                boardSize={boardSize}
                onEffectFinished={onEffectFinished}
              />
            ) : null}
            {board.length > 0 ? (
              <BoardSkillEffectGroup
                effect={effect}
                boardSize={boardSize}
                myRole={myRole}
                onEffectFinished={onEffectFinished}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
});
