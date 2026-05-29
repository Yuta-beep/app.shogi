import { memo, useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';
import { splitSkillVisualPlacements } from '@/domain/battle/skill-visual-fx';
import { SkillParticleBurst } from '@/features/stage-shogi/ui/components/skill-particle-burst';
import { BOARD_CELL_INNER_RATIO } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';

function BoardSkillEffectGroup({
  effect,
  onEffectFinished,
}: {
  effect: SkillVisualEffect;
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
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

  if (board.length === 0) {
    return null;
  }

  return (
    <>
      {board.map((cell, index) => (
        <SkillParticleBurst
          key={`${effect.id}-board-${cell.row}-${cell.col}-${index}`}
          pieceChar={effect.pieceChar}
          onFinished={onBurstFinished}
          style={{
            position: 'absolute',
            top: `${cell.row * BOARD_CELL_INNER_RATIO * 100}%`,
            left: `${cell.col * BOARD_CELL_INNER_RATIO * 100}%`,
            width: `${BOARD_CELL_INNER_RATIO * 100}%`,
            height: `${BOARD_CELL_INNER_RATIO * 100}%`,
            zIndex: 28,
          }}
        />
      ))}
    </>
  );
}

export const StageShogiSkillParticleLayer = memo(function StageShogiSkillParticleLayer({
  effects,
  onEffectFinished,
}: {
  effects: SkillVisualEffect[];
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const boardEffects = effects.filter((effect) =>
    effect.placements.some((placement) => placement.type === 'board'),
  );
  if (boardEffects.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {boardEffects.map((effect) => (
        <BoardSkillEffectGroup
          key={effect.id}
          effect={effect}
          onEffectFinished={onEffectFinished}
        />
      ))}
    </View>
  );
});
