import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

const DEFAULT_FADE_IN_MS = 400;
const DEFAULT_FADE_HOLD_MS = 900;
const DEFAULT_FADE_OUT_MS = 400;

type UseHomeFadeHintOptions = {
  fadeInMs?: number;
  fadeHoldMs?: number;
  fadeOutMs?: number;
};

export function useHomeFadeHint(options?: UseHomeFadeHintOptions) {
  const fadeInMs = options?.fadeInMs ?? DEFAULT_FADE_IN_MS;
  const fadeHoldMs = options?.fadeHoldMs ?? DEFAULT_FADE_HOLD_MS;
  const fadeOutMs = options?.fadeOutMs ?? DEFAULT_FADE_OUT_MS;

  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const runningRef = useRef(false);

  const show = useCallback(() => {
    if (runningRef.current) {
      opacity.stopAnimation();
    }
    runningRef.current = true;
    setVisible(true);
    opacity.setValue(0);

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: fadeInMs,
        useNativeDriver: true,
      }),
      Animated.delay(fadeHoldMs),
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeOutMs,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      runningRef.current = false;
      if (finished) {
        setVisible(false);
      }
    });
  }, [fadeHoldMs, fadeInMs, fadeOutMs, opacity]);

  return { opacity, visible, show };
}
