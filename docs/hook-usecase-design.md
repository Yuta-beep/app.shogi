# Hook / UseCase 対応設計（UI先行フェーズ用）

## 1. 目的
このドキュメントは、現在の UI only 実装から、後続で useCase と hook を安全に導入するための設計基準を定義する。

- 今は UI only を維持する
- 後で `hook -> useCase -> repository` を段階導入できる形にする
- 画面ごとの責務を固定し、依存方向の崩れを防ぐ

---

## 2. 責務分離ルール

### hook の責務
- React 状態 (`useState`, `useMemo`, `useEffect`) の管理
- 画面イベント（ボタン押下・ページ切替）を useCase 呼び出しに変換
- 画面が使いやすい ViewModel 形へ整形

### useCase の責務
- 業務ルール（検証、計算、抽選、権限、状態遷移）
- データ取得・更新の入り口（repository interface を呼ぶ）
- React 非依存（関数または class）

### NG 例
- `screen.tsx` に `Math.random()` 抽選を直接書く
- `screen.tsx` に通貨計算ロジックを直接書く
- `hook` が DB / API SDK を直接呼ぶ

---

## 3. 画面別 Hook / UseCase 対応表

| 画面 | Hook | UseCase |
|---|---|---|
| home | `useHomeScreen` | `LoadHomeSnapshotUseCase` |
| stage-select | `useStageSelectScreen` | `LoadStageSelectUseCase`, `SelectStageUseCase` |
| stage-shogi | `useStageBattleScreen` | `PrepareStageBattleUseCase` |
| deck-builder | `useDeckBuilderScreen` | `LoadDeckBuilderUseCase`, `SaveDeckUseCase` |
| piece-info | `usePieceCatalogScreen` | `LoadPieceCatalogUseCase` |
| piece-shop | `usePieceShopScreen` | `LoadShopCatalogUseCase`, `PurchaseShopItemUseCase` |
| gacha-room | `useGachaRoomScreen` | `LoadGachaLobbyUseCase`, `RollGachaUseCase` |
| matching | `useMatchingScreen` | `StartMatchingUseCase`, `CancelMatchingUseCase` |
| online-battle | `useOnlineBattleScreen` | `LoadOnlineBattleSessionUseCase` |

---

## 4. 具体 API 草案

### 4.1 共通 Hook（先行導入向け）

#### `useAssetPreload`
```ts
export type UseAssetPreloadResult = {
  isReady: boolean;
  error: Error | null;
};

export function useAssetPreload(assetModules: number[]): UseAssetPreloadResult;
```

用途:
- `title-screen`
- `stage-select-screen`

#### `useModalState`
```ts
export type ModalState<T> = {
  isOpen: boolean;
  payload: T | null;
  open: (payload?: T) => void;
  close: () => void;
};

export function useModalState<T = void>(): ModalState<T>;
```

用途:
- `piece-shop` の詳細モーダル
- `piece-shop` の購入確認モーダル

---

### 4.2 画面 Hook（ViewModel 提供）

#### `useStageSelectScreen`
```ts
export type StageSelectVM = {
  currentPage: number;
  pageRanges: StageRange[];
  stageNodes: StageNodeData[];
  selectedStageId: number | null;
  selectPage: (page: number) => void;
  selectStage: (stageId: number) => Promise<void>;
  startSelectedStage: () => Promise<{ stageId: number } | null>;
};

export function useStageSelectScreen(): StageSelectVM;
```

中で呼ぶ useCase:
- `LoadStageSelectUseCase`
- `SelectStageUseCase`

#### `usePieceShopScreen`
```ts
export type PieceShopVM = {
  items: ShopItem[];
  wallet: Wallet;
  ownedIds: string[];
  detailTarget: ShopItem | null;
  confirmTarget: ShopItem | null;
  openDetail: (item: ShopItem) => void;
  openConfirm: (item: ShopItem) => void;
  closeDetail: () => void;
  closeConfirm: () => void;
  purchase: () => Promise<PurchaseResult>;
};

export function usePieceShopScreen(): PieceShopVM;
```

中で呼ぶ useCase:
- `LoadShopCatalogUseCase`
- `PurchaseShopItemUseCase`

#### `useGachaRoomScreen`
```ts
export type GachaRoomVM = {
  selectedGachaId: string;
  banners: GachaBanner[];
  wallet: Wallet;
  history: GachaHistoryItem[];
  statusText: string;
  selectGacha: (gachaId: string) => void;
  roll: () => Promise<RollGachaResult>;
};

export function useGachaRoomScreen(): GachaRoomVM;
```

中で呼ぶ useCase:
- `LoadGachaLobbyUseCase`
- `RollGachaUseCase`

---

### 4.3 UseCase I/F（アプリケーション層）

#### `LoadHomeSnapshotUseCase`
```ts
export type HomeSnapshot = {
  playerName: string;
  rating: number;
  pawnCurrency: number;
  goldCurrency: number;
};

export interface LoadHomeSnapshotUseCase {
  execute(): Promise<HomeSnapshot>;
}
```

#### `SelectStageUseCase`
```ts
export type SelectStageInput = { stageId: number };
export type SelectStageResult = {
  canStart: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND';
};

export interface SelectStageUseCase {
  execute(input: SelectStageInput): Promise<SelectStageResult>;
}
```

#### `PurchaseShopItemUseCase`
```ts
export type PurchaseShopItemInput = { itemId: string };
export type PurchaseShopItemResult = {
  success: boolean;
  reason?: 'ALREADY_OWNED' | 'INSUFFICIENT_FUNDS' | 'NOT_FOUND';
  wallet?: Wallet;
  ownedIds?: string[];
};

export interface PurchaseShopItemUseCase {
  execute(input: PurchaseShopItemInput): Promise<PurchaseShopItemResult>;
}
```

#### `RollGachaUseCase`
```ts
export type RollGachaInput = { gachaId: string };
export type RollGachaResult = {
  success: boolean;
  reason?: 'INSUFFICIENT_FUNDS' | 'NOT_FOUND';
  item?: { id: string; char: string; rarity: string };
  wallet?: Wallet;
  history?: GachaHistoryItem[];
};

export interface RollGachaUseCase {
  execute(input: RollGachaInput): Promise<RollGachaResult>;
}
```

---

## 5. 画面実装イメージ（具体例）

### 5.1 stage-select
```tsx
export function StageSelectScreen() {
  const vm = useStageSelectScreen();

  return (
    <StageSelectView
      currentPage={vm.currentPage}
      stageNodes={vm.stageNodes}
      onChangePage={vm.selectPage}
      onSelectStage={vm.selectStage}
      onStart={vm.startSelectedStage}
    />
  );
}
```

### 5.2 piece-shop
```tsx
export function PieceShopScreen() {
  const vm = usePieceShopScreen();

  return (
    <PieceShopView
      items={vm.items}
      wallet={vm.wallet}
      ownedIds={vm.ownedIds}
      onOpenDetail={vm.openDetail}
      onOpenConfirm={vm.openConfirm}
      onPurchase={vm.purchase}
    />
  );
}
```

---

## 6. 導入順序（安全）

1. `useAssetPreload`, `useModalState` を導入（副作用小）
2. `stage-select`, `piece-info` を Hook 化（読み取り中心）
3. `piece-shop`, `gacha-room`, `matching` を Hook 化（イベント整理）
4. 同名 UseCase interface を先に定義
5. UI only の fake 実装で UseCase を注入
6. 後で repository 接続へ差し替え

---

## 7. UI only フェーズ運用ルール

- `screen.tsx` に業務ロジックを置かない
- `Math.random`, 通貨計算, 購入可否判定は hook か useCase 側に寄せる
- UI only 期間は useCase 実装を `mock` として保持してよい
- `infra` / DB / API への直接依存は作らない

---

## 8. 次の実装タスク

1. `src/hooks/common/use-asset-preload.ts` を作る
2. `src/hooks/common/use-modal-state.ts` を作る
3. `src/features/stage-select/ui/use-stage-select-screen.ts` を作る
4. `src/features/piece-shop/ui/use-piece-shop-screen.ts` を作る
5. `src/features/gacha-room/ui/use-gacha-room-screen.ts` を作る
6. `src/usecases/*` に interface と mock 実装を追加する

