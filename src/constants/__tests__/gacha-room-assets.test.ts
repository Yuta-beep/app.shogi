import {
  resolveGachaRollCode,
  toGachaRollCode,
} from '@/constants/gacha-room-assets';

describe('gacha roll code', () => {
  it('maps hiHen intro key to hihen for API', () => {
    expect(toGachaRollCode('hiHen')).toBe('hihen');
    expect(toGachaRollCode('hihen')).toBe('hihen');
  });

  it('uses API banner key when lobby includes the gacha', () => {
    const code = resolveGachaRollCode('hiHen', [{ key: 'hihen' }]);
    expect(code).toBe('hihen');
  });

  it('returns null when API lobby has gachas but not the selected one', () => {
    expect(resolveGachaRollCode('ukanmuri', [{ key: 'hihen' }])).toBeNull();
  });

  it('falls back to roll code when API lobby is empty', () => {
    expect(resolveGachaRollCode('ukanmuri', [])).toBe('ukanmuri');
  });
});
