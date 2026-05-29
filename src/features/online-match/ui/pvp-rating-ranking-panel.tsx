import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import type { PvpRatingLeaderboardEntry } from '@/domain/models/pvp-rating-leaderboard';

function formatDateTime(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const date = new Date(ms);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function rankBadgeStyle(rank: number) {
  if (rank === 1) return { backgroundColor: '#fbbf24', color: '#78350f' };
  if (rank === 2) return { backgroundColor: '#d1d5db', color: '#374151' };
  if (rank === 3) return { backgroundColor: '#d97706', color: '#fff7ed' };
  return { backgroundColor: '#e5e7eb', color: '#374151' };
}

function RankingRow({ entry }: { entry: PvpRatingLeaderboardEntry }) {
  const badge = rankBadgeStyle(entry.rank);
  return (
    <View className="flex-row items-center gap-3 border-b border-[#e5e7eb] py-2">
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: badge.backgroundColor }}
      >
        <Text className="text-xs font-black" style={{ color: badge.color }}>
          {entry.rank}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-black text-[#1f2937]" numberOfLines={1}>
          {entry.displayName}
        </Text>
        {entry.title ? (
          <Text className="text-[10px] font-bold text-[#6b7280]" numberOfLines={1}>
            {entry.title}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm font-black text-[#1d4ed8]">{entry.rating}</Text>
    </View>
  );
}

export function PvpRatingRankingPanel(props: {
  entries: PvpRatingLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  nextRefreshAt: number | null;
  fromCache: boolean;
  onRefresh: () => void;
}) {
  const { entries, loading, error, fetchedAt, nextRefreshAt, fromCache, onRefresh } = props;

  return (
    <View className="rounded-2xl bg-white/95 p-4 shadow-2xl">
      <Text className="text-center text-base font-black text-[#1f2937]">レートランキング</Text>
      <Text className="mt-0.5 text-center text-[10px] font-bold text-[#6b7280]">
        上位20人（3時間ごとに更新）
      </Text>

      <View className="mt-2 rounded-lg bg-white px-2.5 py-1.5">
        <Text className="text-[10px] font-bold text-[#4b5563]">
          最終取得: {formatDateTime(fetchedAt)}
          {fromCache ? '（キャッシュ）' : ''}
        </Text>
        <Text className="text-[10px] font-bold text-[#4b5563]">
          次回更新予定: {formatDateTime(nextRefreshAt)}
        </Text>
      </View>

      {loading ? (
        <View className="my-5 items-center">
          <ActivityIndicator size="small" color="#2563eb" />
          <Text className="mt-1.5 text-xs font-bold text-[#6b7280]">読み込み中...</Text>
        </View>
      ) : error ? (
        <View className="my-4">
          <Text className="text-center text-xs font-bold text-red-600">{error}</Text>
          <Pressable
            onPress={onRefresh}
            className="mt-3 self-center rounded-lg bg-blue-600 px-3 py-1.5 active:scale-95"
          >
            <Text className="text-xs font-black text-white">再読み込み</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="mt-2 max-h-52" showsVerticalScrollIndicator nestedScrollEnabled>
          {entries.length === 0 ? (
            <Text className="py-4 text-center text-xs font-bold text-[#6b7280]">
              ランキングデータがありません
            </Text>
          ) : (
            entries.map((entry) => (
              <RankingRow key={`${entry.rank}-${entry.playerId}`} entry={entry} />
            ))
          )}
        </ScrollView>
      )}

      {!loading && !error ? (
        <Pressable
          onPress={onRefresh}
          className="mt-2 self-center rounded-lg bg-blue-600 px-3 py-1.5 active:scale-95"
        >
          <Text className="text-xs font-black text-white">今すぐ更新</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
