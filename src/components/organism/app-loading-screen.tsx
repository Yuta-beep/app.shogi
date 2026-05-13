import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';

type AppLoadingScreenProps = {
  label?: string;
  imageSource?: number;
};

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const createWave = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.2,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(260),
        ]),
      );

    const a1 = createWave(dot1, 0);
    const a2 = createWave(dot2, 120);
    const a3 = createWave(dot3, 240);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View className="flex-row">
      <Animated.Text style={{ opacity: dot1 }} className="text-lg font-black text-[#ffe6a5]">
        .
      </Animated.Text>
      <Animated.Text style={{ opacity: dot2 }} className="text-lg font-black text-[#ffe6a5]">
        .
      </Animated.Text>
      <Animated.Text style={{ opacity: dot3 }} className="text-lg font-black text-[#ffe6a5]">
        .
      </Animated.Text>
    </View>
  );
}

export function AppLoadingScreen({
  label = 'Loading',
  imageSource = homeAssets.loadingImage,
}: AppLoadingScreenProps) {
  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View className="flex-1 items-center justify-center px-6">
        {imageSource ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={imageSource} contentFit="cover" style={StyleSheet.absoluteFill} />
            <View className="absolute bottom-6 right-6 flex-row items-center gap-2">
              <Text className="text-[18px] font-semibold tracking-widest text-white">{label}</Text>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          </View>
        ) : (
          <View className="flex-row items-center rounded-lg bg-black/45 px-3 py-2">
            <Text className="text-base font-bold text-[#ffe6a5]">{label}</Text>
            <LoadingDots />
          </View>
        )}
      </View>
    </View>
  );
}
