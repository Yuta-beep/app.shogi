#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(appRoot, '../bff.shogi');
const outputDir = path.resolve(appRoot, 'assets/pieces');
const registryFile = path.resolve(appRoot, 'src/lib/piece-image-registry.ts');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(backendRoot, '.env'));
  loadEnvFile(path.resolve(backendRoot, '.env.local'));
}

function buildSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) in env');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in env');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeToken(value, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function relFromRegistry(targetPath) {
  let rel = path.relative(path.dirname(registryFile), targetPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

async function loadPieceRows(supabase) {
  const { data, error } = await supabase
    .schema('master')
    .from('m_piece')
    .select('piece_id,piece_code,kanji,image_bucket,image_key')
    .not('image_bucket', 'is', null)
    .not('image_key', 'is', null)
    .order('piece_id', { ascending: true });

  if (error) {
    throw new Error(`load m_piece failed: ${error.message}`);
  }

  return data ?? [];
}

async function createSignedDownloadUrl(supabase, row) {
  const { data, error } = await supabase.storage
    .from(row.image_bucket)
    .createSignedUrl(row.image_key, 60);
  if (error || !data?.signedUrl) {
    throw new Error(
      `createSignedUrl ${row.image_bucket}/${row.image_key} failed: ${error?.message ?? 'unknown error'}`,
    );
  }
  return data.signedUrl;
}

async function fetchBinary(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadPieceImage(supabase, row) {
  const bucket = row.image_bucket;
  const key = row.image_key;
  const extFromKey = path.extname(String(key)).toLowerCase();
  const ext = extFromKey || '.png';
  const fileName = `${String(row.piece_id).padStart(4, '0')}-${safeToken(row.piece_code, 'piece')}${ext}`;
  const filePath = path.resolve(outputDir, fileName);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return { fileName, filePath, skipped: true };
  }

  const signedUrl = await createSignedDownloadUrl(supabase, row);
  const buffer = await fetchBinary(signedUrl);
  fs.writeFileSync(filePath, buffer);

  return { fileName, filePath, skipped: false };
}

function buildRegistrySource(records) {
  const lines = [
    'export type PieceImageRecord = {',
    '  pieceId?: number;',
    '  pieceCode?: string | null;',
    '  char: string;',
    '  source: number;',
    '};',
    '',
    'const pieceImageRecords: PieceImageRecord[] = [',
  ];

  for (const record of records) {
    lines.push('  {');
    lines.push(`    pieceId: ${record.pieceId},`);
    lines.push(`    pieceCode: ${JSON.stringify(record.pieceCode)},`);
    lines.push(`    char: ${JSON.stringify(record.char)},`);
    lines.push(`    source: require(${JSON.stringify(record.requirePath)}),`);
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('const pieceImageById = new Map<number, number>();');
  lines.push('const pieceImageByCode = new Map<string, number>();');
  lines.push('const pieceImageByChar = new Map<string, number>();');
  lines.push('');
  lines.push('for (const record of pieceImageRecords) {');
  lines.push("  if (typeof record.pieceId === 'number') {");
  lines.push('    pieceImageById.set(record.pieceId, record.source);');
  lines.push('  }');
  lines.push("  if (typeof record.pieceCode === 'string' && record.pieceCode.length > 0) {");
  lines.push('    pieceImageByCode.set(record.pieceCode, record.source);');
  lines.push('  }');
  lines.push('  if (record.char.length > 0) {');
  lines.push('    pieceImageByChar.set(record.char, record.source);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('export function getLocalPieceImageSource(input: {');
  lines.push('  pieceId?: number;');
  lines.push('  pieceCode?: string | null;');
  lines.push('  char?: string | null;');
  lines.push('}): number | null {');
  lines.push("  if (typeof input.pieceId === 'number') {");
  lines.push('    const byId = pieceImageById.get(input.pieceId);');
  lines.push('    if (byId) return byId;');
  lines.push('  }');
  lines.push('');
  lines.push("  if (typeof input.pieceCode === 'string' && input.pieceCode.length > 0) {");
  lines.push('    const byCode = pieceImageByCode.get(input.pieceCode);');
  lines.push('    if (byCode) return byCode;');
  lines.push('  }');
  lines.push('');
  lines.push("  if (typeof input.char === 'string' && input.char.length > 0) {");
  lines.push('    return pieceImageByChar.get(input.char) ?? null;');
  lines.push('  }');
  lines.push('');
  lines.push('  return null;');
  lines.push('}');
  lines.push('');
  lines.push('export function getLocalPieceImageModules() {');
  lines.push('  return pieceImageRecords.map((record) => record.source);');
  lines.push('}');
  lines.push('');

  return `${lines.join('\n')}`;
}

async function main() {
  loadLocalEnv();
  ensureDir(outputDir);
  const supabase = buildSupabaseAdmin();
  const rows = await loadPieceRows(supabase);

  if (rows.length === 0) {
    throw new Error('No piece rows with image_bucket/image_key found.');
  }

  const records = [];
  const missing = [];
  for (const row of rows) {
    try {
      const { filePath, skipped } = await downloadPieceImage(supabase, row);
      console.log(`[${skipped ? 'skip' : 'ok'}] ${row.piece_id} ${row.piece_code} ${row.kanji}`);
      records.push({
        pieceId: row.piece_id,
        pieceCode: row.piece_code,
        char: row.kanji,
        requirePath: relFromRegistry(filePath),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[warn] ${row.piece_id} ${row.piece_code} ${row.kanji}: ${message}`);
      missing.push({
        pieceId: row.piece_id,
        pieceCode: row.piece_code,
        char: row.kanji,
      });
    }
  }

  fs.writeFileSync(registryFile, buildRegistrySource(records));
  console.log(`[ok] downloaded ${records.length} piece images to ${outputDir}`);
  console.log(`[ok] updated registry ${registryFile}`);
  if (missing.length > 0) {
    console.warn(`[warn] missing ${missing.length} piece images`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('[error]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
