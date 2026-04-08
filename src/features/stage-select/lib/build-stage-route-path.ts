import type { StageNodeData } from '@/domain/models/stage-select';

/**
 * viewBox 幅 1000 に合わせた X（`left` は 0–100 のパーセント）
 */
function nodeToSvgPoint(node: StageNodeData): { x: number; y: number } {
  return { x: node.left * 10, y: node.top };
}

/**
 * 同一ページのステージを ID 順に直線で結ぶ（曲線なし）
 */
export function buildStageRoutePathD(nodesOnPage: StageNodeData[]): string {
  const sorted = [...nodesOnPage].sort((a, b) => a.id - b.id);
  const points = sorted.map(nodeToSvgPoint);
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}
