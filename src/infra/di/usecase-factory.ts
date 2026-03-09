import { ApiLoadHomeSnapshotUseCase } from '@/usecases/home/api-home-usecases';
import { MockLoadHomeSnapshotUseCase } from '@/usecases/home/mock-home-usecases';
import { LoadHomeSnapshotUseCase } from '@/usecases/home/load-home-snapshot-usecase';
import { ApiHomeRepository } from '@/infra/repositories/home-repository';
import { HomeSupabaseDataSource } from '@/infra/datasources/home-supabase-datasource';
import { ApiLoadPieceCatalogUseCase } from '@/usecases/piece-info/api-piece-info-usecases';
import { MockLoadPieceCatalogUseCase } from '@/usecases/piece-info/mock-piece-info-usecases';
import { LoadPieceCatalogUseCase } from '@/usecases/piece-info/load-piece-catalog-usecase';
import { ApiLoadShopCatalogUseCase, ApiPurchaseShopItemUseCase } from '@/usecases/piece-shop/api-piece-shop-usecases';
import { MockLoadShopCatalogUseCase, MockPurchaseShopItemUseCase } from '@/usecases/piece-shop/mock-piece-shop-usecases';
import { LoadShopCatalogUseCase } from '@/usecases/piece-shop/load-shop-catalog-usecase';
import { PurchaseShopItemUseCase } from '@/usecases/piece-shop/purchase-shop-item-usecase';
import { ApiPrepareStageBattleUseCase } from '@/usecases/stage-battle/api-stage-battle-usecases';
import { MockPrepareStageBattleUseCase } from '@/usecases/stage-battle/mock-stage-battle-usecases';
import { PrepareStageBattleUseCase } from '@/usecases/stage-battle/prepare-stage-battle-usecase';
import { ApiLoadStageSelectUseCase, ApiSelectStageUseCase } from '@/usecases/stage-select/api-stage-select-usecases';
import { LoadStageSelectUseCase } from '@/usecases/stage-select/load-stage-select-usecase';
import { MockLoadStageSelectUseCase, MockSelectStageUseCase } from '@/usecases/stage-select/mock-stage-select-usecases';
import { SelectStageUseCase } from '@/usecases/stage-select/select-stage-usecase';

function shouldUseApi() {
  return process.env.EXPO_PUBLIC_DATA_SOURCE === 'api';
}

export function createLoadHomeSnapshotUseCase(): LoadHomeSnapshotUseCase {
  return shouldUseApi()
    ? new ApiLoadHomeSnapshotUseCase(new ApiHomeRepository(new HomeSupabaseDataSource()))
    : new MockLoadHomeSnapshotUseCase();
}

export function createLoadStageSelectUseCase(): LoadStageSelectUseCase {
  return shouldUseApi() ? new ApiLoadStageSelectUseCase() : new MockLoadStageSelectUseCase();
}

export function createSelectStageUseCase(): SelectStageUseCase {
  return shouldUseApi() ? new ApiSelectStageUseCase() : new MockSelectStageUseCase();
}

export function createPrepareStageBattleUseCase(): PrepareStageBattleUseCase {
  return shouldUseApi() ? new ApiPrepareStageBattleUseCase() : new MockPrepareStageBattleUseCase();
}

export function createLoadPieceCatalogUseCase(): LoadPieceCatalogUseCase {
  return shouldUseApi() ? new ApiLoadPieceCatalogUseCase() : new MockLoadPieceCatalogUseCase();
}

export function createLoadShopCatalogUseCase(): LoadShopCatalogUseCase {
  return shouldUseApi() ? new ApiLoadShopCatalogUseCase() : new MockLoadShopCatalogUseCase();
}

export function createPurchaseShopItemUseCase(): PurchaseShopItemUseCase {
  return shouldUseApi() ? new ApiPurchaseShopItemUseCase() : new MockPurchaseShopItemUseCase();
}
