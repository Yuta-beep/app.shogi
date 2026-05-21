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

/** 室（ガチャ）— 舞・金と同形6方向1マス。 */
export const SHITSU_MOVE_DESCRIPTION_JA = MAI_MOVE_DESCRIPTION_JA;

/** 爆（ガチャ）— 前斜め・前・左右・後に各1マス（室・舞と同形）。 */
export const BAKU_MOVE_DESCRIPTION_JA = MAI_MOVE_DESCRIPTION_JA;
export const BAKU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

export const SHITSU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

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

/** 定（ガチャ）— 縦横1マス（P・走と同形）。 */
export const SADAME_MOVE_DESCRIPTION_JA = P_MOVE_DESCRIPTION_JA;
export const SADAME_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [...P_MOVE_VECTORS];

export const EN_MOVE_DESCRIPTION_JA =
  '前後左右に各1マス進める。味方の「王」の前1マスへも移動できる。';

/** 閹（ガチャ）— 縦横1マス + 味方王の前1マス（合法手生成で追加）。 */
export const EN_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [...P_MOVE_VECTORS];

export const AN_MOVE_DESCRIPTION_JA = '前後左右に各1マス進め、桂馬のように跳べる。';

/** 安（ガチャ）— 縦横1マス + 桂馬跳び。 */
export const AN_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  ...P_MOVE_VECTORS,
  { dx: -1, dy: -2, maxStep: 1 },
  { dx: 1, dy: -2, maxStep: 1 },
];

export const SO_MOVE_DESCRIPTION_JA = '前後に何マスでも進め、左右に各1マス進める。';

export const SOU_MOVE_DESCRIPTION_JA = '前に最大2マス、左右・後ろに各1マス進める。';

/** 艸（ガチャ）— 前2 + 左右後1。 */
export const SOU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: 0, dy: -1, maxStep: 2 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

export const KOU_MOVE_DESCRIPTION_JA =
  '前斜め左右・後ろに各1マス進める。隣接する味方が横移動したとき同じ向きに追従する。';

/** 膠（ガチャ）— 前斜め2 + 後1（辺の斜めと同形 + 後直進）。 */
export const KOU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];

export const HEN_MOVE_DESCRIPTION_JA = '前斜め・後斜めに各1マス進める。';

export const ITSU_MOVE_DESCRIPTION_JA = HEN_MOVE_DESCRIPTION_JA;

/** 逸（ガチャ）— 前斜め・後斜めに各1マス（辺と同形）。 */
export const ITSU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

/** 辺（ガチャ）— 前斜め2 + 後斜め2（銀の斜めのみ）。 */
export const HEN_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

export const TOU_MOVE_DESCRIPTION_JA = '前・後・左右・後斜めに各1マス進める。';

/** 灯（ガチャ）— 前後左右1マス + 後斜め2方向（死駒と同形）。 */
export const TOU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

export const NIGE_MOVE_DESCRIPTION_JA = '全方向に各1マス進める。';

/** 逃（ガチャ）— 王と同形の全方向1マス。 */
export const NIGE_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

export const SHIN_MOVE_DESCRIPTION_JA =
  '毎ターン、盤上にいない駒も含む全駒からランダムに1種を選び、その駒と同じ移動範囲で動く。';

export const AORI_MOVE_DESCRIPTION_JA = '前後左右に何マスでも進める。';

/** 煽（ガチャ）— 縦横スライド（飛車の縦横のみ）。 */
export const AORI_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: -1, dy: 0, maxStep: 9 },
  { dx: 1, dy: 0, maxStep: 9 },
  { dx: 0, dy: -1, maxStep: 9 },
  { dx: 0, dy: 1, maxStep: 9 },
];

/** 宋（ガチャ）— 前後スライド + 左右1マス。 */
export const SO_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = [
  { dx: 0, dy: -1, maxStep: 9 },
  { dx: 0, dy: 1, maxStep: 9 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
];

export const NAKU_SKILL_DESCRIPTION_JA =
  '敵駒を取ったとき、それと同じ敵駒が盤面にあと2体以上いる場合、合計3体までまとめて取る。';

export const NAKU_MOVE_DESCRIPTION_JA = '前斜め4方向に1マス移動できる。';

/** 鳴（HTML: cryMoves）— 銀と同形。 */
export const NAKU_MOVE_VECTORS: AiPieceDefinition['moveVectors'] = TANE_SILVER_MOVE_VECTORS;
