import {
  Chess as ChessJs,
  type Move as ChessJsMove,
  type PieceSymbol as ChessJsPieceSymbol,
  type Square as ChessJsSquare,
} from "chess.js";

/** A board square, e.g. "e4". Re-exported from chess.js so the whole app shares one definition. */
export type Square = ChessJsSquare;

/** A piece in algebraic shorthand: p, n, b, r, q, or k. Re-exported from chess.js. */
export type PieceSymbol = ChessJsPieceSymbol;

export type Color = "white" | "black";

/** The pieces a pawn can promote to. */
export type PromotionPiece = "q" | "r" | "b" | "n";

/** A single played move, shaped for UI consumption (move lists, notations, etc). */
export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PromotionPiece;
  isCapture: boolean;
}

/** The state of the game right now, from "still playing" to a finished result. */
export type GameStatus =
  | { kind: "playing" }
  | { kind: "check" }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw" };

export interface ChessGameSnapshot {
  fen: string;
  turn: Color;
  status: GameStatus;
  lastMove: { from: Square; to: Square } | null;
  history: MoveRecord[];
}

type Listener = (snapshot: ChessGameSnapshot) => void;

/**
 * Framework-agnostic chess rules engine for a single game.
 *
 * Wraps chess.js behind a small, purpose-built surface: whose turn it is,
 * which moves are legal, applying a move, and the resulting game status.
 * Nothing here knows about React or chessground - callers subscribe via
 * `onChange` and render whatever they need from the snapshot.
 *
 * The surface is intentionally broader than the current UI needs (undo,
 * full move history, FEN load/save) so that a move list, takeback, or
 * position setup can be built later without touching this class.
 */
export class ChessGame {
  private readonly chess: ChessJs;
  private readonly listeners = new Set<Listener>();

  constructor(fen?: string) {
    this.chess = fen ? new ChessJs(fen) : new ChessJs();
  }

  get turn(): Color {
    return this.chess.turn() === "w" ? "white" : "black";
  }

  get fen(): string {
    return this.chess.fen();
  }

  /** Legal destination squares for every piece that can currently move, keyed by origin. Feeds chessground's `movable.dests`. */
  get legalDestinations(): Map<Square, Square[]> {
    const destinations = new Map<Square, Square[]>();
    for (const move of this.chess.moves({ verbose: true })) {
      const from = move.from as Square;
      const existing = destinations.get(from);
      if (existing) existing.push(move.to as Square);
      else destinations.set(from, [move.to as Square]);
    }
    return destinations;
  }

  get history(): MoveRecord[] {
    return this.chess.history({ verbose: true }).map(toMoveRecord);
  }

  get status(): GameStatus {
    if (this.chess.isCheckmate()) {
      return {
        kind: "checkmate",
        winner: this.turn === "white" ? "black" : "white",
      };
    }
    if (this.chess.isStalemate()) return { kind: "stalemate" };
    // Checked directly, rather than via `isDraw()`, which would redundantly
    // re-check stalemate (already ruled out above) on every ordinary move.
    if (
      this.chess.isInsufficientMaterial() ||
      this.chess.isThreefoldRepetition() ||
      this.chess.isDrawByFiftyMoves()
    ) {
      return { kind: "draw" };
    }
    if (this.chess.isCheck()) return { kind: "check" };
    return { kind: "playing" };
  }

  /** A plain object with everything a UI typically needs to render, in one read. */
  get snapshot(): ChessGameSnapshot {
    // `lastMove` is derived from `history` rather than fetched separately -
    // chess.js's `history()` replays the whole game to build it, so it
    // should only be computed once per snapshot.
    const history = this.history;
    const last = history[history.length - 1];
    return {
      fen: this.fen,
      turn: this.turn,
      status: this.status,
      lastMove: last ? { from: last.from, to: last.to } : null,
      history,
    };
  }

  /** Whether playing `from` -> `to` requires choosing a promotion piece. */
  isPromotion(from: Square, to: Square): boolean {
    return this.chess
      .moves({ square: from, verbose: true })
      .some((move) => move.to === to && move.isPromotion());
  }

  /** Plays a move. Returns the resulting move record, or null if it was illegal. */
  move(
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ): MoveRecord | null {
    try {
      const played = this.chess.move({ from, to, promotion });
      this.notify();
      return toMoveRecord(played);
    } catch {
      return null;
    }
  }

  /** Reverts the most recently played move (a takeback). Returns it, or null if there was none. */
  undo(): MoveRecord | null {
    const undone = this.chess.undo();
    if (!undone) return null;
    this.notify();
    return toMoveRecord(undone);
  }

  /** Restarts the game from the standard starting position. */
  reset(): void {
    this.chess.reset();
    this.notify();
  }

  /** Loads an arbitrary position, e.g. to resume a saved game or set up a puzzle. */
  loadFen(fen: string): void {
    this.chess.load(fen);
    this.notify();
  }

  /** Subscribes to every state change (move, undo, reset, FEN load). Returns an unsubscribe function. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}

function toMoveRecord(move: ChessJsMove): MoveRecord {
  return {
    san: move.san,
    from: move.from as Square,
    to: move.to as Square,
    color: move.color === "w" ? "white" : "black",
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion as PromotionPiece | undefined,
    isCapture: move.isCapture(),
  };
}
