import { memo, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';

import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';
import { splitSkillVisualPlacements } from '@/domain/battle/skill-visual-fx';
import { HandsState, Side } from '@/features/stage-shogi/domain/game-rules';
import { handKeyToDisplayPieceCode } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { SkillParticleBurst } from '@/features/stage-shogi/ui/components/skill-particle-burst';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const HAND_CHIP_WIDTH = 40;

function HandSkillEffectGroup({
  effect,
  side,
  slotIndexByCode,
  onEffectFinished,
}: {
  effect: SkillVisualEffect;
  side: Side;
  slotIndexByCode: Map<string, number>;
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const { hand } = splitSkillVisualPlacements(effect);
  const sideHand = hand.filter((entry) => entry.side === side);
  const remainingRef = useRef(sideHand.length);

  const onBurstFinished = useCallback(() => {
    remainingRef.current -= 1;
    if (remainingRef.current <= 0) {
      onEffectFinished(effect);
    }
  }, [effect, onEffectFinished]);

  if (sideHand.length === 0) return null;

  return (
    <>
      {sideHand.map((entry, index) => {
        const slotIndex = entry.slotIndex ?? slotIndexByCode.get(entry.pieceCode) ?? 0;
        return (
          <SkillParticleBurst
            key={`${effect.id}-hand-${entry.pieceCode}-${index}`}
            pieceChar={effect.pieceChar}
            onFinished={onBurstFinished}
            style={{
              position: 'absolute',
              left: slotIndex * HAND_CHIP_WIDTH,
              top: 0,
              width: HAND_CHIP_WIDTH,
              height: 40,
              zIndex: 30,
            }}
          />
        );
      })}
    </>
  );
}

export const StageShogiHandSkillParticleLayer = memo(function StageShogiHandSkillParticleLayer({
  effects,
  side,
  hands,
  pieceCatalog,
  onEffectFinished,
}: {
  effects: SkillVisualEffect[];
  side: Side;
  hands: HandsState;
  pieceCatalog: readonly PieceCatalogItem[];
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  const handEffects = effects.filter((effect) =>
    effect.placements.some((placement) => placement.type === 'hand' && placement.side === side),
  );

  const slotIndexByCode = useMemo(() => {
    const codes = Object.keys(hands[side]).filter((code) => (hands[side][code] ?? 0) > 0);
    const map = new Map<string, number>();
    codes.forEach((code, index) => {
      const displayCode = handKeyToDisplayPieceCode(code, pieceCatalog).toUpperCase();
      map.set(displayCode, index);
      map.set(code.toUpperCase(), index);
    });
    return map;
  }, [hands, pieceCatalog, side]);

  if (handEffects.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 40, zIndex: 25 }}
    >
      {handEffects.map((effect) => (
        <HandSkillEffectGroup
          key={`${effect.id}-${side}`}
          effect={effect}
          side={side}
          slotIndexByCode={slotIndexByCode}
          onEffectFinished={onEffectFinished}
        />
      ))}
    </View>
  );
});
