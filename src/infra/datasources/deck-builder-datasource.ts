import { getJson, postJson, deleteJson } from '@/infra/http/api-client';
import { DeckBuilderSnapshot } from '@/usecases/deck-builder/load-deck-builder-usecase';

export type SaveDeckPayload = {
  name: string;
  placements: { rowNo: number; colNo: number; pieceId: number }[];
};

export type SaveDeckResponse = { deckId: number };

export class DeckBuilderApiDataSource {
  constructor(private readonly token: string) {}

  async getSnapshot(): Promise<DeckBuilderSnapshot> {
    return getJson<DeckBuilderSnapshot>('/api/v1/deck', { token: this.token });
  }

  async saveDeck(payload: SaveDeckPayload): Promise<SaveDeckResponse> {
    return postJson<SaveDeckResponse>('/api/v1/deck', payload, { token: this.token });
  }

  async deleteDeck(deckId: number): Promise<void> {
    await deleteJson<{ deleted: boolean }>(`/api/v1/deck?deckId=${deckId}`, { token: this.token });
  }
}
