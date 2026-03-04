import { useEffect, useMemo, useState } from 'react';

import { MockLoadGachaLobbyUseCase, MockRollGachaUseCase } from '@/usecases/gacha-room/mock-gacha-room-usecases';
import { GachaBanner } from '@/usecases/gacha-room/load-gacha-lobby-usecase';

export type GachaRoomVM = {
  selectedKey: GachaBanner['key'];
  setSelectedKey: (key: GachaBanner['key']) => void;
  banners: GachaBanner[];
  pawnCurrency: number;
  goldCurrency: number;
  history: string[];
  statusText: string;
  roll: () => Promise<void>;
};

export function useGachaRoomScreen(): GachaRoomVM {
  const [selectedKey, setSelectedKey] = useState<GachaBanner['key']>('ukanmuri');
  const [banners, setBanners] = useState<GachaBanner[]>([]);
  const [pawnCurrency, setPawnCurrency] = useState(0);
  const [goldCurrency, setGoldCurrency] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('ガチャ球を回して結果を確認しよう！');

  const loadUseCase = useMemo(() => new MockLoadGachaLobbyUseCase(), []);
  const rollUseCase = useMemo(() => new MockRollGachaUseCase(), []);

  useEffect(() => {
    let active = true;
    loadUseCase.execute().then((snapshot) => {
      if (!active) return;
      setBanners(snapshot.banners);
      setPawnCurrency(snapshot.pawnCurrency);
      setGoldCurrency(snapshot.goldCurrency);
      setHistory(snapshot.history);
    });
    return () => {
      active = false;
    };
  }, [loadUseCase]);

  async function roll() {
    const result = await rollUseCase.execute({ gachaId: selectedKey });
    setStatusText(result.label);
  }

  return {
    selectedKey,
    setSelectedKey,
    banners,
    pawnCurrency,
    goldCurrency,
    history,
    statusText,
    roll,
  };
}
