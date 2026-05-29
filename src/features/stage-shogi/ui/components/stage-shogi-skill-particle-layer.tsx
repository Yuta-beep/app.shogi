import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { resolveSkillParticleForVisualEffect } from '@/constants/skill-particle-assets';
import type { SkillVisualEffect } from '@/domain/battle/skill-visual-effect';
import { BOARD_CELL_INNER_RATIO } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';

const FADE_IN_MS = 280;
const HOLD_MS = 520;
const FADE_OUT_MS = 320;

function SkillParticleBurst({
  effect,
  onFinished,
}: {
  effect: SkillVisualEffect;
  onFinished: () => void;
}) {
  const source = resolveSkillParticleForVisualEffect(effect);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!source) {
      onFinished();
      return;
    }
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: HOLD_MS }),
      withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(onFinished)();
        }
      }),
    );
  }, [effect.col, effect.kind, effect.row, onFinished, opacity, source]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!source) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: `${effect.row * BOARD_CELL_INNER_RATIO * 100}%`,
          left: `${effect.col * BOARD_CELL_INNER_RATIO * 100}%`,
          width: `${BOARD_CELL_INNER_RATIO * 100}%`,
          height: `${BOARD_CELL_INNER_RATIO * 100}%`,
          zIndex: 28,
        },
        animatedStyle,
      ]}
    >
      <Image source={source} contentFit="contain" style={{ width: '100%', height: '100%' }} />
    </Animated.View>
  );
}

export const StageShogiSkillParticleLayer = memo(function StageShogiSkillParticleLayer({
  effects,
  onEffectFinished,
}: {
  effects: SkillVisualEffect[];
  onEffectFinished: (effect: SkillVisualEffect) => void;
}) {
  if (effects.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {effects.map((effect, index) => (
        <SkillParticleBurst
          key={`${effect.kind}-${effect.row}-${effect.col}-${index}`}
          effect={effect}
          onFinished={() => onEffectFinished(effect)}
        />
      ))}
    </View>
  );
});
