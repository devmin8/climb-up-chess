import type { Color, PieceSymbol } from "~/utils/chess/chess-game";
import { cn } from "~/utils/cn";

// U+FE0E forces text rendering (some platforms turn these into emoji);
// the filled glyphs are used for both colors because they read best small.
const PIECE_GLYPHS: Record<PieceSymbol, string> = {
  p: "\u265F\uFE0E",
  n: "\u265E\uFE0E",
  b: "\u265D\uFE0E",
  r: "\u265C\uFE0E",
  q: "\u265B\uFE0E",
  k: "\u265A\uFE0E",
};

export interface PlayerRowProps {
  color: Color;
  /** Opposing pieces this player has captured, shown as small glyphs. */
  captured: readonly PieceSymbol[];
  /** This player's material lead in pawns; hidden unless positive. */
  advantage: number;
  /** Whether it's this player's turn; shows the "to move" indicator. */
  isActive: boolean;
}

/** One player's line in the game panel: color dot, name, turn indicator, and captured material. */
export function PlayerRow({
  color,
  captured,
  advantage,
  isActive,
}: PlayerRowProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          // Fixed piece colours (not theme tokens - a black piece is dark in
          // both themes); the border keeps whichever dot matches the surface
          // from disappearing into it.
          "size-3 shrink-0 rounded-full border border-foreground/30",
          color === "white" ? "bg-stone-100" : "bg-stone-900",
        )}
      />
      <span className="text-sm font-semibold">
        {color === "white" ? "White" : "Black"}
      </span>
      {isActive && (
        <span className="flex items-center" title="To move">
          <span
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-primary"
          />
          <span className="sr-only">to move</span>
        </span>
      )}
      <span className="ml-auto flex items-baseline gap-1 text-muted-foreground">
        <span className="text-base leading-none tracking-tighter">
          {captured.map((piece) => PIECE_GLYPHS[piece]).join("")}
        </span>
        {advantage > 0 && (
          <span className="text-xs font-medium">+{advantage}</span>
        )}
      </span>
    </div>
  );
}
