import type { BoardPiece, HandsState } from '@/features/stage-shogi/domain/game-rules';
import { createEmptyHandsState } from '@/features/stage-shogi/domain/game-rules';
import type { BattleCanonicalPosition } from '@/usecases/stage-battle/game-move-contract';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';
import { normalizePieceCode, toBasePieceCode } from '@/ai/model/move';

export type AiHandsState = HandsState;
export type AiBattlePosition = Omit<BattleCanonicalPosition, 'hands'> & {
  hands: AiHandsState;
};
export type AiBoardPiece = BoardPiece & {
  imageSignedUrl?: string | null;
};

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function isOpaquePieceInstanceId(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^piece_[a-z0-9]+$/i.test(value.trim());
}

function charFromCanonicalCode(code: string | null): string | null {
  if (!code) return null;
  if (code === 'SWORD' || code === 'KATANA') return '刀';
  if (code === 'GUN') return '銃';
  if (code === 'ARMOR') return '鎧';
  if (code === 'SHIELD') return '盾';
  for (const [char, mapped] of Object.entries(CHAR_TO_CODE)) {
    const base = toBasePieceCode(mapped);
    if (base === code) return char;
  }
  return null;
}

export function sanitizeHandsBag(
  bag: Partial<Record<string, number>> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(bag ?? {})) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const normalized = Math.max(0, Math.floor(value));
    if (normalized <= 0) continue;
    out[key.toUpperCase()] = normalized;
  }
  return out;
}

export function normalizeHands(
  input?: BattleCanonicalPosition['hands'] | Partial<AiHandsState> | null,
): AiHandsState {
  const empty = createEmptyHandsState();
  return {
    player: { ...empty.player, ...sanitizeHandsBag(input?.player) },
    enemy: { ...empty.enemy, ...sanitizeHandsBag(input?.enemy) },
  };
}

export function cloneBattlePosition(position: BattleCanonicalPosition): AiBattlePosition {
  return {
    ...position,
    boardState: cloneRecord(position.boardState),
    hands: normalizeHands(position.hands),
  };
}

export function normalizeBattlePosition(position: BattleCanonicalPosition): AiBattlePosition {
  const cloned = cloneBattlePosition(position);
  return {
    ...cloned,
    sideToMove: cloned.sideToMove === 'enemy' ? 'enemy' : 'player',
    turnNumber: Math.max(1, Math.floor(cloned.turnNumber)),
    moveCount: Math.max(0, Math.floor(cloned.moveCount)),
    sfen: cloned.sfen,
    stateHash: cloned.stateHash ?? null,
    boardState: cloneRecord(cloned.boardState),
    hands: normalizeHands(cloned.hands),
  };
}

export function piecesFromBoardState(position: AiBattlePosition): AiBoardPiece[] {
  const boardState = asRecord(position.boardState) ?? {};
  const rawPieces = Array.isArray(boardState.pieces)
    ? boardState.pieces
    : Array.isArray(boardState.placements)
      ? boardState.placements
      : [];

  const pieces: AiBoardPiece[] = [];
  for (const raw of rawPieces) {
    const obj = asRecord(raw);
    if (!obj) continue;
    const side = (obj.side === 'enemy' ? 'enemy' : 'player') as 'player' | 'enemy';
    const row = typeof obj.row === 'number' ? obj.row : null;
    const col = typeof obj.col === 'number' ? obj.col : null;
    if (row == null || col == null) continue;

    const rawPiece = asRecord(obj.piece);
    const pieceCode = normalizePieceCode(
      (obj.pieceCode as string | null | undefined) ??
        (rawPiece?.code as string | null | undefined) ??
        CHAR_TO_CODE[String(obj.char ?? rawPiece?.char ?? '')],
    );
    const promoted = Boolean(obj.promoted ?? rawPiece?.promoted ?? false);
    const rawChar = String(obj.char ?? rawPiece?.char ?? '?') || (pieceCode ? pieceCode : '?');
    const baseCode = toBasePieceCode(pieceCode);
    const char =
      isOpaquePieceInstanceId(rawChar) || rawChar === pieceCode
        ? (charFromCanonicalCode(baseCode) ?? rawChar)
        : rawChar;

    const livesRaw = obj.kbossLivesRemaining ?? obj.kboss_lives_remaining;
    const kbossLivesRemaining =
      typeof livesRaw === 'number' && Number.isFinite(livesRaw)
        ? Math.max(1, Math.min(2, Math.floor(livesRaw)))
        : undefined;

    const mrpc = obj.mutantRevertPieceCode ?? obj.mutant_revert_piece_code;
    const mrch = obj.mutantRevertChar ?? obj.mutant_revert_char;
    const mrpr = obj.mutantRevertPromoted ?? obj.mutant_revert_promoted;
    const mrimg = obj.mutantRevertImageSignedUrl ?? obj.mutant_revert_image_signed_url;
    const hasMutantRevert =
      (typeof mrpc === 'string' && mrpc.length > 0) || (typeof mrch === 'string' && mrch.length > 0);

    pieces.push({
      side,
      row,
      col,
      pieceCode: baseCode,
      char,
      promoted,
      ...(kbossLivesRemaining != null ? { kbossLivesRemaining } : {}),
      ...(hasMutantRevert
        ? {
            mutantRevertPieceCode: typeof mrpc === 'string' ? mrpc : null,
            mutantRevertChar: typeof mrch === 'string' ? mrch : undefined,
            mutantRevertPromoted: Boolean(mrpr),
            mutantRevertImageSignedUrl: typeof mrimg === 'string' ? mrimg : null,
          }
        : {}),
      imageSignedUrl:
        typeof obj.imageSignedUrl === 'string'
          ? obj.imageSignedUrl
          : typeof rawPiece?.imageSignedUrl === 'string'
            ? rawPiece.imageSignedUrl
            : null,
    });
  }

  return pieces;
}
