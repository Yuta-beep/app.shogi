import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

type HomeImageButtonProps = {
  source: number;
  onPress: () => void;
  frameClassName?: string;
  imageWidth?: number;
  imageHeight?: number;
  overflowVisible?: boolean;
  /** 未解放・準備中など、利用不可の見た目 */
  dimmed?: boolean;
};

export function HomeImageButton({
  source,
  onPress,
  frameClassName = 'h-20',
  imageWidth,
  imageHeight,
  overflowVisible = false,
  dimmed = false,
}: HomeImageButtonProps) {
  return (
    <View className={`${frameClassName} min-w-0 flex-1 basis-0`}>
      {/* 表示ははみ出しても、タップ判定はセル内に固定する */}
      <Pressable
        onPress={onPress}
        className="h-full w-full items-center justify-center active:scale-95"
      >
        <View
          className={`h-full w-full items-center justify-center rounded-md ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          <View pointerEvents="none" className="h-full w-full items-center justify-center">
            <Image
              source={source}
              contentFit="contain"
              style={{
                width: imageWidth ?? '100%',
                height: imageHeight ?? '100%',
                maxHeight: imageHeight ?? undefined,
                opacity: dimmed ? 0.85 : 1,
              }}
            />
            {dimmed ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 rounded-md"
                style={{ backgroundColor: 'rgba(75, 85, 99, 0.28)' }}
              />
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
