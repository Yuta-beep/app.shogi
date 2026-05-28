import {
  DECK_REQUIRED_UI_CELLS,
  isDeckRequiredFormationComplete,
  listEmptyRequiredDeckCells,
} from '@/features/deck-builder/lib/deck-builder-required-cells';

describe('deck-builder-required-cells', () => {
  it('必須マスは7段全筋・8段2筋8筋・9段全筋（UI座標）', () => {
    const keys = new Set(DECK_REQUIRED_UI_CELLS.map((c) => `${c.row}:${c.col}`));
    expect(keys.size).toBe(20);
    for (let col = 0; col < 9; col += 1) {
      expect(keys.has(`6:${col}`)).toBe(true);
      expect(keys.has(`8:${col}`)).toBe(true);
    }
    expect(keys.has('7:1')).toBe(true);
    expect(keys.has('7:7')).toBe(true);
    expect(keys.has('7:4')).toBe(false);
  });

  it('必須マスがすべて埋まっているときのみ完成', () => {
    const full = DECK_REQUIRED_UI_CELLS.map((cell) => ({ row: cell.row, col: cell.col }));
    expect(isDeckRequiredFormationComplete(full)).toBe(true);
    expect(listEmptyRequiredDeckCells(full)).toEqual([]);
  });

  it('必須マスが1つでも空なら未完成', () => {
    const almost = DECK_REQUIRED_UI_CELLS.filter((c) => !(c.row === 8 && c.col === 4)).map(
      (cell) => ({ row: cell.row, col: cell.col }),
    );
    expect(isDeckRequiredFormationComplete(almost)).toBe(false);
    expect(listEmptyRequiredDeckCells(almost)).toEqual([{ row: 8, col: 4 }]);
  });
});
