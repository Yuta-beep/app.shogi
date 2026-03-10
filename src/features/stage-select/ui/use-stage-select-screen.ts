import type { StageNodeData } from '@/domain/models/stage-select';
import { useEffect, useMemo, useState } from 'react';

import { stageRanges } from '@/constants/stage-select-data';
import { createLoadStageSelectUseCase, createSelectStageUseCase } from '@/infra/di/usecase-factory';

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

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadStageSelectUseCase
      .execute()
      .then((data) => {
        if (active) {
          setNodes(data.nodes);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadStageSelectUseCase]);

  const nodesInPage = useMemo(
    () => nodes.filter((node) => node.page === currentPage),
    [currentPage, nodes],
  );
  const selectedStage = useMemo(
    () => nodes.find((node) => node.id === selectedStageId) ?? null,
    [nodes, selectedStageId],
  );

  async function selectStage(stageId: number) {
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
