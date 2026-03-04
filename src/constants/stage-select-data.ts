export type StageRange = {
  page: number;
  label: string;
  start: number;
  end: number;
  height: number;
};

export type StageNodeData = {
  id: number;
  name: string;
  page: number;
  top: number;
  left: number;
  color: string;
  unlockPieces: string[];
};

const stageNames = [
  '基本の森', '忍者の里', '大門', '古城', '炎のダンジョン', '水のダンジョン', '木のダンジョン',
  '光のダンジョン', '闇のダンジョン', '古鉱山', '宝島', '変電所', '時空の迷宮',
  '氷の城', '砂漠の遺跡', '海底神殿', '雲の楽園', '毒の沼地',
  '鏡の間', '亜空間', '闇の地下牢', '高山', '地底の洞窟',
  '呪いの墓場', '幻の森', '月光の湖', '機械都市', '秘境村',
  '竜の泉', 'K研究所', '関ケ原', '禁書庫', 'パラレルワールド1', '礼拝堂', '英雄の闘技場',
  '廃病院', '蒼天の滝', '奈落の入り口', '鬼ヶ島', '冥界の門', '原始のジャングル', '精神の間',
  'パラレルワールド2', 'フラワーガーデン', 'でこぼこ', '灼熱の厨房', '太陽の丘', '陽だまり牧場', '故人の金庫', '巨人島',
] as const;

const cumulativePieces: Record<number, string[]> = {
  1: [],
  2: ['忍', '影', '砲'],
  3: ['忍', '影', '砲'],
  4: ['忍', '影', '砲', '竜', '鳳'],
  5: ['忍', '影', '砲', '竜', '鳳', '炎', '火'],
  6: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波'],
  7: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉'],
  8: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星'],
  9: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔'],
  10: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛'],
  11: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝'],
  12: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝', '電', '雷'],
  13: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝', '電', '雷', '時'],
  14: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝', '電', '雷', '時', '氷', '雪'],
  15: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝', '電', '雷', '時', '氷', '雪', '砂', '風'],
  16: ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉', '光', '星', '闇', '魔', '銅', '鉄', '錫', '鉛', '宝', '電', '雷', '時', '氷', '雪', '砂', '風', '苔', '魚'],
  17: ['雲', '虹'],
  18: ['毒', '沼'],
  19: ['鏡', '映'],
  20: ['あ'],
  21: ['牢', '柵'],
  22: ['嶺', '峰', '山'],
  23: ['岩', '鉱'],
  24: ['霊', '墓'],
  25: ['幻', '霧'],
  26: ['月', '舟'],
  27: ['機', '歯'],
  28: ['家', '民', '畑'],
  29: ['泉'],
  30: ['K', '実', '異'],
  31: ['刀', '鎧', '銃'],
  32: ['書', '封'],
  33: ['轟', '犇'],
  34: ['礼', '聖'],
  35: ['剣', '盾'],
  36: ['病', '薬'],
  37: ['滝'],
  38: ['穴', '淵'],
  39: ['鬼'],
  40: ['朧', '死', '魂'],
  41: ['獣', '禽'],
  42: ['悟', '心'],
  43: ['鬱', '乙'],
  44: ['薔', '菊', '桜'],
  45: ['凹', '凸'],
  46: ['焼', '炒', '煮'],
  47: ['陽', '陰'],
  48: ['牛', '豚', '鶏'],
  49: ['銭', '財'],
  50: ['巨'],
};

const positions: Record<number, { top: number; left: number }> = {
  1: { top: 1840, left: -5 }, 2: { top: 1720, left: 48 }, 3: { top: 1600, left: 70 }, 4: { top: 1440, left: 68 },
  5: { top: 1280, left: 57 }, 6: { top: 1120, left: 35 }, 7: { top: 960, left: 24 }, 8: { top: 800, left: 39 },
  9: { top: 660, left: 55 }, 10: { top: 450, left: 67 }, 11: { top: 320, left: 68 }, 12: { top: 160, left: 50 },
  13: { top: 500, left: 42 }, 14: { top: 667, left: 51 }, 15: { top: 833, left: 67 }, 16: { top: 1000, left: 68 },
  17: { top: 1167, left: 56 }, 18: { top: 1333, left: 40 }, 19: { top: 1500, left: 24 }, 20: { top: 1667, left: 36 },
  21: { top: 1833, left: 47 }, 22: { top: 2000, left: 57 }, 23: { top: 2167, left: 68 }, 24: { top: 2333, left: 58 },
  25: { top: 92, left: 45 }, 26: { top: 323, left: 65 }, 27: { top: 554, left: 68 }, 28: { top: 785, left: 47 },
  29: { top: 1015, left: 38 }, 30: { top: 1246, left: 28 }, 31: { top: 1477, left: 50 }, 32: { top: 1708, left: 59 },
  33: { top: 1938, left: 61 }, 34: { top: 2169, left: 48 }, 35: { top: 2400, left: 30 },
  36: { top: 1900, left: 17 }, 37: { top: 1733, left: 30 }, 38: { top: 1567, left: 45 }, 39: { top: 1400, left: 63 },
  40: { top: 1233, left: 55 }, 41: { top: 1067, left: 45 }, 42: { top: 733, left: 24 },
  43: { top: 1800, left: 22 }, 44: { top: 1600, left: 22 }, 45: { top: 1400, left: 47 }, 46: { top: 1200, left: 51 },
  47: { top: 1000, left: 61 }, 48: { top: 800, left: 38 }, 49: { top: 600, left: 26 }, 50: { top: 400, left: 33 },
};

const colors: Record<number, string> = {
  1: '#2e7d32', 2: '#6a1b9a', 3: '#c62828', 4: '#1565c0', 5: '#ff8f00', 6: '#212121', 7: '#4527a0', 8: '#8b4513',
  9: '#757575', 10: '#006064', 11: '#ffa500', 12: '#8b4513', 13: '#1565c0', 14: '#0891b2', 15: '#ca8a04',
  16: '#0f766e', 17: '#0284c7', 18: '#166534', 19: '#3b82f6', 20: '#6b21a8', 21: '#059669', 22: '#b45309',
  23: '#334155', 24: '#57534e', 25: '#6d28d9', 26: '#a21caf', 27: '#c2410c', 28: '#15803d', 29: '#0891b2',
  30: '#991b1b', 31: '#7f1d1d', 32: '#78350f', 33: '#581c87', 34: '#ca8a04', 35: '#92400e', 36: '#1e1b4b',
  37: '#9d174d', 38: '#115e59', 39: '#9f1239', 40: '#4d7c0f', 41: '#86198f', 42: '#92400e', 43: '#7f1d1d',
  44: '#312e81', 45: '#14532d', 46: '#854d0e', 47: '#78350f', 48: '#334155', 49: '#581c87', 50: '#be185d',
};

export const stageRanges: StageRange[] = [
  { page: 1, label: 'ステージ 1-12', start: 1, end: 12, height: 2200 },
  { page: 2, label: 'ステージ 13-24', start: 13, end: 24, height: 2500 },
  { page: 3, label: 'ステージ 25-35', start: 25, end: 35, height: 2600 },
  { page: 4, label: 'ステージ 36-42', start: 36, end: 42, height: 2200 },
  { page: 5, label: 'ステージ 43-50', start: 43, end: 50, height: 2200 },
] as const;

export const stageSelectBackgrounds = {
  1: require('../../assets/stage-select/backgrounds/wasteland-1.png'),
  2: require('../../assets/stage-select/backgrounds/wasteland-2.png'),
  3: require('../../assets/stage-select/backgrounds/wasteland-3.png'),
  4: require('../../assets/stage-select/backgrounds/wasteland-4.png'),
  5: require('../../assets/stage-select/backgrounds/wasteland-5.png'),
} as const;

function pageForStage(stage: number): number {
  if (stage <= 12) return 1;
  if (stage <= 24) return 2;
  if (stage <= 35) return 3;
  if (stage <= 42) return 4;
  return 5;
}

function newUnlockPieces(stage: number): string[] {
  const current = cumulativePieces[stage] ?? [];
  const prev = cumulativePieces[stage - 1] ?? [];
  return current.filter((piece) => !prev.includes(piece));
}

export const stageNodes: StageNodeData[] = stageNames.map((name, index) => {
  const id = index + 1;

  return {
    id,
    name,
    page: pageForStage(id),
    top: positions[id].top,
    left: positions[id].left,
    color: colors[id],
    unlockPieces: newUnlockPieces(id),
  };
});
