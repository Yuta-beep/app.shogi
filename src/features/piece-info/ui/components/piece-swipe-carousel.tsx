import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';

import type { PieceCatalogItem } from '@/domain/models/piece';

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
  itemWidth?: number;
  itemGap?: number;
  cellHeight?: number;
  activeImageSize?: number;
  inactiveImageSize?: number;
  activeScale?: number;
  inactiveScale?: number;
};

export function PieceSwipeCarousel({
  items,
  selectedIndex,
  onSelectIndex,
  onChangeEffect,
  pieceImages,
  itemWidth = 84,
  itemGap = 4,
  cellHeight = 80,
  activeImageSize = 88,
  inactiveImageSize = 62,
  activeScale = 1.28,
  inactiveScale = 0.75,
}: PieceSwipeCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const ref = useRef<FlatList<CarouselCell>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const snapInterval = itemWidth + itemGap;
  const sidePadding = Math.max((screenWidth - itemWidth) / 2, 0);
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
  const latestSelectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    latestSelectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  function normalizedIndexFromOffset(offsetX: number) {
    if (baseCount === 0) return 0;
    const rawIndex = Math.round(offsetX / snapInterval);
    return ((rawIndex % baseCount) + baseCount) % baseCount;
  }

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
      contentContainerStyle={{ paddingHorizontal: sidePadding }}
      ItemSeparatorComponent={() => <View style={{ width: itemGap }} />}
      getItemLayout={(_, rawIndex) => ({
        length: snapInterval,
        offset: snapInterval * rawIndex,
        index: rawIndex,
      })}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (event: { nativeEvent: { contentOffset: { x: number } } }) => {
          if (baseCount === 0) return;
          const nextIndex = normalizedIndexFromOffset(event.nativeEvent.contentOffset.x);
          if (nextIndex !== latestSelectedIndexRef.current) {
            latestSelectedIndexRef.current = nextIndex;
            onSelectIndex(nextIndex);
          }
        },
      })}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(event) => {
        if (items.length === 0) return;
        const rawIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
        const nextIndex = ((rawIndex % baseCount) + baseCount) % baseCount;
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
          outputRange: [inactiveScale, activeScale, inactiveScale],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.45, 1, 0.45],
          extrapolate: 'clamp',
        });
        const isActive = normalizedIndex === selectedIndex;
        const resolvedOpacity = isActive ? 1 : opacity;

        return (
          <Animated.View
            style={{ width: itemWidth, opacity: resolvedOpacity, transform: [{ scale }] }}
          >
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
              className="items-center justify-center"
              style={{ width: itemWidth, height: cellHeight }}
            >
              {source ? (
                <Image
                  source={source}
                  contentFit="contain"
                  style={{
                    width: isActive ? activeImageSize : inactiveImageSize,
                    height: isActive ? activeImageSize : inactiveImageSize,
                  }}
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
