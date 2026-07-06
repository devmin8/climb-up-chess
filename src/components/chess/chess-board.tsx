"use client";

import { GamePanel } from "~/components/chess/game-panel";
import { GameStatus } from "~/components/chess/game-status";
import { PromotionPicker } from "~/components/chess/promotion-picker";
import { useChessGame } from "~/utils/chess/use-chess-game";

/**
 * A complete, playable two-player chess game: legal moves only, turns
 * enforced, promotion and check/checkmate/stalemate handled, plus the side
 * panel with the move list, history browsing, and captured material. No
 * timers or takeback UI yet - those are additions on top of `useChessGame`'s
 * `game` and `snapshot` (e.g. `game.undo()`).
 */
export function ChessBoard() {
  const {
    snapshot,
    boardRef,
    boardOrientation,
    pendingPromotion,
    resolvePromotion,
    cancelPromotion,
    currentPly,
    goToPly,
  } = useChessGame();

  const isGameOver =
    snapshot.status.kind === "checkmate" ||
    snapshot.status.kind === "stalemate" ||
    snapshot.status.kind === "draw";

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-[min(90vw,560px)] w-[min(90vw,560px)] overflow-hidden rounded-md shadow-lg ring-1 ring-border">
          <div ref={boardRef} className="h-full w-full" />
          {pendingPromotion && (
            <PromotionPicker
              square={pendingPromotion.to}
              color={pendingPromotion.color}
              orientation={boardOrientation}
              onSelect={resolvePromotion}
              onCancel={cancelPromotion}
            />
          )}
        </div>
        <GameStatus status={snapshot.status} turn={snapshot.turn} />
      </div>
      <GamePanel
        history={snapshot.history}
        currentPly={currentPly}
        onSelectPly={goToPly}
        activeColor={isGameOver ? null : snapshot.turn}
      />
    </div>
  );
}
