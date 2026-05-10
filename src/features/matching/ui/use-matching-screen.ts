import { useEffect, useRef, useState } from 'react';

import type { MatchingSnapshot } from '@/domain/models/online-match';
import { getMatchingServerWsBaseUrl } from '@/lib/config/online-match';
import { loadCurrentBattleSetupId } from '@/lib/online-match/current-battle-setup';
import { supabase } from '@/lib/supabase/supabase-client';

const emptySnapshot: MatchingSnapshot = {
  title: 'オンライン対戦',
  status: '読み込み中',
  progress: 0,
};

export function useMatchingScreen() {
  const [snapshot, setSnapshot] = useState<MatchingSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [startedMatchId, setStartedMatchId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const start = async () => {
      const wsBaseUrl = getMatchingServerWsBaseUrl();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      const battleSetupId = await loadCurrentBattleSetupId();

      if (!active) return;

      if (!battleSetupId) {
        setSnapshot({
          title: 'オンライン対戦',
          status: '対戦準備が未保存です',
          progress: 0,
        });
        setIsLoading(false);
        return;
      }

      if (!userId || !wsBaseUrl) {
        setSnapshot({
          title: 'オンライン対戦',
          status: wsBaseUrl ? 'ログインが必要です' : '接続先が未設定です',
          progress: 0,
        });
        setIsLoading(false);
        return;
      }

      const url = new URL(`${wsBaseUrl}/ws`);
      url.searchParams.set('userId', userId);
      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        if (!active) return;
        ws.send(
          JSON.stringify({
            action: 'enter_queue',
            requestId: `req_${Date.now()}`,
            userId,
            rating: 1500,
            battleSetupId,
          }),
        );
      });

      ws.addEventListener('message', (event) => {
        const payload = JSON.parse(String(event.data)) as
          | {
              type: 'queue_entered';
            }
          | {
              type: 'match_found';
              matchId: string;
              role: 'black' | 'white';
            }
          | {
              type: 'game_started';
              matchId: string;
            }
          | {
              type: 'opponent_disconnected';
            }
          | {
              type: 'error';
              message: string;
            };

        if (!active) return;

        switch (payload.type) {
          case 'queue_entered':
            setSnapshot({
              title: 'オンライン対戦',
              status: '対戦相手を探しています',
              progress: 35,
            });
            setIsLoading(false);
            return;
          case 'match_found':
            setSnapshot({
              title: 'オンライン対戦',
              status: `対戦相手が見つかりました（${payload.role === 'black' ? '先手' : '後手'}）`,
              progress: 85,
            });
            return;
          case 'game_started':
            setSnapshot({
              title: 'オンライン対戦',
              status: '対局を開始します',
              progress: 100,
            });
            setIsLoading(false);
            setStartedMatchId(payload.matchId);
            return;
          case 'opponent_disconnected':
            setSnapshot((current) => ({
              ...current,
              status: '相手の再接続を待っています',
            }));
            return;
          case 'error':
            setSnapshot({
              title: 'オンライン対戦',
              status: payload.message,
              progress: 0,
            });
            setIsLoading(false);
        }
      });

      ws.addEventListener('error', () => {
        if (!active) return;
        setSnapshot({
          title: 'オンライン対戦',
          status: '接続エラーが発生しました',
          progress: 0,
        });
        setIsLoading(false);
      });

      ws.addEventListener('close', () => {
        if (!active || startedMatchId) return;
        setSnapshot((current) => ({
          ...current,
          status: current.progress > 0 ? '接続が終了しました' : current.status,
        }));
        setIsLoading(false);
      });
    };

    void start();

    return () => {
      active = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  async function cancel() {
    wsRef.current?.close();
    wsRef.current = null;
  }

  return { snapshot, isLoading, cancel, startedMatchId };
}
