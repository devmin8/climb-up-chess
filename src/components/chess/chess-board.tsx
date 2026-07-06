"use client";

import { GameStatus } from "~/components/chess/game-status";
import { PromotionPicker } from "~/components/chess/promotion-picker";
import { useChessGame } from "~/utils/chess/use-chess-game";

/**
 * A complete, playable two-player chess board: legal moves only, turns
 * enforced, promotion and check/checkmate/stalemate handled. No timers,
 * move list, or takeback UI here - those are one-line additions on top of
 * `useChessGame`'s `game` and `snapshot` (e.g. `game.undo()`, `snapshot.history`).
 */
export function ChessBoard() {
  const {
    snapshot,
    boardRef,
    boardOrientation,
    pendingPromotion,
    resolvePromotion,
    cancelPromotion,
  } = useChessGame();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[min(90vw,560px)] w-[min(90vw,560px)]">
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
  );
}
