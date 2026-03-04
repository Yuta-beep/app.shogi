import { MockLoadOnlineBattleSessionUseCase } from '@/usecases/online-battle/mock-online-battle-usecases';

describe('MockLoadOnlineBattleSessionUseCase', () => {
  it('returns defaults when opponent and rating are missing', async () => {
    const usecase = new MockLoadOnlineBattleSessionUseCase();
    const session = await usecase.execute({});

    expect(session.roomId).toBe('A12X9');
    expect(session.opponentLabel).toContain('searching...');
    expect(session.opponentLabel).toContain('(R----)');
  });

  it('reflects opponent and rating in label when provided', async () => {
    const usecase = new MockLoadOnlineBattleSessionUseCase();
    const session = await usecase.execute({ opponent: 'CPU-A', rating: '1500' });

    expect(session.opponentLabel).toBe('相手: CPU-A (R1500)');
  });
});
