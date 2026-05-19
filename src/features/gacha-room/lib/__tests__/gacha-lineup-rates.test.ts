import {
  formatGachaLineupDropRateLabel,
  formatPieceRateTextFromLineup,
  gachaLineupDropRatePercent,
} from '@/features/gacha-room/lib/gacha-lineup-rates';

describe('gacha-lineup-rates', () => {
  const lineup = [
    { char: '歩', name: '歩', rarity: 'N', weight: 45 },
    { char: '金', name: '金', rarity: 'N', weight: 25 },
    { char: '宋', name: '宋', rarity: 'UR', weight: 30 },
  ];

  it('computes drop rate percent from weight', () => {
    expect(gachaLineupDropRatePercent(lineup[0]!, 100)).toBe(45);
    expect(gachaLineupDropRatePercent(lineup[2]!, 100)).toBe(30);
  });

  it('formats per-entry label and summary text', () => {
    expect(formatGachaLineupDropRateLabel(lineup[0]!, 100)).toBe('45%');
    expect(formatPieceRateTextFromLineup(lineup)).toBe('歩45%・金25%・宋30%');
  });
});
