import { ChessBoard } from "~/components/chess/chess-board";
import { ThemeToggle } from "~/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h1 className="text-sm font-semibold tracking-wide">Climb Up Chess</h1>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center bg-linear-to-b from-background to-muted/60 p-6">
        <ChessBoard />
      </main>
    </div>
  );
}
