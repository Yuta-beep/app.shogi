/** 対人対戦レートランキング（上位プレイヤー） */
export type PvpRatingLeaderboardEntry = {
  rank: number;
  playerId: string;
  displayName: string;
  rating: number;
  title?: string | null;
};

export type PvpRatingLeaderboardSnapshot = {
  entries: PvpRatingLeaderboardEntry[];
  /** サーバー側の集計時刻（API 応答）。モックでは取得時刻 */
  snapshotAt: string;
};
