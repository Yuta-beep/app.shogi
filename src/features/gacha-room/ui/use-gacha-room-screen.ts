import { useEffect, useMemo, useState } from 'react';

import { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';
import {
  MockLoadGachaLobbyUseCase,
  MockRollGachaUseCase,
} from '@/usecases/gacha-room/mock-gacha-room-usecases';
import { RollGachaResult } from '@/usecases/gacha-room/roll-gacha-usecase';

export type GachaPhase = 'idle' | 'video' | 'pieceOverlay' | 'done';

export type GachaRoomVM = {
  isLoading: boolean;
  selectedKey: GachaBanner['key'];
  setSelectedKey: (key: GachaBanner['key']) => void;
  banners: GachaBanner[];
  pawnCurrency: number;
  goldCurrency: number;
  phase: GachaPhase;
  lastResult: RollGachaResult | null;
  roll: () => Promise<void>;
  onVideoEnd: () => void;
  onPieceOverlayDismiss: () => void;
};

export function useGachaRoomScreen(): GachaRoomVM {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<GachaBanner['key']>('ukanmuri');
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [pawnCurrency, setPawnCurrency] = useState(0);
  const [goldCurrency, setGoldCurrency] = useState(0);
  const [phase, setPhase] = useState<GachaPhase>('idle');
  const [lastResult, setLastResult] = useState<RollGachaResult | null>(null);

  const loadUseCase = useMemo(() => new MockLoadGachaLobbyUseCase(), []);
  const rollUseCase = useMemo(() => new MockRollGachaUseCase(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadUseCase
      .execute()
      .then((snapshot) => {
        if (!active) return;
        setBanners(snapshot.banners);
        setPawnCurrency(snapshot.pawnCurrency);
        setGoldCurrency(snapshot.goldCurrency);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadUseCase]);

  async function roll() {
    if (phase !== 'idle') return;
    setPhase('video');
    const result = await rollUseCase.execute({ gachaId: selectedKey });
    setLastResult(result);
    if (result.type === 'miss') {
      setPawnCurrency((prev) => (result.currency === 'pawn' ? prev + result.amount : prev));
      setGoldCurrency((prev) => (result.currency === 'gold' ? prev + result.amount : prev));
    }
  }

  function onVideoEnd() {
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
    selectedKey,
    setSelectedKey,
    banners,
    pawnCurrency,
    goldCurrency,
    phase,
    lastResult,
    roll,
    onVideoEnd,
    onPieceOverlayDismiss,
  };
}
