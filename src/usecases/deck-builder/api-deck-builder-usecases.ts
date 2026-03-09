import { DeckBuilderApiDataSource } from '@/infra/datasources/deck-builder-datasource';
import { DeckBuilderSnapshot, LoadDeckBuilderUseCase } from '@/usecases/deck-builder/load-deck-builder-usecase';

export class ApiLoadDeckBuilderUseCase implements LoadDeckBuilderUseCase {
  private readonly dataSource: DeckBuilderApiDataSource;

  constructor(token: string) {
    this.dataSource = new DeckBuilderApiDataSource(token);
  }

  async execute(): Promise<DeckBuilderSnapshot> {
    return this.dataSource.getSnapshot();
  }
}
