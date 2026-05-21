import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { enrichGachaBanner } from '@/constants/gacha-lineup-catalog';
import { resolveGachaRollCode } from '@/constants/gacha-room-assets';
import { ApiClientError } from '@/infra/http/api-client';
import { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import {
  createLoadGachaLobbyUseCase,
  createRollGachaUseCase,
} from '@/usecases/gacha-room/create-gacha-room-usecases';
import { RollGachaResult } from '@/usecases/gacha-room/roll-gacha-usecase';

export type GachaPhase = 'idle' | 'rolling' | 'video' | 'pieceOverlay' | 'done';

export type GachaRoomVM = {
  isLoading: boolean;
  /** ロビー取得失敗時のみ */
  loadError: string | null;
  reloadLobby: () => void;
  selectedKey: GachaBanner['key'];
  setSelectedKey: (key: GachaBanner['key']) => void;
  banners: GachaBanner[];
  pawnCurrency: number;
  goldCurrency: number;
  noticeMessage: string | null;
  phase: GachaPhase;
  lastResult: RollGachaResult | null;
  roll: (gachaKey?: GachaBanner['key']) => Promise<void>;
  onVideoEnd: () => void;
  onPieceOverlayDismiss: () => void;
};

export function useGachaRoomScreen(): GachaRoomVM {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<GachaBanner['key']>('ukanmuri');
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [pawnCurrency, setPawnCurrency] = useState(0);
  const [goldCurrency, setGoldCurrency] = useState(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<GachaPhase>('idle');
  const [lastResult, setLastResult] = useState<RollGachaResult | null>(null);
  const isRollingRef = useRef(false);

  const loadUseCase = useMemo(() => createLoadGachaLobbyUseCase(), []);
  const rollUseCase = useMemo(() => createRollGachaUseCase(), []);

  const reloadLobby = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    loadUseCase
      .execute()
      .then((snapshot) => {
        setBanners(snapshot.banners.map(enrichGachaBanner));
        if (snapshot.banners.length > 0) {
          setSelectedKey(snapshot.banners[0].key);
        }
        setPawnCurrency(snapshot.pawnCurrency);
        setGoldCurrency(snapshot.goldCurrency);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'ガチャ一覧の取得に失敗しました';
        setLoadError(msg);
        setBanners([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadUseCase]);

  useEffect(() => {
    reloadLobby();
  }, [reloadLobby]);

  async function roll(gachaKey?: GachaBanner['key']) {
    if (isRollingRef.current) return;
    if (phase !== 'idle' && phase !== 'done') return;
    const targetKey = gachaKey ?? selectedKey;
    isRollingRef.current = true;
    setSelectedKey(targetKey);
    setNoticeMessage(null);
    setPhase('rolling');
    setLastResult(null);
    try {
      const rollCode = resolveGachaRollCode(targetKey, banners);
      if (rollCode == null) {
        setNoticeMessage('このガチャは現在利用できません（サーバーに未登録の可能性があります）');
        setPhase('idle');
        return;
      }
      const result = await rollUseCase.execute({ gachaId: rollCode });
      setLastResult(result);
      setPawnCurrency(result.pawnCurrency);
      setGoldCurrency(result.goldCurrency);
      setPhase('video');
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.code === 'INSUFFICIENT_CURRENCY') {
        setNoticeMessage('効果が足りません');
        setPhase('idle');
        return;
      }
      if (error instanceof ApiClientError && error.code === 'NOT_FOUND') {
        setNoticeMessage('このガチャは現在利用できません');
        setPhase('idle');
        return;
      }
      console.error('[gacha-room] failed to roll gacha', error);
      setNoticeMessage('ガチャの実行に失敗しました。しばらくしてからお試しください');
      setPhase('idle');
    } finally {
      isRollingRef.current = false;
    }
  }

  function onVideoEnd() {
    if (!lastResult) {
      setPhase('idle');
      return;
    }

    if (lastResult?.type === 'hit') {
      setPhase('pieceOverlay');
    } else {
      setPhase('done');
    }
  }

  function onPieceOverlayDismiss() {
    setPhase('done');
  }

  return {
    isLoading,
    loadError,
    reloadLobby,
    selectedKey,
    setSelectedKey,
    banners,
    pawnCurrency,
    goldCurrency,
    noticeMessage,
    phase,
    lastResult,
    roll,
    onVideoEnd,
    onPieceOverlayDismiss,
  };
}
