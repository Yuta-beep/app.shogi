import type {
  DeckBuilderSnapshot,
  OwnedPiece,
  SaveDeckPayload,
  SaveDeckResponse,
  SavedDeck,
} from '@/domain/models/deck-builder';
import { getJson, postJson, deleteJson } from '@/infra/http/api-client';

type ApiOwnedPiece = {
  pieceId: number;
  char: string;
  name: string;
  imageSignedUrl: string | null;
  acquiredAt: string;
  source: string;
};

type ApiDeckPlacement = {
  rowNo: number;
  colNo: number;
  pieceId: number;
  char: string;
  name: string;
};

type ApiDeck = {
  deckId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  placements: ApiDeckPlacement[];
};

type ApiDeckSnapshot = {
  ownedPieces: ApiOwnedPiece[];
  decks: ApiDeck[];
};

function mapOwnedPiece(piece: ApiOwnedPiece): OwnedPiece {
  return {
    pieceId: piece.pieceId,
    char: piece.char,
    name: piece.name,
    imageSignedUrl: piece.imageSignedUrl,
    desc: `${piece.name}の詳細は準備中です。`,
    skill: '準備中',
    move: '準備中',
  };
}

function mapSavedDeck(deck: ApiDeck): SavedDeck {
  return {
    id: String(deck.deckId),
    name: deck.name,
    pieces: deck.placements
      .slice()
      .sort((a, b) => (a.rowNo - b.rowNo) || (a.colNo - b.colNo))
      .map((placement) => placement.char),
    savedAt: deck.updatedAt,
  };
}

export class DeckBuilderApiDataSource {
  constructor(private readonly token: string) {}

  async getSnapshot(): Promise<DeckBuilderSnapshot> {
    const response = await getJson<ApiDeckSnapshot>('/api/v1/deck', { token: this.token });
    return {
      ownedPieces: response.ownedPieces.map(mapOwnedPiece),
      savedDecks: response.decks.map(mapSavedDeck),
    };
  }

  async saveDeck(payload: SaveDeckPayload): Promise<SaveDeckResponse> {
    return postJson<SaveDeckResponse>('/api/v1/deck', payload, { token: this.token });
  }

  async deleteDeck(deckId: number): Promise<void> {
    await deleteJson<{ deleted: boolean }>(`/api/v1/deck?deckId=${deckId}`, { token: this.token });
  }
}
