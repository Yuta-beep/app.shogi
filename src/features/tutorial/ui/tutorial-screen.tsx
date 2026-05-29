import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tutorialAssets } from '@/constants/tutorial-assets';
import { tutorialDialogues } from '@/features/tutorial/data/tutorial-dialogues';
import {
  getTutorialOverlayForIndex,
  resolveTutorialOverlaySize,
  TUTORIAL_BUBBLE_LAYOUT,
  TUTORIAL_CHARACTER_LAYOUT,
  TUTORIAL_NAV_BUTTON_LAYOUT,
} from '@/features/tutorial/data/tutorial-layout';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

export function TutorialScreen() {
  useScreenBgm('home');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const dialogue = tutorialDialogues[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= tutorialDialogues.length - 1;
  const overlay = getTutorialOverlayForIndex(currentIndex);

  const bounce = useRef(new Animated.Value(0)).current;
  const dialogueOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -10,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [bounce]);

  useEffect(() => {
    dialogueOpacity.setValue(0);
    Animated.timing(dialogueOpacity, {
      toValue: 1,
      duration: 400,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, dialogueOpacity]);

  useEffect(() => {
    if (!overlay) {
      overlayOpacity.setValue(0);
      return;
    }
    overlayOpacity.setValue(0);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, overlay, overlayOpacity]);

  const goToTitle = useCallback(() => {
    void playSe('tap');
    router.replace('/');
  }, [router]);

  const nextDialogue = useCallback(() => {
    if (isLast) {
      return;
    }
    void playSe('tap');
    setCurrentIndex((i) => Math.min(i + 1, tutorialDialogues.length - 1));
  }, [isLast]);

  const prevDialogue = useCallback(() => {
    if (isFirst) {
      return;
    }
    void playSe('tap');
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  const charSize = Math.min(
    winW * TUTORIAL_CHARACTER_LAYOUT.widthMultiplier,
    TUTORIAL_CHARACTER_LAYOUT.maxSize,
  );
  const overlaySize = overlay ? resolveTutorialOverlaySize(overlay, winW) : null;

  return (
    <ImageBackground
      source={tutorialAssets.background}
      resizeMode="cover"
      className="flex-1 bg-black"
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View className="flex-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="タイトルに戻る"
          onPress={goToTitle}
          className="absolute z-[9999] rounded-full bg-[rgba(139,0,0,0.85)] px-3 py-2 active:opacity-80"
          style={{ top: insets.top + 12, left: 16 }}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </Pressable>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Math.max(insets.top, 8) + 44,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="relative min-h-[520px] w-full flex-1">
            {overlay ? (
              <Animated.View
                pointerEvents="none"
                className="absolute z-[3]"
                style={{
                  top: overlay.top,
                  left: overlay.left,
                  opacity: overlayOpacity,
                }}
              >
                <Image
                  source={overlay.source}
                  accessibilityIgnoresInvertColors
                  style={{
                    height: overlaySize!.height,
                    width: overlaySize!.width,
                    maxWidth: overlaySize!.maxWidth,
                  }}
                  resizeMode="contain"
                />
              </Animated.View>
            ) : null}

            <Animated.View
              pointerEvents="none"
              className="absolute z-[1]"
              style={{
                transform: [{ translateY: bounce }],
                bottom: TUTORIAL_CHARACTER_LAYOUT.bottom,
                right: -winW * TUTORIAL_CHARACTER_LAYOUT.rightOverflowRatio,
              }}
            >
              <Image
                source={tutorialAssets.character}
                accessibilityLabel="瑪師"
                style={{ width: charSize, height: charSize }}
                resizeMode="contain"
              />
            </Animated.View>

            <View
              className="w-full"
              style={{
                height:
                  winW < TUTORIAL_BUBBLE_LAYOUT.tabletBreakpoint
                    ? TUTORIAL_BUBBLE_LAYOUT.spacerHeightMobile
                    : TUTORIAL_BUBBLE_LAYOUT.spacerHeightTablet,
              }}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="次の説明へ"
              onPress={nextDialogue}
              className="z-[2] mt-10 w-full active:opacity-95"
            >
              <ImageBackground
                source={tutorialAssets.bubble}
                resizeMode="stretch"
                className="w-full"
                style={{
                  paddingHorizontal: TUTORIAL_BUBBLE_LAYOUT.paddingHorizontal,
                  paddingVertical: TUTORIAL_BUBBLE_LAYOUT.paddingVertical,
                }}
                imageStyle={{ borderRadius: 0 }}
              >
                <Animated.View
                  style={{
                    opacity: dialogueOpacity,
                    minHeight: TUTORIAL_BUBBLE_LAYOUT.minTextHeight,
                  }}
                >
                  <Text
                    className="text-[18px] font-black leading-[32px] text-white"
                    style={{
                      textShadowColor: 'rgba(0,0,0,0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 4,
                    }}
                  >
                    {dialogue.text}
                  </Text>
                </Animated.View>
              </ImageBackground>
            </Pressable>

            <View
              className="z-[9998] w-full flex-row items-end justify-between pb-2"
              style={{
                marginTop: TUTORIAL_BUBBLE_LAYOUT.nextButtonOverlap,
                paddingTop: 4,
                paddingHorizontal: TUTORIAL_NAV_BUTTON_LAYOUT.row.paddingHorizontal,
                gap: TUTORIAL_NAV_BUTTON_LAYOUT.row.gap,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="前の説明へ戻る"
                disabled={isFirst}
                onPress={prevDialogue}
                className="shrink active:opacity-90"
                style={{
                  opacity: isFirst ? 0.4 : 1,
                  maxWidth: '48%',
                  marginBottom: TUTORIAL_NAV_BUTTON_LAYOUT.prev.offsetUp,
                }}
              >
                <Image
                  source={tutorialAssets.buttons.prev}
                  accessibilityIgnoresInvertColors
                  style={{
                    height: TUTORIAL_NAV_BUTTON_LAYOUT.height,
                    width: TUTORIAL_NAV_BUTTON_LAYOUT.width,
                    maxWidth: winW * TUTORIAL_NAV_BUTTON_LAYOUT.prev.maxWidthRatio,
                  }}
                  resizeMode="contain"
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="次へ"
                disabled={isLast}
                onPress={nextDialogue}
                className="shrink active:opacity-90"
                style={{ opacity: isLast ? 0.4 : 1, maxWidth: '48%' }}
              >
                <Image
                  source={tutorialAssets.buttons.next}
                  accessibilityIgnoresInvertColors
                  style={{
                    height: TUTORIAL_NAV_BUTTON_LAYOUT.height,
                    width: TUTORIAL_NAV_BUTTON_LAYOUT.width,
                    maxWidth: winW * TUTORIAL_NAV_BUTTON_LAYOUT.next.maxWidthRatio,
                  }}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}
