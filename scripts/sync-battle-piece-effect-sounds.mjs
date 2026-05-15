/**
 * assets/audio/se/battle 内の「(名前)効果音.mp3|wav|m4a」を走査し、
 * src/constants/battle-piece-effect-sound-modules.generated.ts を生成する。
 *
 * キーはファイル名の「効果音」より前を Unicode NFKC した文字列（通常は駒の一字）。
 * 同一キーで複数拡張子がある場合は mp3 > m4a > wav を優先する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const battleDir = path.join(root, 'assets', 'audio', 'se', 'battle');
const outFile = path.join(
  root,
  'src',
  'constants',
  'battle-piece-effect-sound-modules.generated.ts',
);

const EXT_PRIORITY = { mp3: 0, m4a: 1, wav: 2 };

/** @type {Map<string, { name: string; pri: number }>} */
const byKey = new Map();
if (fs.existsSync(battleDir)) {
  for (const name of fs.readdirSync(battleDir)) {
    const m = /^(.+)効果音\.(mp3|wav|m4a)$/i.exec(name);
    if (!m) continue;
    let keyRaw = m[1];
    try {
      keyRaw = keyRaw.normalize('NFKC');
    } catch {
      /* ignore */
    }
    const ext = m[2].toLowerCase();
    const pri = EXT_PRIORITY[ext] ?? 9;
    const prev = byKey.get(keyRaw);
    if (!prev || pri < prev.pri) {
      byKey.set(keyRaw, { name, pri });
    }
  }
}

const entries = [...byKey.entries()]
  .map(([keyRaw, { name }]) => ({ keyRaw, name }))
  .sort((a, b) => a.keyRaw.localeCompare(b.keyRaw, 'ja'));

let body = `/**\n * 自動生成: scripts/sync-battle-piece-effect-sounds.mjs\n * 手編集しないでください。\n */\n\n`;
body += `export const BATTLE_PIECE_EFFECT_SOUND_MODULES: Partial<Record<string, number>> = {\n`;
for (const { keyRaw, name } of entries) {
  const safeKey = keyRaw.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  body += `  '${safeKey}': require('../../assets/audio/se/battle/${name}'),\n`;
}
body += `};\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body, 'utf8');
console.log(`Wrote ${entries.length} effect sound(s) to ${path.relative(root, outFile)}`);
