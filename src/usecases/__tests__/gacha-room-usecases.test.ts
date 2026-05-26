import { resetGachaMockStore } from '@/features/gacha-room/lib/gacha-mock-store';
import {
  MockLoadGachaLobbyUseCase,
  MockRollGachaUseCase,
} from '@/usecases/gacha-room/mock-gacha-room-usecases';

describe('gacha room usecases', () => {
  beforeEach(() => {
    resetGachaMockStore();
  });

  it('loads gacha banners, wallet, and history', async () => {
    const usecase = new MockLoadGachaLobbyUseCase();
    const snapshot = await usecase.execute();

    expect(snapshot.banners).toHaveLength(4);
    expect(snapshot.pawnCurrency).toBe(3000);
    expect(snapshot.goldCurrency).toBe(20);
    expect(snapshot.history).toEqual([]);
  });

  it('rolls ukanmuri currency pawn from weighted table', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const usecase = new MockRollGachaUseCase();
    const result = await usecase.execute({ gachaId: 'ukanmuri' });

    expect(result.type).toBe('miss');
    if (result.type === 'miss') {
      expect(result.currency).toBe('pawn');
      expect(result.amount).toBe(2);
      expect(result.pawnCurrency).toBe(3000 - 10 + 2);
    }
    randomSpy.mockRestore();
  });

  it('grants duplicate gold when collectible piece is already owned', async () => {
    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01);
    const usecase = new MockRollGachaUseCase();

    const first = await usecase.execute({ gachaId: 'ukanmuri' });
    expect(first.type).toBe('hit');
    if (first.type === 'hit') {
      expect(first.alreadyOwned).toBe(false);
    }

    const second = await usecase.execute({ gachaId: 'ukanmuri' });
    expect(second.type).toBe('hit');
    if (second.type === 'hit') {
      expect(second.alreadyOwned).toBe(true);
      expect(second.duplicateGoldGranted).toBe(1);
      expect(second.goldCurrency).toBe(21);
    }
    randomSpy.mockRestore();
  });
});
