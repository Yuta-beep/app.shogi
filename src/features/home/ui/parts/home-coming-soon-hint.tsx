import { Image } from 'expo-image';
import { Animated, View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';
import { useHomeFadeHint } from '@/features/home/ui/hooks/use-home-fade-hint';
import { HomeImageButton } from '@/features/home/ui/parts/home-image-button';
import { playSe } from '@/lib/audio/audio-manager';

type HomeComingSoonHintButtonProps = {
  source: number;
  frameClassName?: string;
  imageHeight?: number;
};

export function HomeComingSoonHintButton({
  source,
  frameClassName = 'h-[60px]',
  imageHeight = 70,
}: HomeComingSoonHintButtonProps) {
  const { opacity, visible, show } = useHomeFadeHint();

  return (
    <View className="relative min-w-0 flex-1 basis-0">
      <HomeImageButton
        source={source}
        frameClassName={frameClassName}
        imageHeight={imageHeight}
        overflowVisible
        dimmed
        onPress={() => {
          void playSe('tap');
          show();
        }}
      />
      {visible ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -56,
            left: 0,
            right: 0,
            alignItems: 'center',
            opacity,
            zIndex: 30,
          }}
        >
          <Image
            source={homeAssets.comingSoon}
            contentFit="contain"
            style={{ width: 200, height: 80 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
