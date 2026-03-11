import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';

import type { PieceCatalogItem } from '@/domain/models/piece';

const ITEM_WIDTH = 84;
const ITEM_GAP = 4;
const LOOP_MULTIPLIER = 5;

type CarouselCell = {
  piece: PieceCatalogItem;
  rawIndex: number;
};

type PieceSwipeCarouselProps = {
  items: PieceCatalogItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onChangeEffect?: () => void;
  pieceImages: Record<string, number>;
};

export function PieceSwipeCarousel({
  items,
  selectedIndex,
  onSelectIndex,
  onChangeEffect,
  pieceImages,
}: PieceSwipeCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const ref = useRef<FlatList<CarouselCell>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const snapInterval = ITEM_WIDTH + ITEM_GAP;
  const sidePadding = Math.max((screenWidth - ITEM_WIDTH) / 2, 0);
  const baseCount = items.length;
  const isLoopable = baseCount > 1;
  const middleBlockOffset = isLoopable ? baseCount * Math.floor(LOOP_MULTIPLIER / 2) : 0;
  const listData = useMemo<CarouselCell[]>(() => {
    if (!isLoopable) return items.map((piece, rawIndex) => ({ piece, rawIndex }));
    return Array.from({ length: baseCount * LOOP_MULTIPLIER }, (_, rawIndex) => ({
      piece: items[rawIndex % baseCount] as PieceCatalogItem,
      rawIndex,
    }));
  }, [baseCount, isLoopable, items]);

  useEffect(() => {
    if (items.length === 0) return;
    ref.current?.scrollToOffset({
      offset: (middleBlockOffset + selectedIndex) * snapInterval,
      animated: false,
    });
  }, [items.length, middleBlockOffset, selectedIndex, snapInterval]);

  return (
    <Animated.FlatList
      ref={ref}
      data={listData}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(cell) => `${cell.piece.pieceId ?? cell.piece.char}-${cell.rawIndex}`}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      disableIntervalMomentum
      contentContainerStyle={{ paddingHorizontal: sidePadding }}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_GAP }} />}
      getItemLayout={(_, rawIndex) => ({
        length: snapInterval,
        offset: snapInterval * rawIndex,
        index: rawIndex,
      })}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      })}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(event) => {
        if (items.length === 0) return;
        const rawIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
        const nextIndex = ((rawIndex % baseCount) + baseCount) % baseCount;
        if (nextIndex !== selectedIndex) {
          onChangeEffect?.();
          onSelectIndex(nextIndex);
        }
        if (isLoopable) {
          const rebasedRawIndex = middleBlockOffset + nextIndex;
          if (Math.abs(rawIndex - rebasedRawIndex) > baseCount) {
            ref.current?.scrollToOffset({
              offset: rebasedRawIndex * snapInterval,
              animated: false,
            });
          }
        }
      }}
      renderItem={({ item: cell }) => {
        const source = cell.piece.imageSignedUrl
          ? { uri: cell.piece.imageSignedUrl }
          : (pieceImages[cell.piece.char] ?? null);
        const normalizedIndex = ((cell.rawIndex % baseCount) + baseCount) % baseCount;
        const inputRange = [
          (cell.rawIndex - 1) * snapInterval,
          cell.rawIndex * snapInterval,
          (cell.rawIndex + 1) * snapInterval,
        ];
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.75, 1.28, 0.75],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.45, 1, 0.45],
          extrapolate: 'clamp',
        });
        const isActive = normalizedIndex === selectedIndex;

        return (
          <Animated.View style={{ width: ITEM_WIDTH, opacity, transform: [{ scale }] }}>
            <Pressable
              onPress={() => {
                if (normalizedIndex === selectedIndex) return;
                onChangeEffect?.();
                onSelectIndex(normalizedIndex);
                ref.current?.scrollToOffset({
                  offset: cell.rawIndex * snapInterval,
                  animated: true,
                });
              }}
              className="h-20 w-[84px] items-center justify-center"
            >
              {source ? (
                <Image
                  source={source}
                  contentFit="contain"
                  style={{ width: isActive ? 88 : 62, height: isActive ? 88 : 62 }}
                />
              ) : (
                <Text className="text-3xl font-black text-[#2f1b14]">{cell.piece.char}</Text>
              )}
            </Pressable>
          </Animated.View>
        );
      }}
    />
  );
}
