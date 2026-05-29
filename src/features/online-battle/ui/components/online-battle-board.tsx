import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BoardCell, BoardPiece } from '@/features/stage-shogi/domain/game-rules';
import { getPieceImageSource } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import { toViewCoord } from '@/lib/matching-server/game-bridge';
import type { PlayerSide } from '@/domain/matching-server/protocol';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const BOARD_SIZE = 9;

function isTargetCell(targets: BoardCell[], row: number, col: number) {
  return targets.some((t) => t.row === row && t.col === col);
}

export function OnlineBattleBoard(props: {
  boardSize: number;
  boardImage: number;
  pieces: BoardPiece[];
  myRole: PlayerSide;
  selectedCell: BoardCell | null;
  legalTargets: BoardCell[];
  enemyPreviewTargets?: BoardCell[];
  pieceDefsByCode: Record<string, PieceCatalogItem>;
  canInteract: boolean;
  onCellPress: (viewRow: number, viewCol: number) => void;
}) {
  const {
    boardSize,
    boardImage,
    pieces,
    myRole,
    selectedCell,
    legalTargets,
    enemyPreviewTargets = [],
    canInteract,
    onCellPress,
  } = props;
  const cellSize = boardSize / BOARD_SIZE;

  const piecesByView = pieces.map((piece) => {
    const view = toViewCoord(piece.row, piece.col, myRole);
    return { ...piece, viewRow: view.row, viewCol: view.col };
  });

  const selectedView = selectedCell
    ? toViewCoord(selectedCell.row, selectedCell.col, myRole)
    : null;
  const targetsView = legalTargets.map((t) => toViewCoord(t.row, t.col, myRole));
  const enemyTargetsView = enemyPreviewTargets.map((t) => toViewCoord(t.row, t.col, myRole));

  return (
    <View style={[styles.frame, { width: boardSize, height: boardSize }]}>
      <Image source={boardImage} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      {Array.from({ length: BOARD_SIZE }, (_, viewRow) =>
        Array.from({ length: BOARD_SIZE }, (_, viewCol) => {
          const isSelected =
            selectedView != null && selectedView.row === viewRow && selectedView.col === viewCol;
          const isTarget = isTargetCell(targetsView, viewRow, viewCol);
          const isEnemyTarget = isTargetCell(enemyTargetsView, viewRow, viewCol);
          return (
            <Pressable
              key={`cell-${viewRow}-${viewCol}`}
              disabled={!canInteract}
              onPress={() => onCellPress(viewRow, viewCol)}
              style={[
                styles.cell,
                {
                  left: viewCol * cellSize,
                  top: viewRow * cellSize,
                  width: cellSize,
                  height: cellSize,
                },
                isSelected && styles.cellSelected,
                isTarget && styles.cellTarget,
                isEnemyTarget && styles.cellEnemyTarget,
              ]}
            />
          );
        }),
      )}
      {piecesByView.map((piece) => {
        const source = getPieceImageSource({
          pieceCode: piece.pieceCode,
          char: piece.char,
        });
        return (
          <View
            key={`${piece.row}-${piece.col}-${piece.pieceCode}`}
            pointerEvents="none"
            style={[
              styles.pieceWrap,
              {
                left: piece.viewCol * cellSize,
                top: piece.viewRow * cellSize,
                width: cellSize,
                height: cellSize,
              },
            ]}
          >
            {source ? (
              <Image source={source} contentFit="contain" style={styles.pieceImage} />
            ) : (
              <Text style={styles.pieceFallback}>{piece.char}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a1810',
    position: 'relative',
  },
  cell: {
    position: 'absolute',
  },
  cellSelected: {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
  },
  cellTarget: {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
  },
  cellEnemyTarget: {
    backgroundColor: 'rgba(59, 130, 246, 0.45)',
  },
  pieceWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceImage: {
    width: '88%',
    height: '88%',
  },
  pieceFallback: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
});
