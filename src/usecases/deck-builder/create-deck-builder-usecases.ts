import { isApiDataSource } from '@/lib/config/data-source';
import {
  ApiDeleteDeckUseCase,
  ApiSaveDeckUseCase,
} from '@/usecases/deck-builder/api-deck-builder-mutation-usecases';
import { ApiLoadDeckBuilderUseCase } from '@/usecases/deck-builder/api-deck-builder-usecases';
import { DeleteDeckUseCase } from '@/usecases/deck-builder/delete-deck-usecase';
import { LoadDeckBuilderUseCase } from '@/usecases/deck-builder/load-deck-builder-usecase';
import {
  MockDeleteDeckUseCase,
  MockSaveDeckUseCase,
} from '@/usecases/deck-builder/mock-deck-builder-mutation-usecases';
import { MockLoadDeckBuilderUseCase } from '@/usecases/deck-builder/mock-deck-builder-usecases';
import { SaveDeckUseCase } from '@/usecases/deck-builder/save-deck-usecase';

export function createLoadDeckBuilderUseCase(token?: string): LoadDeckBuilderUseCase {
  return isApiDataSource() && token
    ? new ApiLoadDeckBuilderUseCase(token)
    : new MockLoadDeckBuilderUseCase();
}

export function createSaveDeckUseCase(token?: string): SaveDeckUseCase {
  return isApiDataSource() && token ? new ApiSaveDeckUseCase(token) : new MockSaveDeckUseCase();
}

export function createDeleteDeckUseCase(token?: string): DeleteDeckUseCase {
  return isApiDataSource() && token ? new ApiDeleteDeckUseCase(token) : new MockDeleteDeckUseCase();
}
