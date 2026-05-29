import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { resolveSkillParticleForPieceChar } from '@/constants/skill-particle-assets';

const FADE_IN_MS = 280;
const HOLD_MS = 520;
const FADE_OUT_MS = 320;

export const SkillParticleBurst = memo(function SkillParticleBurst({
  pieceChar,
  style,
  onFinished,
}: {
  pieceChar: string;
  style: object;
  onFinished: () => void;
}) {
  const source = resolveSkillParticleForPieceChar(pieceChar);
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
  }, [onFinished, opacity, pieceChar, source]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!source) return null;

  return (
    <Animated.View pointerEvents="none" style={[style, animatedStyle]}>
      <Image source={source} contentFit="contain" style={{ width: '100%', height: '100%' }} />
    </Animated.View>
  );
});
