describe('create stage battle usecases', () => {
  const loadModule = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/usecases/stage-battle/create-stage-battle-usecases');
  };

  afterEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_DATA_SOURCE;
  });

  it('returns local implementations in api mode', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'api';
    jest.doMock('@/lib/supabase/supabase-client', () => ({
      supabase: {
        auth: {
          getSession: jest.fn(),
        },
      },
    }));
    const mod = loadModule();

    expect(mod.createPrepareStageBattleUseCase().constructor.name).toBe(
      'LocalPrepareStageBattleUseCase',
    );
    expect(mod.createClaimStageClearRewardUseCase().constructor.name).toBe(
      'LocalClaimStageClearRewardUseCase',
    );
  });

  it('returns mock implementations in local mode', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'local';
    jest.doMock('@/lib/supabase/supabase-client', () => ({
      supabase: {
        auth: {
          getSession: jest.fn(),
        },
      },
    }));
    const mod = loadModule();

    expect(mod.createPrepareStageBattleUseCase().constructor.name).toBe(
      'MockPrepareStageBattleUseCase',
    );
    expect(mod.createClaimStageClearRewardUseCase().constructor.name).toBe(
      'MockClaimStageClearRewardUseCase',
    );
  });
});
