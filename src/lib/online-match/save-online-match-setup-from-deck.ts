import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';
import { createSaveOnlineMatchSetupUseCase } from '@/usecases/online-match/create-online-match-usecases';

export type OnlineMatchDeckPlacement = {
  row: number;
  col: number;
  piece: {
    pieceId?: number;
    char: string;
  };
};

export async function saveOnlineMatchSetupFromDeck(
  placements: OnlineMatchDeckPlacement[],
  accessToken?: string,
) {
  const useCase = createSaveOnlineMatchSetupUseCase(accessToken);
  const boardLayout = placements
    .filter((placement) => typeof placement.piece.pieceId === 'number')
    .map((placement) => ({
      row: placement.row,
      col: placement.col,
      pieceId: placement.piece.pieceId!,
      pieceCode: (CHAR_TO_CODE[placement.piece.char] ?? placement.piece.char).toUpperCase(),
    }));
  const selectedPieceIds = boardLayout.map((placement) => placement.pieceId);

  return useCase.execute({
    name: 'online-match-setup',
    boardLayout,
    handsLayout: [],
    selectedPieceIds,
  });
}
