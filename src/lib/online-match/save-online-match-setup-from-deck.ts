import { resolveOnlineMatchPieceCode } from '@/lib/online-match/resolve-online-match-piece-code';
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
      pieceCode: resolveOnlineMatchPieceCode(placement.piece.char),
    }));
  const selectedPieceIds = boardLayout.map((placement) => placement.pieceId);

  return useCase.execute({
    name: 'online-match-setup',
    boardLayout,
    handsLayout: [],
    selectedPieceIds,
  });
}
