import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import {
  formatGachaLineupDropRateLabel,
  gachaLineupWeightTotal,
} from '@/features/gacha-room/lib/gacha-lineup-rates';
import { resolvePieceImageSource } from '@/lib/piece-image';
import type { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'SSR':
      return '#f0c040';
    case 'UR':
      return '#c084fc';
    case 'SR':
      return '#60a5fa';
    case 'R':
      return '#34d399';
    default:
      return '#94a3b8';
  }
}

type GachaLineupSectionProps = {
  banner: GachaBanner | undefined;
};

export function GachaLineupSection({ banner }: GachaLineupSectionProps) {
  const lineup = banner?.lineup ?? [];
  const totalWeight = gachaLineupWeightTotal(lineup);

  return (
    <View className="mb-4 rounded-xl border border-white/15 bg-white/10 p-4">
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="info" size={20} color="#bfdbfe" />
        <Text className="text-lg font-semibold text-white">ガチャ内容</Text>
      </View>

      {banner?.rareRateText ? (
        <Text className="mt-2 text-xs font-semibold text-amber-200/90">{banner.rareRateText}</Text>
      ) : null}

      {lineup.length === 0 ? (
        <Text className="mt-3 text-sm text-slate-300">
          {banner?.pieceRateText?.trim()
            ? banner.pieceRateText
            : '排出内容を読み込めませんでした。'}
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {lineup.map((entry, index) => {
            const imageSource = resolvePieceImageSource({ char: entry.char, name: entry.name });
            const rateLabel = formatGachaLineupDropRateLabel(entry, totalWeight);
            return (
              <View
                key={`${entry.char}-${entry.name}-${index}`}
                className="flex-row gap-3 rounded-lg border border-white/10 bg-black/20 px-2 py-2"
              >
                <View className="h-14 w-14 items-center justify-center">
                  {imageSource ? (
                    <Image
                      source={imageSource}
                      contentFit="contain"
                      style={{ width: 52, height: 52 }}
                    />
                  ) : (
                    <Text className="text-2xl font-black text-white">{entry.char}</Text>
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 font-semibold text-white">
                      {entry.name}
                      <Text
                        style={{ color: rarityColor(entry.rarity) }}
                      >{`（${entry.rarity}）`}</Text>
                    </Text>
                    <View className="rounded-full bg-amber-500/25 px-2.5 py-0.5">
                      <Text className="text-xs font-black text-amber-100">{rateLabel}</Text>
                    </View>
                  </View>
                  {typeof entry.description === 'string' && entry.description.trim().length > 0 ? (
                    <Text className="mt-1 text-xs leading-5 text-slate-300/90">
                      {entry.description.trim()}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
