import type { PvpRatingLeaderboardSnapshot } from '@/domain/models/pvp-rating-leaderboard';
import { PVP_RATING_LEADERBOARD_LIMIT } from '@/lib/online-match/pvp-rating-leaderboard-cache';
import { createLoadPvpRatingLeaderboardRunner } from '@/usecases/pvp-rating/load-pvp-rating-leaderboard-usecase';

const MOCK_NAMES = [
  '棋聖サクラ',
  '将棋の虎',
  '盤上の風',
  '駒舞う者',
  '玉座の守人',
  '飛車使い',
  '角行の影',
  '歩兵長',
  '桂馬疾走',
  '銀盾',
  '金将閣下',
  '香車の旅人',
  '竜王候',
  '鳳凰手',
  '麒麟眼',
  '玄武陣',
  '朱雀翼',
  '白虎牙',
  '青龍爪',
  '黒曜将',
] as const;

function buildMockSnapshot(): PvpRatingLeaderboardSnapshot {
  const now = new Date().toISOString();
  const entries = MOCK_NAMES.map((displayName, index) => {
    const rank = index + 1;
    return {
      rank,
      playerId: `mock-player-${rank}`,
      displayName,
      rating: 3200 - index * 87 - (index % 3) * 11,
      title: rank <= 3 ? `称号${rank}` : null,
    };
  });
  return {
    entries: entries.slice(0, PVP_RATING_LEADERBOARD_LIMIT),
    snapshotAt: now,
  };
}

export const mockLoadPvpRatingLeaderboardUseCase = createLoadPvpRatingLeaderboardRunner(async () =>
  buildMockSnapshot(),
);
