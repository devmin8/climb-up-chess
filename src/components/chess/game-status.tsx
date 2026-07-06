import type {
  Color,
  GameStatus as GameStatusValue,
} from "~/utils/chess/chess-game";

export function GameStatus({
  status,
  turn,
}: {
  status: GameStatusValue;
  turn: Color;
}) {
  return (
    <p className="text-center text-sm font-medium text-muted-foreground">
      {statusText(status, turn)}
    </p>
  );
}

function statusText(status: GameStatusValue, turn: Color): string {
  switch (status.kind) {
    case "checkmate":
      return `Checkmate — ${label(status.winner)} wins`;
    case "stalemate":
      return "Stalemate — draw";
    case "draw":
      return "Draw";
    case "check":
      return `${label(turn)} to move — check`;
    default:
      return `${label(turn)} to move`;
  }
}

function label(color: Color): string {
  return color === "white" ? "White" : "Black";
}
