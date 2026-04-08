/**
 * ノーマルダンジョン：ステージ選択のイメージ。
 * `assets/normal-dungeon/stage-previews/{ステージ名}.png` を配置し、下のマップに `require` を追加する。
 * ファイルがないステージはマップに含めない（イメージ非表示）。
 */

const PREVIEW_BY_STAGE_ID: Partial<Record<number, number>> = {
  1: require('../../assets/normal-dungeon/stage-previews/基本の森.png'),
  2: require('../../assets/normal-dungeon/stage-previews/忍者の里.png'),
  3: require('../../assets/normal-dungeon/stage-previews/大門.png'),
  4: require('../../assets/normal-dungeon/stage-previews/古城.png'),
  5: require('../../assets/normal-dungeon/stage-previews/炎のダンジョン.png'),
  6: require('../../assets/normal-dungeon/stage-previews/水のダンジョン.png'),
  7: require('../../assets/normal-dungeon/stage-previews/木のダンジョン.png'),
  8: require('../../assets/normal-dungeon/stage-previews/光のダンジョン.png'),
  9: require('../../assets/normal-dungeon/stage-previews/闇のダンジョン.png'),
  10: require('../../assets/normal-dungeon/stage-previews/古鉱山.png'),
  11: require('../../assets/normal-dungeon/stage-previews/宝島.png'),
  12: require('../../assets/normal-dungeon/stage-previews/変電所.png'),
  13: require('../../assets/normal-dungeon/stage-previews/時空の迷宮.png'),
  14: require('../../assets/normal-dungeon/stage-previews/氷の城.png'),
  15: require('../../assets/normal-dungeon/stage-previews/砂漠の遺跡.png'),
  16: require('../../assets/normal-dungeon/stage-previews/海底神殿.png'),
  17: require('../../assets/normal-dungeon/stage-previews/雲の楽園.png'),
  18: require('../../assets/normal-dungeon/stage-previews/毒の沼地.png'),
  19: require('../../assets/normal-dungeon/stage-previews/鏡の間.png'),
  20: require('../../assets/normal-dungeon/stage-previews/亜空間.png'),
  21: require('../../assets/normal-dungeon/stage-previews/闇の地下牢.png'),
  22: require('../../assets/normal-dungeon/stage-previews/高山.png'),
  23: require('../../assets/normal-dungeon/stage-previews/地底の洞窟.png'),
  24: require('../../assets/normal-dungeon/stage-previews/呪いの墓場.png'),
  25: require('../../assets/normal-dungeon/stage-previews/幻の森.png'),
  26: require('../../assets/normal-dungeon/stage-previews/月光の湖.png'),
  27: require('../../assets/normal-dungeon/stage-previews/機械都市.png'),
  28: require('../../assets/normal-dungeon/stage-previews/秘境村.png'),
  29: require('../../assets/normal-dungeon/stage-previews/竜の泉.png'),
  30: require('../../assets/normal-dungeon/stage-previews/K研究所.png'),
  31: require('../../assets/normal-dungeon/stage-previews/関ケ原.png'),
  32: require('../../assets/normal-dungeon/stage-previews/禁書庫.png'),
  34: require('../../assets/normal-dungeon/stage-previews/礼拝堂.png'),
  35: require('../../assets/normal-dungeon/stage-previews/英雄の闘技場.png'),
  36: require('../../assets/normal-dungeon/stage-previews/廃病院.png'),
  37: require('../../assets/normal-dungeon/stage-previews/蒼天の滝.png'),
  38: require('../../assets/normal-dungeon/stage-previews/奈落の入り口.png'),
  39: require('../../assets/normal-dungeon/stage-previews/鬼ヶ島.png'),
  40: require('../../assets/normal-dungeon/stage-previews/冥界の門.png'),
  41: require('../../assets/normal-dungeon/stage-previews/原始のジャングル.png'),
  42: require('../../assets/normal-dungeon/stage-previews/精神の間.png'),
  44: require('../../assets/normal-dungeon/stage-previews/フラワーガーデン.png'),
  46: require('../../assets/normal-dungeon/stage-previews/灼熱の厨房.png'),
  47: require('../../assets/normal-dungeon/stage-previews/太陽の丘.png'),
  48: require('../../assets/normal-dungeon/stage-previews/陽だまり牧場.png'),
  49: require('../../assets/normal-dungeon/stage-previews/故人の金庫.png'),
  50: require('../../assets/normal-dungeon/stage-previews/巨人島.png'),
};

export function getNormalDungeonStagePreviewSource(stageId: number): number | null {
  const src = PREVIEW_BY_STAGE_ID[stageId];
  return src ?? null;
}

/** プリロード用（バンドルに含まれるプレビュー画像すべて） */
export const normalDungeonStagePreviewPreloadTargets: number[] = Object.values(
  PREVIEW_BY_STAGE_ID,
) as number[];
