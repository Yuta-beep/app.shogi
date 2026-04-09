/** HTML版 deck_builder.html の PIECE_COST_OVERRIDES と同系。未定義は {@link DEFAULT_DECK_PIECE_COST} */
export const DEFAULT_DECK_PIECE_COST = 8;

const PIECE_COST_OVERRIDES: Partial<Record<string, number>> = {
  王: 0,
  玉: 0,
  歩: 1,
  香: 2,
  桂: 2,
  銀: 3,
  金: 4,
  飛: 6,
  角: 6,
  走: 2,
  種: 8,
  麒: 12,
  舞: 8,
  P: 7,
  鳴: 5,
  忍: 5,
  影: 5,
  砲: 7,
  竜: 7,
  鳳: 7,
  炎: 7,
  火: 7,
  水: 7,
  波: 7,
  木: 8,
  葉: 7,
  光: 8,
  星: 7,
  闇: 5,
  魔: 8,
};

export function getDeckBuilderPieceCost(char: string | null | undefined): number {
  if (!char) return 0;
  if (char === '王' || char === '玉') return 0;
  return PIECE_COST_OVERRIDES[char] ?? DEFAULT_DECK_PIECE_COST;
}
