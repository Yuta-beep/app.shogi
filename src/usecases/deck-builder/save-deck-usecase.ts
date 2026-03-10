import type { SaveDeckPayload } from '@/domain/models/deck-builder';

export type SaveDeckInput = SaveDeckPayload;

export type SaveDeckResult = {
  savedDeckId: string | null;
};

export interface SaveDeckUseCase {
  execute(input: SaveDeckInput): Promise<SaveDeckResult>;
}
