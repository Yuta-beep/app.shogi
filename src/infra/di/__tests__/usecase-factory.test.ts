import {
  createDeleteDeckUseCase,
  createLoadDeckBuilderUseCase,
  createLoadHomeSnapshotUseCase,
  createLoadPieceCatalogUseCase,
  createLoadShopCatalogUseCase,
  createLoadStageSelectUseCase,
  createPrepareStageBattleUseCase,
  createPurchaseShopItemUseCase,
  createSaveDeckUseCase,
  createSelectStageUseCase,
} from '@/infra/di/usecase-factory';
import { ApiLoadDeckBuilderUseCase } from '@/usecases/deck-builder/api-deck-builder-usecases';
import {
  ApiDeleteDeckUseCase,
  ApiSaveDeckUseCase,
} from '@/usecases/deck-builder/api-deck-builder-mutation-usecases';
import { MockLoadDeckBuilderUseCase } from '@/usecases/deck-builder/mock-deck-builder-usecases';
import {
  MockDeleteDeckUseCase,
  MockSaveDeckUseCase,
} from '@/usecases/deck-builder/mock-deck-builder-mutation-usecases';
import { ApiLoadHomeSnapshotUseCase } from '@/usecases/home/api-home-usecases';
import { MockLoadHomeSnapshotUseCase } from '@/usecases/home/mock-home-usecases';
import { ApiLoadPieceCatalogUseCase } from '@/usecases/piece-info/api-piece-info-usecases';
import { MockLoadPieceCatalogUseCase } from '@/usecases/piece-info/mock-piece-info-usecases';
import {
  ApiLoadShopCatalogUseCase,
  ApiPurchaseShopItemUseCase,
} from '@/usecases/piece-shop/api-piece-shop-usecases';
import {
  MockLoadShopCatalogUseCase,
  MockPurchaseShopItemUseCase,
} from '@/usecases/piece-shop/mock-piece-shop-usecases';
import { ApiPrepareStageBattleUseCase } from '@/usecases/stage-battle/api-stage-battle-usecases';
import { MockPrepareStageBattleUseCase } from '@/usecases/stage-battle/mock-stage-battle-usecases';
import {
  ApiLoadStageSelectUseCase,
  ApiSelectStageUseCase,
} from '@/usecases/stage-select/api-stage-select-usecases';
import {
  MockLoadStageSelectUseCase,
  MockSelectStageUseCase,
} from '@/usecases/stage-select/mock-stage-select-usecases';

jest.mock('@/lib/supabase/supabase-client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {},
  },
}));

describe('usecase-factory', () => {
  const originalDataSource = process.env.EXPO_PUBLIC_DATA_SOURCE;

  afterEach(() => {
    if (originalDataSource === undefined) {
      delete process.env.EXPO_PUBLIC_DATA_SOURCE;
      return;
    }
    process.env.EXPO_PUBLIC_DATA_SOURCE = originalDataSource;
  });

  it('mockモードでは全てMock実装を返す', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'mock';

    expect(createLoadHomeSnapshotUseCase()).toBeInstanceOf(MockLoadHomeSnapshotUseCase);
    expect(createLoadStageSelectUseCase()).toBeInstanceOf(MockLoadStageSelectUseCase);
    expect(createSelectStageUseCase()).toBeInstanceOf(MockSelectStageUseCase);
    expect(createPrepareStageBattleUseCase()).toBeInstanceOf(MockPrepareStageBattleUseCase);
    expect(createLoadPieceCatalogUseCase()).toBeInstanceOf(MockLoadPieceCatalogUseCase);
    expect(createLoadShopCatalogUseCase()).toBeInstanceOf(MockLoadShopCatalogUseCase);
    expect(createPurchaseShopItemUseCase()).toBeInstanceOf(MockPurchaseShopItemUseCase);
    expect(createLoadDeckBuilderUseCase('token')).toBeInstanceOf(MockLoadDeckBuilderUseCase);
    expect(createSaveDeckUseCase('token')).toBeInstanceOf(MockSaveDeckUseCase);
    expect(createDeleteDeckUseCase('token')).toBeInstanceOf(MockDeleteDeckUseCase);
  });

  it('apiモードではtoken不要のusecaseはAPI実装を返す', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'api';

    expect(createLoadHomeSnapshotUseCase()).toBeInstanceOf(ApiLoadHomeSnapshotUseCase);
    expect(createLoadStageSelectUseCase()).toBeInstanceOf(ApiLoadStageSelectUseCase);
    expect(createSelectStageUseCase()).toBeInstanceOf(ApiSelectStageUseCase);
    expect(createPrepareStageBattleUseCase()).toBeInstanceOf(ApiPrepareStageBattleUseCase);
    expect(createLoadPieceCatalogUseCase()).toBeInstanceOf(ApiLoadPieceCatalogUseCase);
    expect(createLoadShopCatalogUseCase()).toBeInstanceOf(ApiLoadShopCatalogUseCase);
    expect(createPurchaseShopItemUseCase()).toBeInstanceOf(ApiPurchaseShopItemUseCase);
  });

  it('apiモードでもdeck-builder系はtokenなしならMock実装を返す', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'api';

    expect(createLoadDeckBuilderUseCase()).toBeInstanceOf(MockLoadDeckBuilderUseCase);
    expect(createSaveDeckUseCase()).toBeInstanceOf(MockSaveDeckUseCase);
    expect(createDeleteDeckUseCase()).toBeInstanceOf(MockDeleteDeckUseCase);
  });

  it('apiモードかつtokenありならdeck-builder系はAPI実装を返す', () => {
    process.env.EXPO_PUBLIC_DATA_SOURCE = 'api';

    expect(createLoadDeckBuilderUseCase('token-123')).toBeInstanceOf(ApiLoadDeckBuilderUseCase);
    expect(createSaveDeckUseCase('token-123')).toBeInstanceOf(ApiSaveDeckUseCase);
    expect(createDeleteDeckUseCase('token-123')).toBeInstanceOf(ApiDeleteDeckUseCase);
  });
});
