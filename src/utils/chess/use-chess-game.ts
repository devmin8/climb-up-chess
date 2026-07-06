"use client";

import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Dests, Key } from "@lichess-org/chessground/types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChessGame,
  type ChessGameSnapshot,
  type Color,
  type GameStatus,
  type MoveRecord,
  opposite,
  type PromotionPiece,
  type Square,
} from "~/utils/chess/chess-game";

/** The board stays fixed with white at the bottom; it does not flip per turn. */
const BOARD_ORIENTATION: Color = "white";

// Typed against `GameStatus["kind"]` so this set can't silently drift out of
// sync if that union ever gains or renames a terminal state.
const GAME_OVER_KINDS: ReadonlySet<GameStatus["kind"]> = new Set([
  "checkmate",
  "stalemate",
  "draw",
]);

interface PendingPromotion {
  from: Square;
  to: Square;
  color: Color;
}

/**
 * Everything chessground needs to render one position — either the live game
 * or a past ply being browsed. Collapsing both cases into this one shape
 * means the board-sync code doesn't know or care which it's showing.
 */
interface BoardView {
  fen: string;
  turn: Color;
  check: boolean;
  lastMove: { from: Square; to: Square } | null;
  viewOnly: boolean;
  dests: Map<Square, Square[]>;
}

/**
 * Everything a two-player chess board needs, in one hook: owns the rules
 * engine, mounts chessground onto whatever element `boardRef` is attached
 * to, keeps the two in sync as moves are played, and manages the
 * promotion-piece prompt. A component only has to render `<div ref={boardRef} />`
 * plus whatever it wants to show for `snapshot` and `pendingPromotion`.
 *
 * History browsing: `goToPly` shows any past position (0 = start,
 * `history.length` = latest). While browsing, the board is view-only;
 * navigating back to the latest ply resumes live play.
 *
 * `initialFen` is read once when the game is created; to change position
 * later, call `game.loadFen()` or remount with a React `key`.
 */
export function useChessGame(initialFen?: string) {
  // useState, not useMemo: a memo is a discardable cache, and losing this
  // instance would silently reset the game. useState guarantees stability.
  const [game] = useState(() => new ChessGame(initialFen));
  const [snapshot, setSnapshot] = useState<ChessGameSnapshot>(
    () => game.snapshot,
  );
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  // null = follow the live game; a number = browsing that ply of history.
  const [viewedPly, setViewedPly] = useState<number | null>(null);

  useEffect(() => {
    // Sync once on subscribe, then follow every engine change.
    setSnapshot(game.snapshot);
    return game.onChange(setSnapshot);
  }, [game]);

  const plyCount = snapshot.history.length;
  // Clamped so an undo/reset shrinking the history can't strand the view.
  const currentPly = Math.min(viewedPly ?? plyCount, plyCount);
  const isGameOver = GAME_OVER_KINDS.has(snapshot.status.kind);

  const boardView = useMemo<BoardView>(() => {
    if (currentPly < plyCount) {
      return historicalBoardView(snapshot.history, currentPly);
    }
    return {
      fen: snapshot.fen,
      turn: snapshot.turn,
      check:
        snapshot.status.kind === "check" ||
        snapshot.status.kind === "checkmate",
      lastMove: snapshot.lastMove,
      viewOnly: isGameOver,
      dests: game.legalDestinations,
    };
  }, [game, snapshot, currentPly, plyCount, isGameOver]);

  function attemptMove(from: Square, to: Square): void {
    if (game.isPromotion(from, to)) {
      setPendingPromotion({ from, to, color: game.turn });
      return;
    }
    // chessground already moved the piece optimistically before calling us.
    // If the engine rejects it (should only happen for a move outside the
    // `dests` we gave it), `snapshot` never changes, so nothing would
    // otherwise undo that optimistic move - force the board back in sync.
    if (!game.move(from, to)) resync();
  }

  function resolvePromotion(piece: PromotionPiece): void {
    if (!pendingPromotion) return;
    game.move(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }

  function cancelPromotion(): void {
    setPendingPromotion(null);
    // The engine was never mutated, so chessground's own optimistic move
    // (it moves the piece before `after` even fires) needs to be explicitly
    // reverted - nothing about clearing `pendingPromotion` alone changes
    // `snapshot`, so the usual snapshot-driven sync effect wouldn't run.
    resync();
  }

  /** Shows the position after `ply` half-moves (clamped to the game's range). */
  function goToPly(ply: number): void {
    // Navigating away abandons an unanswered promotion prompt.
    if (pendingPromotion) cancelPromotion();
    const clamped = Math.max(0, Math.min(ply, plyCount));
    // Landing back on the latest move resumes following the live game.
    setViewedPly(clamped === plyCount ? null : clamped);
  }

  const { boardRef, resync } = useChessgroundBoard(boardView, attemptMove);

  return {
    game,
    snapshot,
    boardRef,
    boardOrientation: BOARD_ORIENTATION,
    pendingPromotion,
    resolvePromotion,
    cancelPromotion,
    currentPly,
    goToPly,
  };
}

/**
 * The board view for a past position. Only called with `ply < history.length`,
 * so `history` is never empty here. Check status is read off the SAN suffix -
 * chess.js already annotated it when the move was played.
 */
function historicalBoardView(
  history: readonly MoveRecord[],
  ply: number,
): BoardView {
  const played = ply > 0 ? history[ply - 1] : null;
  return {
    fen: played ? played.fenAfter : history[0].fenBefore,
    turn: played ? opposite(played.color) : history[0].color,
    check: played ? /[+#]$/.test(played.san) : false,
    lastMove: played ? { from: played.from, to: played.to } : null,
    viewOnly: true,
    dests: new Map(),
  };
}

/** Mounts a chessground instance on the returned ref and keeps it synced to the given view. */
function useChessgroundBoard(
  view: BoardView,
  onMove: (from: Square, to: Square) => void,
) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  // Kept fresh via ref so the mount effect below can stay mount-only:
  // chessground's `after` callback is set once and should never go stale.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  function resync(): void {
    apiRef.current?.set({
      fen: view.fen,
      orientation: BOARD_ORIENTATION,
      turnColor: view.turn,
      check: view.check,
      lastMove: toLastMove(view.lastMove),
      viewOnly: view.viewOnly,
      movable: {
        color: view.viewOnly ? undefined : view.turn,
        dests: toDests(view.dests),
      },
    });
  }

  // Mount once, with only the static wiring that can't be changed via
  // `set()`. All position/turn/dests state is applied by the sync effect
  // below, which runs immediately after this one (same effect flush, so
  // nothing paints in between) - keeping the board config in one place.
  useEffect(() => {
    if (!boardRef.current) return;

    const api = Chessground(boardRef.current, {
      orientation: BOARD_ORIENTATION,
      highlight: { lastMove: true, check: true },
      movable: {
        free: false,
        events: {
          after: (from, to) => onMoveRef.current(from as Square, to as Square),
        },
      },
    });
    apiRef.current = api;

    return () => api.destroy();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resync reads the current view each render; `view` is memoized upstream, so this runs exactly when the position to display changes
  useEffect(resync, [view]);

  return { boardRef, resync };
}

/**
 * Converts the engine's legal-move map into the shape chessground expects
 * for `movable.dests`. The square types are structurally identical (chess.js
 * squares are a subset of chessground's `Key`); this is the one place that
 * fact is asserted, so the rest of the app can stay in engine types.
 */
function toDests(destinations: Map<Square, Square[]>): Dests {
  const dests: Dests = new Map();
  destinations.forEach((squares, from) => {
    dests.set(from as Key, squares as Key[]);
  });
  return dests;
}

function toLastMove(
  lastMove: { from: Square; to: Square } | null,
): [Key, Key] | undefined {
  return lastMove ? [lastMove.from as Key, lastMove.to as Key] : undefined;
}
