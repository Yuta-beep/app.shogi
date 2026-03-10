export type StageRange = {
  page: number;
  label: string;
  start: number;
  end: number;
  height: number;
};

export type StageNodeData = {
  id: number;
  name: string;
  page: number;
  top: number;
  left: number;
  color: string;
  unlockPieces: string[];
};
