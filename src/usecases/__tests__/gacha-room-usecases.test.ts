import { MockLoadGachaLobbyUseCase, MockRollGachaUseCase } from '@/usecases/gacha-room/mock-gacha-room-usecases';

describe('gacha room usecases', () => {
  it('loads gacha banners, wallet, and history', async () => {
    const usecase = new MockLoadGachaLobbyUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.banners).toHaveLength(4);
    expect(snapshot.pawnCurrency).toBe(3000);
    expect(snapshot.goldCurrency).toBe(20);
    expect(snapshot.history).toEqual(['UR 爆', 'SSR 宇', 'R 安']);
  });

  it('returns a deterministic UI-only roll result', async () => {
    const usecase = new MockRollGachaUseCase();
    const result = await usecase.execute({ gachaId: 'ukanmuri' });

    expect(result).toEqual({
      success: true,
      label: 'UI_ONLY ukanmuri',
    });
  });
});
