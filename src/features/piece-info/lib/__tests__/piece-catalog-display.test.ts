import {
  normalizeCatalogSkillText,
  normalizePieceCatalogItemForDisplay,
} from '@/features/piece-info/lib/piece-catalog-display';
import type { PieceCatalogItem } from '@/domain/models/piece';

function catalogItem(overrides: Partial<PieceCatalogItem>): PieceCatalogItem {
  return {
    char: '歩',
    name: '歩兵',
    unlock: '初期',
    desc: '',
    skill: 'なし',
    move: '前方1マス',
    moveVectors: [],
    isRepeatable: false,
    ...overrides,
  };
}

describe('piece-catalog-display', () => {
  it('岩はカタログのスキル文言をそのまま使う', () => {
    const piece = catalogItem({
      char: '岩',
      name: '岩山',
      skill: '移動時左右に岩の障害物を配置する。',
      move: '前後左右に1マスずつ移動できる。',
    });
    expect(normalizeCatalogSkillText(piece)).toBe('移動時左右に岩の障害物を配置する。');
    expect(normalizePieceCatalogItemForDisplay(piece).move).toBe('前後左右に1マスずつ移動できる。');
  });

  it('凹は図鑑用の移動説明に差し替える', () => {
    const piece = catalogItem({
      char: '凹',
      skill: '旧説明',
      move: '旧移動',
    });
    const display = normalizePieceCatalogItemForDisplay(piece);
    expect(display.skill).toBe('なし。');
    expect(display.move).toContain('斜め前・左右・後ろ');
    expect(display.moveVectors.length).toBeGreaterThan(0);
  });
});
