import type {
  DeleteDeckInput,
  DeleteDeckUseCase,
} from '@/usecases/deck-builder/delete-deck-usecase';
import type {
  SaveDeckInput,
  SaveDeckResult,
  SaveDeckUseCase,
} from '@/usecases/deck-builder/save-deck-usecase';

export class MockSaveDeckUseCase implements SaveDeckUseCase {
  async execute(_input: SaveDeckInput): Promise<SaveDeckResult> {
    return { savedDeckId: null };
  }
}

export class MockDeleteDeckUseCase implements DeleteDeckUseCase {
  async execute(_input: DeleteDeckInput): Promise<void> {
    // UI-only mode: no persistence
  }
}
