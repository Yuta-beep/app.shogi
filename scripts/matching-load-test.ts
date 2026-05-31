import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseScriptClient = any;

type BattleSetupPlacement = {
  row: number;
  col: number;
  pieceId: number;
  pieceCode: string;
};

type TicketResponse = {
  ticket: string;
  expiresAt: string;
  user: {
    userId: string;
    displayName: string;
    rating: number;
  };
};

type TestUser = {
  index: number;
  userId: string;
  email: string;
  password: string;
  displayName: string;
  accessToken: string;
  battleSetupId: string;
  ticket: TicketResponse;
};

type ServerMessage = {
  type: string;
  matchId?: string;
  code?: string;
  message?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const bffRoot = path.resolve(appRoot, '../bff.shogi');

const createdUserIds: string[] = [];
const sockets = new Set<WebSocket>();
let cleanupStarted = false;

function loadEnvFile(filePath: string): void {
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

function loadLocalEnv(): void {
  for (const root of [bffRoot, appRoot]) {
    loadEnvFile(path.resolve(root, '.env'));
    loadEnvFile(path.resolve(root, '.env.local'));
  }
}

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing ${name}`);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return Math.floor(parsed);
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return String(error);
}

function isRateLimitError(error: unknown): boolean {
  return /rate limit|too many requests/i.test(errorMessage(error));
}

async function retryRateLimited<T>(
  label: string,
  attempts: number,
  baseDelayMs: number,
  maxDelayMs: number,
  task: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === attempts) break;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitterMs = Math.floor(Math.random() * Math.min(1000, delayMs));
      console.warn(
        `[prepare] ${label} rate limited; retrying in ${delayMs + jitterMs}ms (${attempt}/${attempts})`,
      );
      await sleep(delayMs + jitterMs);
    }
  }
  throw lastError;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function postJson<T>(
  baseUrl: string,
  pathName: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, '')}${pathName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = JSON.parse(text) as ApiEnvelope<T>;
  if (!response.ok || !json.ok) {
    const message = json.ok
      ? `HTTP ${response.status}`
      : `${json.error.code}: ${json.error.message}`;
    throw new Error(`${url} failed: ${message}`);
  }
  return json.data;
}

async function loadStandardBoardLayout(
  admin: SupabaseScriptClient,
): Promise<BattleSetupPlacement[]> {
  const { data, error } = await admin
    .schema('master')
    .from('m_piece')
    .select('piece_id,piece_code,kanji,name')
    .in('kanji', ['歩', '香', '桂', '銀', '金', '角', '飛', '王', '玉']);

  if (error) throw new Error(`Failed to load master pieces: ${error.message}`);

  const pieces = new Map<string, { piece_id: number; piece_code: string }>();
  for (const row of data ?? []) {
    pieces.set(String(row.kanji), {
      piece_id: Number(row.piece_id),
      piece_code: String(row.piece_code).toUpperCase(),
    });
  }

  const resolve = (kanji: string) => {
    const piece = pieces.get(kanji) ?? (kanji === '王' ? pieces.get('玉') : undefined);
    if (!piece) throw new Error(`Missing standard piece in master.m_piece: ${kanji}`);
    return piece;
  };

  const cells: Array<{ row: number; col: number; kanji: string }> = [
    ...Array.from({ length: 9 }, (_, col) => ({ row: 6, col, kanji: '歩' })),
    { row: 7, col: 1, kanji: '角' },
    { row: 7, col: 7, kanji: '飛' },
    { row: 8, col: 0, kanji: '香' },
    { row: 8, col: 1, kanji: '桂' },
    { row: 8, col: 2, kanji: '銀' },
    { row: 8, col: 3, kanji: '金' },
    { row: 8, col: 4, kanji: '王' },
    { row: 8, col: 5, kanji: '金' },
    { row: 8, col: 6, kanji: '銀' },
    { row: 8, col: 7, kanji: '桂' },
    { row: 8, col: 8, kanji: '香' },
  ];

  return cells.map((cell) => {
    const piece = resolve(cell.kanji);
    return {
      row: cell.row,
      col: cell.col,
      pieceId: piece.piece_id,
      pieceCode: piece.piece_code,
    };
  });
}

async function createPreparedUser(input: {
  index: number;
  runId: string;
  admin: SupabaseScriptClient;
  userClient: SupabaseScriptClient;
  apiBaseUrl: string;
  boardLayout: BattleSetupPlacement[];
  authRetryAttempts: number;
  authRetryBaseDelayMs: number;
  authRetryMaxDelayMs: number;
}): Promise<TestUser> {
  const email = `matching-load-${input.runId}-${input.index}@example.com`;
  const password = `LoadTest-${input.runId}-${input.index}-Aa1!`;
  const displayName = `負荷${String(input.index).padStart(3, '0')}`;

  const { data: created, error: createError } = await retryRateLimited(
    `createUser ${email}`,
    input.authRetryAttempts,
    input.authRetryBaseDelayMs,
    input.authRetryMaxDelayMs,
    async () => {
      const result = await input.admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          purpose: 'matching-load-test',
          runId: input.runId,
          index: input.index,
        },
      });
      if (result.error) throw result.error;
      return result;
    },
  );
  if (createError || !created.user) {
    throw new Error(`Failed to create ${email}: ${createError?.message ?? 'missing user'}`);
  }

  const userId = created.user.id;
  createdUserIds.push(userId);

  const { error: profileError } = await input.admin.from('players').upsert({
    id: userId,
    display_name: displayName,
    rating: 1500,
  });
  if (profileError) throw new Error(`Failed to upsert player ${userId}: ${profileError.message}`);

  const { data: session, error: signInError } = await retryRateLimited(
    `signIn ${email}`,
    input.authRetryAttempts,
    input.authRetryBaseDelayMs,
    input.authRetryMaxDelayMs,
    async () => {
      const result = await input.userClient.auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) throw result.error;
      return result;
    },
  );
  const accessToken = session.session?.access_token;
  if (signInError || !accessToken) {
    throw new Error(
      `Failed to sign in ${email}: ${signInError?.message ?? 'missing access token'}`,
    );
  }

  const createdSetup = await postJson<{ battleSetupId: string; status: string }>(
    input.apiBaseUrl,
    '/api/v1/online-match/battle-setup',
    accessToken,
    {
      name: `matching-load-${input.runId}`,
      boardLayout: input.boardLayout,
      handsLayout: [],
      selectedPieceIds: input.boardLayout.map((piece) => piece.pieceId),
    },
  );

  await postJson(
    input.apiBaseUrl,
    `/api/v1/online-match/battle-setup/${encodeURIComponent(createdSetup.battleSetupId)}/validate`,
    accessToken,
    {},
  );
  const locked = await postJson<{ battleSetupId: string; status: string }>(
    input.apiBaseUrl,
    `/api/v1/online-match/battle-setup/${encodeURIComponent(createdSetup.battleSetupId)}/lock`,
    accessToken,
    {},
  );

  const ticket = await postJson<TicketResponse>(
    input.apiBaseUrl,
    '/api/v1/online-match/ticket',
    accessToken,
    {},
  );

  return {
    index: input.index,
    userId,
    email,
    password,
    displayName,
    accessToken,
    battleSetupId: locked.battleSetupId,
    ticket,
  };
}

async function enterQueue(input: {
  user: TestUser;
  wsUrl: string;
  delayMs: number;
  timeoutMs: number;
  wsRetryAttempts: number;
  wsRetryBaseDelayMs: number;
  wsRetryMaxDelayMs: number;
}): Promise<{ userId: string; matchId: string | null; messages: ServerMessage[] }> {
  await sleep(input.delayMs);

  let lastError: unknown;
  for (let attempt = 1; attempt <= input.wsRetryAttempts; attempt += 1) {
    try {
      return await enterQueueOnce(input);
    } catch (error) {
      lastError = error;
      if (attempt >= input.wsRetryAttempts) break;
      const delayMs = Math.min(
        input.wsRetryMaxDelayMs,
        input.wsRetryBaseDelayMs * 2 ** (attempt - 1),
      );
      const jitterMs = Math.floor(Math.random() * Math.min(1000, delayMs));
      console.warn(
        `[load] ${input.user.email} websocket failed; retrying in ${delayMs + jitterMs}ms (${attempt}/${input.wsRetryAttempts})`,
      );
      await sleep(delayMs + jitterMs);
    }
  }

  throw lastError;
}

async function enterQueueOnce(input: {
  user: TestUser;
  wsUrl: string;
  timeoutMs: number;
}): Promise<{ userId: string; matchId: string | null; messages: ServerMessage[] }> {
  const url = new URL(input.wsUrl);
  url.searchParams.set('ticket', input.user.ticket.ticket);

  return new Promise((resolve, reject) => {
    let settled = false;
    let matchId: string | null = null;
    const messages: ServerMessage[] = [];
    const ws = new WebSocket(url.toString());
    sockets.add(ws);

    const timeout = setTimeout(() => {
      finish(() => reject(new Error(`${input.user.email} timed out waiting for game_started`)));
    }, input.timeoutMs);

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      sockets.delete(ws);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      callback();
    };

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          action: 'enter_queue',
          requestId: createRequestId(),
          userId: input.user.userId,
          rating: input.user.ticket.user.rating,
          displayName: input.user.ticket.user.displayName,
          battleSetupId: input.user.battleSetupId,
        }),
      );
    });

    ws.addEventListener('message', (event) => {
      const parsed = JSON.parse(String(event.data)) as ServerMessage;
      messages.push(parsed);
      if (parsed.type === 'match_found') {
        matchId = parsed.matchId ?? matchId;
      }
      if (parsed.type === 'game_started') {
        matchId = parsed.matchId ?? matchId;
        finish(() => resolve({ userId: input.user.userId, matchId, messages }));
      }
      if (parsed.type === 'error') {
        finish(() =>
          reject(
            new Error(
              `${input.user.email} server error: ${parsed.code ?? ''} ${parsed.message ?? ''}`,
            ),
          ),
        );
      }
    });

    ws.addEventListener('error', () => {
      finish(() => reject(new Error(`${input.user.email} websocket error`)));
    });

    ws.addEventListener('close', () => {
      sockets.delete(ws);
      if (!settled) {
        finish(() => reject(new Error(`${input.user.email} websocket closed before game_started`)));
      }
    });
  });
}

async function cleanup(admin: SupabaseScriptClient, keepUsers: boolean): Promise<void> {
  if (cleanupStarted) return;
  cleanupStarted = true;

  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
  sockets.clear();

  if (keepUsers) {
    console.log(`[cleanup] LOAD_MATCHING_KEEP_USERS=true, keeping ${createdUserIds.length} users`);
    return;
  }

  const ids = [...createdUserIds].reverse();
  console.log(`[cleanup] deleting ${ids.length} Supabase auth users`);
  await mapLimit(ids, 8, async (userId) => {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error(`[cleanup] failed to delete ${userId}: ${error.message}`);
  });
}

async function main(): Promise<void> {
  loadLocalEnv();

  const userCount = intEnv('LOAD_MATCHING_USER_COUNT', 100);
  const prepareConcurrency = intEnv('LOAD_MATCHING_PREPARE_CONCURRENCY', 1);
  const startConcurrency = intEnv('LOAD_MATCHING_START_CONCURRENCY', userCount);
  const staggerMs = intEnv('LOAD_MATCHING_STAGGER_MS', 20);
  const jitterMs = intEnv('LOAD_MATCHING_JITTER_MS', 250);
  const timeoutMs = intEnv('LOAD_MATCHING_TIMEOUT_MS', 60_000);
  const authRetryAttempts = intEnv('LOAD_MATCHING_AUTH_RETRY_ATTEMPTS', 8);
  const authRetryBaseDelayMs = intEnv('LOAD_MATCHING_AUTH_RETRY_BASE_DELAY_MS', 2_000);
  const authRetryMaxDelayMs = intEnv('LOAD_MATCHING_AUTH_RETRY_MAX_DELAY_MS', 30_000);
  const wsRetryAttempts = intEnv('LOAD_MATCHING_WS_RETRY_ATTEMPTS', 3);
  const wsRetryBaseDelayMs = intEnv('LOAD_MATCHING_WS_RETRY_BASE_DELAY_MS', 1_000);
  const wsRetryMaxDelayMs = intEnv('LOAD_MATCHING_WS_RETRY_MAX_DELAY_MS', 5_000);
  const keepUsers = boolEnv('LOAD_MATCHING_KEEP_USERS', false);
  const runId = env(
    'LOAD_MATCHING_RUN_ID',
    new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14),
  );
  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const apiBaseUrl = env(
    'LOAD_MATCHING_API_BASE_URL',
    env('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:3000'),
  );
  const wsUrl = env(
    'LOAD_MATCHING_WS_URL',
    env('EXPO_PUBLIC_MATCHING_SERVER_WS_URL', 'ws://localhost:3010/ws'),
  );

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stop = async (signal: string) => {
    console.log(`\n[signal] ${signal} received`);
    await cleanup(admin, keepUsers);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', () => void stop('SIGINT'));
  process.once('SIGTERM', () => void stop('SIGTERM'));

  try {
    console.log(
      `[prepare] users=${userCount} api=${apiBaseUrl} ws=${wsUrl} stagger=${staggerMs}ms jitter=${jitterMs}ms runId=${runId}`,
    );
    const boardLayout = await loadStandardBoardLayout(admin);
    const users = await mapLimit(
      Array.from({ length: userCount }, (_, index) => index + 1),
      prepareConcurrency,
      async (index) => {
        const user = await createPreparedUser({
          index,
          runId,
          admin,
          userClient,
          apiBaseUrl,
          boardLayout,
          authRetryAttempts,
          authRetryBaseDelayMs,
          authRetryMaxDelayMs,
        });
        if (index % 10 === 0 || index === userCount) {
          console.log(`[prepare] ${index}/${userCount}`);
        }
        return user;
      },
    );

    console.log('[load] entering queue');
    const startedAt = Date.now();
    const results = await mapLimit(users, startConcurrency, async (user, userIndex) => {
      const delayMs = userIndex * staggerMs + Math.floor(Math.random() * (jitterMs + 1));
      return enterQueue({
        user,
        wsUrl,
        delayMs,
        timeoutMs,
        wsRetryAttempts,
        wsRetryBaseDelayMs,
        wsRetryMaxDelayMs,
      });
    });

    const elapsedMs = Date.now() - startedAt;
    const matchedUsers = results.filter((result) => result.matchId).length;
    const uniqueMatches = new Set(results.map((result) => result.matchId).filter(Boolean));
    console.log(
      `[result] game_started users=${matchedUsers}/${userCount} matches=${uniqueMatches.size} elapsedMs=${elapsedMs}`,
    );
  } finally {
    await cleanup(admin, keepUsers);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
