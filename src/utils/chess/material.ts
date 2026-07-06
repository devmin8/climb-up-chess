import type { Color, MoveRecord, PieceSymbol } from "~/utils/chess/chess-game";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface MaterialSummary {
  /** Opposing pieces each color has captured so far, most valuable first. */
  capturedBy: Record<Color, PieceSymbol[]>;
  /** Material lead in pawns from each color's perspective. At most one side is nonzero. */
  advantage: Record<Color, number>;
}

/**
 * Tallies captures and material advantage from a move history (pass a slice
 * to get the tally as of any past ply). Derived purely from moves rather than
 * the board so it also knows *who* captured each piece, which a position
 * alone can't tell.
 */
export function summarizeMaterial(
  history: readonly MoveRecord[],
): MaterialSummary {
  const capturedBy: Record<Color, PieceSymbol[]> = { white: [], black: [] };
  let balance = 0; // positive = white ahead
  for (const move of history) {
    const sign = move.color === "white" ? 1 : -1;
    if (move.captured) {
      capturedBy[move.color].push(move.captured);
      balance += sign * PIECE_VALUES[move.captured];
    }
    // A promotion is a material swing too: a pawn became a stronger piece.
    if (move.promotion) {
      balance += sign * (PIECE_VALUES[move.promotion] - PIECE_VALUES.p);
    }
  }
  capturedBy.white.sort(byValueDescending);
  capturedBy.black.sort(byValueDescending);
  return {
    capturedBy,
    advantage: { white: Math.max(balance, 0), black: Math.max(-balance, 0) },
  };
}

function byValueDescending(a: PieceSymbol, b: PieceSymbol): number {
  return PIECE_VALUES[b] - PIECE_VALUES[a];
}
