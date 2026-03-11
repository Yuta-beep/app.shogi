import type { StageNodeData } from '@/domain/models/stage-select';
import { useEffect, useMemo, useState } from 'react';

import { stageRanges } from '@/constants/stage-select-data';
import {
  createLoadStageSelectUseCase,
  createSelectStageUseCase,
} from '@/usecases/stage-select/create-stage-select-usecases';
import { LoadStageSelectWithProgressUseCase } from '@/usecases/stage-select/load-stage-select-with-progress-usecase';

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

function resolveInitialFocusStage(nodes: StageNodeData[]): StageNodeData | null {
  if (nodes.length === 0) return null;

  const nextChallenge = nodes.find((node) => node.isUnlocked && !node.isCleared);
  if (nextChallenge) return nextChallenge;

  const unlockedStages = nodes.filter((node) => node.isUnlocked);
  if (unlockedStages.length > 0) {
    return unlockedStages[unlockedStages.length - 1] ?? null;
  }

  return nodes[0] ?? null;
}

export function useStageSelectScreen(): StageSelectScreenVM {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [nodes, setNodes] = useState<StageNodeData[]>([]);

  const loadStageSelectUseCase = useMemo(() => createLoadStageSelectUseCase(), []);
  const loadStageSelectWithProgressUseCase = useMemo(
    () => new LoadStageSelectWithProgressUseCase(loadStageSelectUseCase),
    [loadStageSelectUseCase],
  );
  const selectStageUseCase = useMemo(() => createSelectStageUseCase(), []);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const computedNodes = await loadStageSelectWithProgressUseCase.execute();
        if (active) {
          setNodes(computedNodes);
          const focusedNode = resolveInitialFocusStage(computedNodes);
          if (focusedNode) {
            setCurrentPage(focusedNode.page);
            setSelectedStageId(focusedNode.id);
          } else {
            setCurrentPage(1);
            setSelectedStageId(null);
          }
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
  }, [loadStageSelectWithProgressUseCase]);

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
