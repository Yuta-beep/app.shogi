describe('Frontend dependency boundary', () => {
  it('does not export legacy piece conversion helpers from the stage battle contract', () => {
    const frontendModules = require('@/usecases/stage-battle/game-move-contract');
    expect((frontendModules as Record<string, unknown>).convertPieceCode).toBeUndefined();
    expect((frontendModules as Record<string, unknown>).parseSfen).toBeUndefined();
  });
});
