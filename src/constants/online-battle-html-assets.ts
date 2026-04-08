/**
 * オンライン対戦画面で画像を使うのは背景・将棋盤のみ（上部ヘッダーはテキスト／アイコン化して参照負荷を抑える）。
 */
export const onlineBattleHtmlAssets = {
  pageBackground: require('../../assets/online-battle/オンライン対戦背景.png'),
  board: require('../../assets/online-battle/将棋盤.png'),
} as const;

export const onlineBattleHtmlPreloadTargets = Object.values(onlineBattleHtmlAssets);
