import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';

const PETAL_COUNT = 14;

export function HomeBackgroundSection() {
  const { width, height } = Dimensions.get('window');
  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, () => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 80,
        size: 8 + Math.random() * 8,
        startRotate: (Math.random() - 0.5) * 80,
        endRotate: (Math.random() - 0.5) * 280,
        duration: 4500 + Math.random() * 4500,
      })),
    [width],
  );
  const progressesRef = useRef(
    Array.from({ length: PETAL_COUNT }, () => new Animated.Value(Math.random())),
  );

  useEffect(() => {
    const animations = progressesRef.current.map((progress, index) => {
      // 花びらごとに開始位置をずらし、途切れなく流し続ける
      progress.setValue(Math.random());
      const animation = Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: petals[index]?.duration ?? 5000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { resetBeforeIteration: true },
      );
      animation.start();
      return animation;
    });

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [petals]);

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {petals.map((petal, index) => {
        const progress = progressesRef.current[index];
        return (
          <Animated.View
            key={`petal-${petal.x.toFixed(2)}-${index}`}
            style={{
              position: 'absolute',
              left: petal.x,
              top: -24,
              width: petal.size,
              height: petal.size * 0.72,
              backgroundColor: 'rgba(255, 182, 193, 0.7)',
              borderRadius: petal.size,
              opacity: progress.interpolate({
                inputRange: [0, 0.08, 0.92, 1],
                outputRange: [0, 0.9, 0.9, 0],
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, height + 40],
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, petal.drift * 0.5, petal.drift],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${petal.startRotate}deg`, `${petal.endRotate}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
