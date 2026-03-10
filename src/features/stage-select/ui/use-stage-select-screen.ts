import type { StageNodeData } from '@/domain/models/stage-select';
import { useEffect, useMemo, useState } from 'react';

import { stageRanges } from '@/constants/stage-select-data';
import { StageProgressApiDataSource } from '@/infra/datasources/stage-progress-api-datasource';
import { createLoadStageSelectUseCase, createSelectStageUseCase } from '@/infra/di/usecase-factory';
import { supabase } from '@/lib/supabase/supabase-client';

export type StageSelectScreenVM = {
  isLoading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  ranges: typeof stageRanges;
  nodesInPage: StageNodeData[];
  selectedStageId: number | null;
  selectedStage: StageNodeData | null;
  selectStage: (stageId: number) => Promise<void>;
};

export function useStageSelectScreen(): StageSelectScreenVM {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [nodes, setNodes] = useState<StageNodeData[]>([]);

  const loadStageSelectUseCase = useMemo(() => createLoadStageSelectUseCase(), []);
  const selectStageUseCase = useMemo(() => createSelectStageUseCase(), []);
  const stageProgressDataSource = useMemo(() => new StageProgressApiDataSource(), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const [snapshot, sessionResult] = await Promise.all([
          loadStageSelectUseCase.execute(),
          supabase.auth.getSession(),
        ]);

        const token = sessionResult.data.session?.access_token ?? null;
        let clearedStageNos = new Set<number>();

        if (token) {
          try {
            const progress = await stageProgressDataSource.getStageProgress(token);
            clearedStageNos = new Set(progress.clearedStageNos);
          } catch (error) {
            console.warn('[stage-select] failed to load stage progress from API', error);
          }
        }

        const computedNodes = snapshot.nodes.map((node) => {
          const unlockedByStageProgress =
            node.unlockStageNo == null || clearedStageNos.has(node.unlockStageNo);
          const unlockedByServer = node.canStart ?? true;
          return {
            ...node,
            isCleared: clearedStageNos.has(node.id),
            isUnlocked: unlockedByStageProgress && unlockedByServer,
          };
        });

        if (active) {
          setNodes(computedNodes);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [loadStageSelectUseCase, stageProgressDataSource]);

  const nodesInPage = useMemo(
    () => nodes.filter((node) => node.page === currentPage),
    [currentPage, nodes],
  );
  const selectedStage = useMemo(
    () => nodes.find((node) => node.id === selectedStageId) ?? null,
    [nodes, selectedStageId],
  );

  async function selectStage(stageId: number) {
    const stage = nodes.find((node) => node.id === stageId);
    if (!stage || !stage.isUnlocked) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await selectStageUseCase.execute({ stageId });
      if (result.canStart) {
        setSelectedStageId(stageId);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    currentPage,
    setCurrentPage,
    ranges: stageRanges,
    nodesInPage,
    selectedStageId,
    selectedStage,
    selectStage,
  };
}
