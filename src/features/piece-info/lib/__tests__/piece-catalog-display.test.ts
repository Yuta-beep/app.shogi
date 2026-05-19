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

  it('麒は取られ免疫をスキル欄に、移動のみを移動欄に差し替える', () => {
    const piece = catalogItem({
      char: '麒',
      pieceCode: 'piece_shop_kirin',
      skill: '旧スキル',
      move: '左右前後何マスでも移動 + 斜め1マス。金・銀・歩から取られない。',
    });
    const display = normalizePieceCatalogItemForDisplay(piece);
    expect(display.skill).toBe('「金」「銀」「歩」駒から取られない。');
    expect(display.move).toBe('前後左右に何マスでも進める。斜め4方向に1マス進める。');
    expect(display.move).not.toContain('取られない');
  });

  it('種は前斜め4方向の移動説明と銀相当のベクトルに差し替える', () => {
    const piece = catalogItem({
      char: '種',
      pieceCode: 'piece_shop_tane',
      move: '歩と同じ',
    });
    const display = normalizePieceCatalogItemForDisplay(piece);
    expect(display.move).toBe('前斜め4方向に1マス移動できる。');
    expect(display.moveVectors).toEqual([
      { dx: -1, dy: -1, maxStep: 1 },
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 1, dy: -1, maxStep: 1 },
      { dx: -1, dy: 1, maxStep: 1 },
      { dx: 1, dy: 1, maxStep: 1 },
    ]);
  });

  it('Pは同行・同列の移動不能スキル説明に差し替える', () => {
    const piece = catalogItem({
      char: 'P',
      pieceCode: 'piece_shop_p',
      skill: '旧スキル',
    });
    expect(normalizeCatalogSkillText(piece)).toBe(
      'この駒と同じ行または同じ列にいる敵駒を移動不能にする（「王」「巨」は除く）。',
    );
  });

  it('鳴はポン取りのスキル説明に差し替える', () => {
    const piece = catalogItem({
      char: '鳴',
      pieceCode: 'piece_shop_naku',
      skill: '旧スキル',
    });
    expect(normalizeCatalogSkillText(piece)).toBe(
      '敵駒を取ったとき、それと同じ敵駒が盤面にあと2体以上いる場合、合計3体までまとめて取る。',
    );
  });

  it('種は20%で葉召喚のスキル説明に差し替える', () => {
    const piece = catalogItem({
      char: '種',
      pieceCode: 'piece_shop_tane',
      skill: '移動時30%で周囲に「葉」を召喚する。',
    });
    expect(normalizeCatalogSkillText(piece)).toBe(
      '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「葉」駒を召喚する。',
    );
    expect(normalizePieceCatalogItemForDisplay(piece).skill).toBe(
      '移動時20%の確率で、周囲8マスのランダムな空きマス1マスに「葉」駒を召喚する。',
    );
  });

  it('走は前方最大2マスの移動説明に差し替える', () => {
    const piece = catalogItem({
      char: '走',
      pieceCode: 'piece_shop_so',
      move: '縦横1マス',
    });
    const display = normalizePieceCatalogItemForDisplay(piece);
    expect(display.move).toBe(
      '前方に最大2マス進める。1マス目に駒がある場合は2マス目には進めない。',
    );
    expect(display.moveVectors).toEqual([
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: 0, dy: -2, maxStep: 1 },
    ]);
  });

  it('舞は移動制限スキルをスキル欄に、金相当の移動のみを移動欄に差し替える', () => {
    const piece = catalogItem({
      char: '舞',
      pieceCode: 'piece_shop_mai',
      skill: '旧スキル',
      move: '金と同じ移動範囲。周囲8マスの敵駒の移動範囲を斜め前1マスのみに制限する。',
    });
    const display = normalizePieceCatalogItemForDisplay(piece);
    expect(display.skill).toBe(
      '移動時、その時点で周囲8マスにいる敵駒の移動範囲を斜め前1マスのみに制限する。',
    );
    expect(display.move).toBe('前・前斜め左右・左右・後に各1マス進める。');
    expect(display.move).not.toContain('制限');
    expect(display.moveVectors).toHaveLength(6);
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
