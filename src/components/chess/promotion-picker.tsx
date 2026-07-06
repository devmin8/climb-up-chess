"use client";

import type { Color, PromotionPiece, Square } from "~/utils/chess/chess-game";

const FILES = "abcdefgh";

const PROMOTION_CHOICES: readonly { piece: PromotionPiece; role: string }[] = [
  { piece: "q", role: "queen" },
  { piece: "n", role: "knight" },
  { piece: "r", role: "rook" },
  { piece: "b", role: "bishop" },
];

export interface PromotionPickerProps {
  /** The destination square of the promoting pawn. */
  square: Square;
  /** The color choosing a promotion piece. */
  color: Color;
  orientation: Color;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

/**
 * An overlay of four pieces stacked on the promotion square, mirroring how
 * lichess/chess.com let you pick a promotion piece in place. It reuses
 * chessground's own `<piece>` element and CSS classes (via `role color`) so
 * the artwork matches the board exactly, with no image assets of our own.
 *
 * Rendered as a sibling of the board, never inside chessground's mount
 * element - chessground clears that element's contents on every redraw.
 */
export function PromotionPicker({
  square,
  color,
  orientation,
  onSelect,
  onCancel,
}: PromotionPickerProps) {
  const { column, row } = squareToDisplayPosition(square, orientation);

  // Promotion always happens on the back rank, which displays as either the
  // top row or the bottom row depending on orientation. Stack the choices
  // toward the center of the board so they never run off the edge.
  const direction = row === 0 ? 1 : -1;

  return (
    <div className="absolute inset-0 z-10">
      <button
        type="button"
        aria-label="Cancel promotion"
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onCancel}
      />
      <div className="cg-wrap pointer-events-none absolute inset-0">
        {PROMOTION_CHOICES.map(({ piece, role }, index) => (
          <button
            key={piece}
            type="button"
            aria-label={`Promote to ${role}`}
            className="pointer-events-auto absolute top-0 left-0 h-[12.5%] w-[12.5%] cursor-pointer rounded-sm bg-white/90 shadow-md transition hover:bg-white"
            style={{
              transform: `translate(${column * 100}%, ${(row + direction * index) * 100}%)`,
            }}
            onClick={() => onSelect(piece)}
            // React rejects lowercase tags it doesn't recognize as HTML or a
            // hyphenated custom element - `<piece>` is neither, so it has to
            // be injected as a raw string instead of a JSX element. The
            // markup is fully static (role/color only ever come from
            // PROMOTION_CHOICES and the Color union), so there's nothing here
            // for dangerouslySetInnerHTML to be unsafe about.
            // biome-ignore lint/security/noDangerouslySetInnerHtml: role/color are fixed enum values from PROMOTION_CHOICES/Color, never user input
            dangerouslySetInnerHTML={{
              __html: `<piece class="${role} ${color} absolute top-0 left-0 h-full w-full"></piece>`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The zero-based (column, row) of a square as it's actually displayed on
 * screen, accounting for board orientation. (0, 0) is the top-left square
 * shown.
 */
function squareToDisplayPosition(
  square: Square,
  orientation: Color,
): { column: number; row: number } {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  const column = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 8 - rank : rank - 1;
  return { column, row };
}
