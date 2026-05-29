import { ApiClientError } from '@/infra/http/api-client';
import {
  ensureNormalStageStaminaCharged,
  mergeServerHomeStamina,
  resetMockStaminaState,
  resetPendingClientStaminaDeduction,
} from '@/lib/stamina/spend-stage-stamina';

const mockSnapshot = {
  playerName: 'Test',
  rating: 0,
  pawnCurrency: 0,
  goldCurrency: 0,
  playerRank: 1,
  playerExp: 0,
  stamina: 50,
  maxStamina: 50,
  nextRecoveryAt: null as string | null,
};

jest.mock('@/lib/config/data-source', () => ({
  isApiDataSource: jest.fn(() => true),
}));

jest.mock('@/hooks/common/home-snapshot-store', () => ({
  getHomeSnapshotState: () => ({ snapshot: mockSnapshot, isLoading: false, error: null }),
  patchHomeSnapshotStamina: (next: { stamina: number; nextRecoveryAt: string | null }) => {
    mockSnapshot.stamina = next.stamina;
    mockSnapshot.nextRecoveryAt = next.nextRecoveryAt;
  },
}));

describe('ensureNormalStageStaminaCharged', () => {
  beforeEach(() => {
    resetPendingClientStaminaDeduction();
    resetMockStaminaState(50);
    mockSnapshot.stamina = 50;
    mockSnapshot.nextRecoveryAt = null;
  });

  it('spends 5 when BFF did not deduct (e.g. stage 1 stamina_cost=0)', () => {
    ensureNormalStageStaminaCharged(50);
    expect(mockSnapshot.stamina).toBe(45);
  });

  it('does not double-spend when BFF already deducted 5', () => {
    mockSnapshot.stamina = 45;
    ensureNormalStageStaminaCharged(50);
    expect(mockSnapshot.stamina).toBe(45);
  });

  it('throws when remaining stamina is insufficient', () => {
    resetMockStaminaState(2);
    mockSnapshot.stamina = 2;
    expect(() => ensureNormalStageStaminaCharged(2)).toThrow(ApiClientError);
  });
});

describe('mergeServerHomeStamina', () => {
  beforeEach(() => {
    resetPendingClientStaminaDeduction();
    mockSnapshot.stamina = 50;
  });

  it('keeps client deduction when server still reports pre-battle stamina', () => {
    ensureNormalStageStaminaCharged(50);
    const merged = mergeServerHomeStamina({ ...mockSnapshot, stamina: 50 });
    expect(merged.stamina).toBe(45);
  });

  it('clears pending when server reflects stamina spend', () => {
    ensureNormalStageStaminaCharged(50);
    const merged = mergeServerHomeStamina({ ...mockSnapshot, stamina: 45 });
    expect(merged.stamina).toBe(45);
    expect(mergeServerHomeStamina({ ...mockSnapshot, stamina: 50 }).stamina).toBe(50);
  });
});
