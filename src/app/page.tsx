import { ChessBoard } from "~/components/chess/chess-board";
import { ThemeToggle } from "~/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-end border-b p-4">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Climb Up Chess
        </h1>
        <ChessBoard />
      </main>
    </div>
  );
}
