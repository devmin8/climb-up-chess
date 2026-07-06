"use client";

import { MoveList } from "~/components/chess/move-list";
import { PlayerRow } from "~/components/chess/player-row";
import type { Color, MoveRecord } from "~/utils/chess/chess-game";
import { summarizeMaterial } from "~/utils/chess/material";

export interface GamePanelProps {
  history: readonly MoveRecord[];
  /** The ply shown on the board: 0 = start position, `history.length` = latest. */
  currentPly: number;
  onSelectPly: (ply: number) => void;
  /** Whose turn it is in the live game, or null once the game is over. */
  activeColor: Color | null;
}

/**
 * The lichess-style side panel: black's row on top (matching the fixed
 * white-at-bottom board), the browsable move list in the middle, white's row
 * at the bottom. Purely presentational - all game state comes in as props,
 * so it can later grow clocks or names without touching the chess logic.
 */
export function GamePanel({
  history,
  currentPly,
  onSelectPly,
  activeColor,
}: GamePanelProps) {
  // Material reflects the position being viewed, not just the live game.
  const material = summarizeMaterial(history.slice(0, currentPly));

  return (
    <aside className="flex w-[min(90vw,560px)] flex-col rounded-md border bg-card shadow-sm lg:w-72">
      <PlayerRow
        color="black"
        captured={material.capturedBy.black}
        advantage={material.advantage.black}
        isActive={activeColor === "black"}
      />
      <div className="flex min-h-0 flex-1 flex-col border-y">
        <MoveList
          history={history}
          currentPly={currentPly}
          onSelectPly={onSelectPly}
        />
      </div>
      <PlayerRow
        color="white"
        captured={material.capturedBy.white}
        advantage={material.advantage.white}
        isActive={activeColor === "white"}
      />
    </aside>
  );
}
