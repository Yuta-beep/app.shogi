export type DeleteDeckInput = {
  deckId: number;
};

export interface DeleteDeckUseCase {
  execute(input: DeleteDeckInput): Promise<void>;
}
