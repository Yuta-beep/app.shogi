import { DeckBuilderApiDataSource } from '@/infra/datasources/deck-builder-datasource';
import type { DeleteDeckInput, DeleteDeckUseCase } from '@/usecases/deck-builder/delete-deck-usecase';
import type { SaveDeckInput, SaveDeckResult, SaveDeckUseCase } from '@/usecases/deck-builder/save-deck-usecase';

export class ApiSaveDeckUseCase implements SaveDeckUseCase {
  private readonly dataSource: DeckBuilderApiDataSource;

  constructor(token: string) {
    this.dataSource = new DeckBuilderApiDataSource(token);
  }

  async execute(input: SaveDeckInput): Promise<SaveDeckResult> {
    const response = await this.dataSource.saveDeck(input);
    return { savedDeckId: String(response.deckId) };
  }
}

export class ApiDeleteDeckUseCase implements DeleteDeckUseCase {
  private readonly dataSource: DeckBuilderApiDataSource;

  constructor(token: string) {
    this.dataSource = new DeckBuilderApiDataSource(token);
  }

  async execute(input: DeleteDeckInput): Promise<void> {
    await this.dataSource.deleteDeck(input.deckId);
  }
}
