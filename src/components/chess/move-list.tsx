"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Fragment, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import type { MoveRecord } from "~/utils/chess/chess-game";
import { cn } from "~/utils/cn";

export interface MoveListProps {
  history: readonly MoveRecord[];
  /** The ply shown on the board: 0 = start position, `history.length` = latest. */
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/**
 * Numbered move list with click-to-jump, a first/prev/next/last toolbar, and
 * arrow-key navigation (left/right one move, up/down to start/end). All
 * navigation funnels through `onSelectPly`; the caller owns what "showing a
 * ply" means and is expected to clamp out-of-range values.
 */
export function MoveList({ history, currentPly, onSelectPly }: MoveListProps) {
  const currentMoveRef = useRef<HTMLButtonElement>(null);

  // Keep the highlighted move visible as the game grows or the user navigates.
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPly isn't read, but it decides which cell holds currentMoveRef - the scroll must re-run when it moves
  useEffect(() => {
    currentMoveRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") onSelectPly(currentPly - 1);
      else if (event.key === "ArrowRight") onSelectPly(currentPly + 1);
      else if (event.key === "ArrowUp") onSelectPly(0);
      else if (event.key === "ArrowDown") onSelectPly(history.length);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPly, history.length, onSelectPly]);

  function moveCell(move: MoveRecord, ply: number) {
    const isCurrent = ply === currentPly;
    return (
      <button
        type="button"
        ref={isCurrent ? currentMoveRef : undefined}
        className={cn(
          "px-2 py-1 text-left font-medium",
          isCurrent
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted hover:text-foreground",
        )}
        onClick={() => onSelectPly(ply)}
      >
        {move.san}
      </button>
    );
  }

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push(
      <Fragment key={i}>
        <span className="bg-muted/50 px-2 py-1 text-right text-muted-foreground tabular-nums">
          {i / 2 + 1}
        </span>
        {moveCell(history[i], i + 1)}
        {history[i + 1] ? moveCell(history[i + 1], i + 2) : <span />}
      </Fragment>,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col text-sm">
      <div className="flex justify-center gap-1 border-b p-1">
        <NavButton
          label="Go to start"
          disabled={currentPly === 0}
          onClick={() => onSelectPly(0)}
        >
          <ChevronsLeft />
        </NavButton>
        <NavButton
          label="Previous move"
          disabled={currentPly === 0}
          onClick={() => onSelectPly(currentPly - 1)}
        >
          <ChevronLeft />
        </NavButton>
        <NavButton
          label="Next move"
          disabled={currentPly === history.length}
          onClick={() => onSelectPly(currentPly + 1)}
        >
          <ChevronRight />
        </NavButton>
        <NavButton
          label="Go to latest move"
          disabled={currentPly === history.length}
          onClick={() => onSelectPly(history.length)}
        >
          <ChevronsRight />
        </NavButton>
      </div>
      <div className="max-h-72 grow overflow-y-auto lg:max-h-none">
        {rows.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground">No moves yet</p>
        ) : (
          <div className="grid grid-cols-[2.5rem_1fr_1fr]">{rows}</div>
        )}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
