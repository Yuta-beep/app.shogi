import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { homeAssets } from '@/constants/home-assets';
import { HomeImageButton } from '@/features/home/ui/parts/home-image-button';
import { playSe } from '@/lib/audio/audio-manager';

export function HomeActionGridSection() {
  const router = useRouter();
  const buttonFrameClassName = 'h-[60px]';
  const buttonImageHeight = 70;

  const onPressRoute = (path: Parameters<typeof router.push>[0]) => {
    void playSe('tap');
    router.push(path);
  };

  return (
    <View className="mt-auto px-4 pb-8">
      <View className="rounded-xl border-2 border-[#8b0000]/70 bg-[#2f1b14]/70 p-3">
        <View className="flex-row gap-2">
          <HomeImageButton
            source={homeAssets.buttons.normalDungeon}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/stage-select')}
          />
          <HomeImageButton
            source={homeAssets.buttons.specialDungeon}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/special-dungeon')}
          />
          <HomeImageButton
            source={homeAssets.buttons.deckBuilder}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/deck-builder')}
          />
        </View>
        <View className="mt-2 flex-row gap-2">
          <HomeImageButton
            source={homeAssets.buttons.pieceCatalog}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/piece-info')}
          />
          <HomeImageButton
            source={homeAssets.buttons.gacha}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/gacha-room')}
          />
          <HomeImageButton
            source={homeAssets.buttons.pieceShop}
            frameClassName={buttonFrameClassName}
            imageHeight={buttonImageHeight}
            onPress={() => onPressRoute('/piece-shop')}
          />
        </View>
      </View>
    </View>
  );
}
