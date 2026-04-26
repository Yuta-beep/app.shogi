import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';

/** マスタの `name` が一字 `char` より信頼できる場合（API が標準駒の char を流用していることがある） */
function ruleCharFromNameHint(hint: string): string | null {
  if (hint.includes('光神')) return '光';
  if (hint.includes('闇神')) return '闇';
  if (hint.includes('星神')) return '星';
  if (hint.includes('魔神')) return '魔';
  return null;
}

/** 二文字の通称 → 配置ルール用の一字（HTML 版の標準マスと揃える） */
const KANJI_DISPLAY_TO_RULE_CHAR: Readonly<Record<string, string>> = {
  歩兵: '歩',
  香車: '香',
  桂馬: '桂',
  銀将: '銀',
  金将: '金',
  角行: '角',
  飛車: '飛',
  王将: '王',
  玉将: '玉',
};

function stripPieceCodePrefix(s: string): string {
  const u = s.toUpperCase();
  if (u.startsWith('PIECE_SHOGI_')) return u.slice('PIECE_SHOGI_'.length);
  if (u.startsWith('PIECE_')) return u.slice('PIECE_'.length);
  return u;
}

/**
 * デッキビルダーで駒の一字（kanji）を HTML 版ルール・コストと一致させる。
 * DB/API の別字体（NFKC）、`char` に表示コードが入っている場合、名前からの推定に対応する。
 */
export function normalizeDeckBuilderPieceChar(
  char: string | null | undefined,
  nameHint?: string | null,
): string {
  const hint = (nameHint ?? '').trim();
  const fromName = hint ? ruleCharFromNameHint(hint) : null;
  if (fromName) return fromName;

  const raw = (char ?? '').trim();
  let normalized = raw;
  try {
    normalized = raw.normalize('NFKC');
  } catch {
    // 一部環境で normalize が未実装の場合
  }

  const upper = normalized.toUpperCase();
  const codeAtom = stripPieceCodePrefix(upper);
  // マスタの display_char / canonical が `char` に入っているケース
  if (codeAtom === 'HIK' || codeAtom === 'LIGHT') return '光';
  if (codeAtom === 'HOS' || codeAtom === 'STAR') return '星';
  if (codeAtom === 'YAM' || codeAtom === 'DARK') return '闇';
  if (codeAtom === 'MAK' || codeAtom === 'DEMON') return '魔';

  const code = CHAR_TO_CODE[normalized] ?? CHAR_TO_CODE[raw];
  if (code === 'MAK') return '魔';
  if (code === 'YAM') return '闇';
  if (code === 'HIK') return '光';
  if (code === 'HOS') return '星';

  if (!normalized) {
    return '';
  }

  const alias = KANJI_DISPLAY_TO_RULE_CHAR[normalized];
  if (alias) return alias;

  return normalized;
}
