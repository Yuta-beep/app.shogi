import type { StageBattleSessionStart } from '@/usecases/stage-battle/stage-battle-session-contract';

export type AiStageBattleSession = StageBattleSessionStart & {
  board: StageBattleSessionStart['board'] & {
    placements: Array<{
      side: string;
      row: number;
      col: number;
      piece: {
        id: number | null;
        code: string | null;
        char: string | null;
        imageBucket: string | null;
        imageKey: string | null;
        imageSignedUrl?: string | null;
      };
    }>;
  };
};

export function normalizeStageBattleSession(
  session: StageBattleSessionStart,
): AiStageBattleSession {
  return {
    ...session,
    board: {
      ...session.board,
      placements: session.board.placements.map((raw) => {
        const placement = raw as AiStageBattleSession['board']['placements'][number];
        return {
          side: placement.side,
          row: placement.row,
          col: placement.col,
          piece: {
            id: placement.piece.id ?? null,
            code: placement.piece.code ?? null,
            char: placement.piece.char ?? null,
            imageBucket: placement.piece.imageBucket ?? null,
            imageKey: placement.piece.imageKey ?? null,
            imageSignedUrl: placement.piece.imageSignedUrl ?? null,
          },
        };
      }),
    },
  };
}
