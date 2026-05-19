import type { AiPieceDefinition } from '@/ai/model';

/** 種・鳴（HTML: seedMoves / cryMoves）— 前・前斜め左右・後斜め左右に各1マス。 */
export const TANE_SILVER_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

export const TANE_MOVE_DESCRIPTION_JA = '前斜め4方向に1マス移動できる。';

export const KIRIN_SKILL_DESCRIPTION_JA = '「金」「銀」「歩」駒から取られない。';

export const KIRIN_MOVE_DESCRIPTION_JA =
  '前後左右に何マスでも進める。斜め4方向に1マス進める。';

/** 麒（HTML: kirinMoves）— 前後左右スライド + 斜め4方向1マス。 */
export const KIRIN_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: 0, maxStep: 9 },
  { dx: 1, dy: 0, maxStep: 9 },
  { dx: 0, dy: -1, maxStep: 9 },
  { dx: 0, dy: 1, maxStep: 9 },
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

export const MAI_SKILL_DESCRIPTION_JA =
  '移動時、その時点で周囲8マスにいる敵駒の移動範囲を斜め前1マスのみに制限する。';

export const MAI_MOVE_DESCRIPTION_JA = '前・前斜め左右・左右・後に各1マス進める。';

/** 舞（HTML: danceMoves / goldMoves）— 金と同形6方向1マス。 */
export const MAI_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

export const P_SKILL_DESCRIPTION_JA =
  'この駒と同じ行または同じ列にいる敵駒を移動不能にする（「王」「巨」は除く）。';

export const P_MOVE_DESCRIPTION_JA = '前後左右に各1マス進める。';

/** P（HTML: pMoves）— 縦横1マス。 */
export const P_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

export const NAKU_SKILL_DESCRIPTION_JA =
  '敵駒を取ったとき、それと同じ敵駒が盤面にあと2体以上いる場合、合計3体までまとめて取る。';

export const NAKU_MOVE_DESCRIPTION_JA = '前斜め4方向に1マス移動できる。';

/** 鳴（HTML: cryMoves）— 銀と同形。 */
export const NAKU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = TANE_SILVER_MOVE_VECTORS;
