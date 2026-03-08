# 認証実装計画書 (Supabase 匿名認証)

## 1. 目的

- OAuth なしで、アプリ起動時にユーザーを Supabase へ登録する
- Supabase が発行する UUID をゲームデータの基点とする
- 認証は匿名サインインを採用し、後からメール紐付けで昇格できる設計にする

---

## 2. 認証方式の選定

### 採用: Supabase 匿名認証 (Anonymous Sign-in)

```
アプリ起動
  → セッション確認（SecureStore に保存済みのトークン）
  → セッションなし → supabase.auth.signInAnonymously()
  → Supabase が UUID を発行 → auth.users に登録
  → セッションをローカル保存（SecureStore）
  → 以降の全 API 呼び出しに JWT が付く
```

### 採用理由
- ユーザーにログイン操作を求めない（ゲームらしい UX）
- UUID は Supabase 側が管理し、デバイス紛失時の再ログインに備えられる
- 後からメールを紐付けて "本アカウント昇格" できる（データ引き継ぎ可能）
- `supabase-js` の標準機能のみで完結し、カスタム認証サーバー不要

### 不採用
- Email + Password: 初回登録コストが高く、ゲームの導線に合わない
- Username + Password: Supabase 標準外。メタデータ管理が複雑になる

---

## 3. 全体フロー

```
[アプリ起動]
      ↓
[_layout.tsx]
  useAuthSession() を呼ぶ
      ↓
  isReady = false → <AppLoadingScreen /> を表示
      ↓
  EnsureSessionUseCase.execute()
    ├─ 既存セッションあり → userId を返す
    └─ なし → signInAnonymously() → userId を返す
      ↓
  isReady = true → Stack ナビゲーションを描画
      ↓
[/] TitleScreen（現行のまま）
      ↓ タップ
[/home] HomeScreen（現行のまま）
```

画面遷移ロジックは変えない。認証は _layout.tsx の描画前に完結させる。

---

## 4. Supabase テーブル設計

### 4.1 スキーマ方針

- `auth.users`: Supabase が自動管理（UUIDはここで発行）
- `public.players`: ゲーム用プレイヤーデータ（players.id は auth.users.id の FK）

### 4.2 `public.players` テーブル

```sql
create table public.players (
  id              uuid        primary key references auth.users(id) on delete cascade,
  display_name    text        not null default '将棋プレイヤー',
  rating          int         not null default 1500,
  pawn_currency   int         not null default 0,
  gold_currency   int         not null default 0,
  is_anonymous    boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS: 本人のみ読み書き可能
alter table public.players enable row level security;

create policy "players: self read"
  on public.players for select
  using (auth.uid() = id);

create policy "players: self update"
  on public.players for update
  using (auth.uid() = id);

-- サインアップ時に自動でプレイヤーレコードを作成する Trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.players (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4.3 アカウント昇格後の処理

```sql
-- メール紐付け時に is_anonymous を false に更新する（アプリ側から呼ぶ）
update public.players set is_anonymous = false where id = auth.uid();
```

---

## 5. フロントエンド実装

### 5.1 追加パッケージ

```bash
npx expo install @supabase/supabase-js expo-secure-store
```

| パッケージ | 用途 |
|---|---|
| `@supabase/supabase-js` | Supabase クライアント |
| `expo-secure-store` | JWT セッションのセキュアな永続化 |

### 5.2 追加ファイル構成

```text
src/
  lib/
    supabase/
      supabase-client.ts          ← Supabase クライアント（シングルトン）
      secure-store-adapter.ts     ← SecureStore を supabase-js に渡すアダプター
  usecases/
    auth/
      ensure-session-usecase.ts   ← セッション確保（匿名サインイン含む）
      get-current-user-usecase.ts ← UUID 取得
      link-email-usecase.ts       ← メール紐付け（昇格、後から実装）
  hooks/
    common/
      use-auth-session.ts         ← 認証状態管理 hook
```

既存ファイルの変更は `app/_layout.tsx` のみ。

### 5.3 各ファイルの責務

#### `src/lib/supabase/secure-store-adapter.ts`

supabase-js が要求する `AsyncStorage` 互換インターフェースを `expo-secure-store` で実装する。

```ts
// StorageAdapter interface の実装（getItem / setItem / removeItem）
// SecureStore は同期 API を持たないため非同期ラッパーで対応
```

#### `src/lib/supabase/supabase-client.ts`

```ts
// createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storage: SecureStoreAdapter } })
// 環境変数は app.json の extra か .env で管理
// シングルトンとしてモジュールスコープで export
```

#### `src/usecases/auth/ensure-session-usecase.ts`

```ts
export type EnsureSessionResult = {
  userId: string; // UUID
  isNewUser: boolean;
};

export interface EnsureSessionUseCase {
  execute(): Promise<EnsureSessionResult>;
}
```

実装ロジック:
1. `supabase.auth.getSession()` を呼ぶ
2. 有効なセッションがあれば `{ userId, isNewUser: false }` を返す
3. なければ `supabase.auth.signInAnonymously()` を呼ぶ
4. 成功したら `{ userId, isNewUser: true }` を返す
5. 失敗したらエラーをそのままスロー（ネットワーク不通の場合も考慮が必要）

#### `src/hooks/common/use-auth-session.ts`

```ts
export type AuthSessionState = {
  isReady: boolean;
  userId: string | null;
  error: Error | null;
};

export function useAuthSession(): AuthSessionState;
```

動作:
- マウント時に `EnsureSessionUseCase` を実行
- `isReady` は完了後に `true` になる
- `userId` は確保できた UUID

#### `app/_layout.tsx` の変更点

```tsx
export default function RootLayout() {
  const { isReady, error } = useAuthSession();

  // 認証が完了するまでローディングを表示
  if (!isReady) {
    return <AppLoadingScreen />;
  }

  // エラー時は別途ハンドリング（ネットワークエラー画面 など）
  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
```

---

## 6. 環境変数管理

```ts
// app.json の extra に定義
{
  "expo": {
    "extra": {
      "supabaseUrl": process.env.SUPABASE_URL,
      "supabaseAnonKey": process.env.SUPABASE_ANON_KEY
    }
  }
}
```

```bash
# .env (gitignore 済み)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

`expo-constants` の `Constants.expoConfig.extra` から読む。`.env` は `.gitignore` に追加済みであることを必ず確認する。

---

## 7. オフライン / ネットワークエラー方針

| 状態 | 挙動 |
|---|---|
| 初回起動・オフライン | エラー画面を表示し「再試行」ボタンを出す |
| 2回目以降・セッション残存 | ローカルのセッション（SecureStore）でそのまま起動 |
| セッション期限切れ・オンライン | 自動リフレッシュ（supabase-js が担当） |
| セッション期限切れ・オフライン | エラー画面 → 再試行 |

v1 では初回オフライン時の対応は「エラー + 再試行ボタン」でよい。

---

## 8. 実装手順（ステップ順）

### Step 1a: Supabase Dashboard 設定（今すぐ必要）
- [ ] 匿名認証を Supabase Dashboard で有効化
  - Authentication > Providers > Anonymous を ON
- [ ] `SUPABASE_URL` と `SUPABASE_ANON_KEY` を控える

### Step 2: パッケージ追加
- [ ] `npx expo install @supabase/supabase-js expo-secure-store`
- [ ] `.env` ファイル作成（`SUPABASE_URL`, `SUPABASE_ANON_KEY` を記入）
- [ ] `.gitignore` に `.env` が含まれていることを確認

### Step 3: Supabase クライアント実装
- [ ] `src/lib/supabase/secure-store-adapter.ts`
- [ ] `src/lib/supabase/supabase-client.ts`

### Step 4: UseCase 実装
- [ ] `src/usecases/auth/ensure-session-usecase.ts`（interface + 実装）

### Step 5: Hook 実装
- [ ] `src/hooks/common/use-auth-session.ts`

### Step 6: `_layout.tsx` 更新
- [ ] `useAuthSession()` を追加し、`isReady` でローディングを制御

### Step 7: 動作確認（認証のみ）
- [ ] 初回起動で `auth.users` に UUID が発行されること
- [ ] 2回目以降はサインインが走らないこと（既存セッション利用）
- [ ] タイトル・ホーム画面の既存フローが壊れていないこと

### Step 1b: players テーブル準備（player データを使うときに実施）
> `LoadHomeSnapshotUseCase` を Supabase に繋ぐタイミングで対応する。
- [ ] `public.players` テーブル作成
- [ ] RLS ポリシー設定
- [ ] `handle_new_user` トリガー設定

---

## 9. 将来の拡張（スコープ外）

| 機能 | UseCase |
|---|---|
| メールアドレス登録（匿名→本アカウント昇格） | `LinkEmailUseCase` |
| ログイン画面（メール + パスワード） | `SignInWithEmailUseCase` |
| パスワードリセット | `ResetPasswordUseCase` |
| アカウント削除 | `DeleteAccountUseCase` |

これらは本計画のスコープ外とし、匿名認証の実装完了後に別途計画を立てる。

---

## 10. 完了条件

### 認証フェーズ（Step 1a〜7）
- [ ] アプリ起動時に Supabase の `auth.users` に UUID が発行される
- [ ] 2回目以降の起動では既存セッションが再利用される
- [ ] タイトル画面・ホーム画面の既存フローが壊れていない
- [ ] `.env` がリポジトリに含まれていない

### players テーブルフェーズ（Step 1b）
- [ ] `public.players` に紐づくレコードが自動で作成される
- [ ] RLS により本人のみ読み書きできること
