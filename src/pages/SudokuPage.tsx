import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, RotateCcw, Eraser, Lightbulb } from "lucide-react";
import {
  Board,
  Difficulty,
  cloneBoard,
  conflictsAt,
  generatePuzzle,
  isComplete,
} from "@/lib/sudoku";
import { toast } from "sonner";

type Cell = { r: number; c: number };

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Leicht" },
  { id: "medium", label: "Mittel" },
  { id: "hard", label: "Schwer" },
];

const SudokuPage = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<Board | null>(null);
  const [solution, setSolution] = useState<Board | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [loading, setLoading] = useState(true);
  const [won, setWon] = useState(false);

  const generate = (d: Difficulty) => {
    setLoading(true);
    setWon(false);
    setSelected(null);
    // defer to next tick so the spinner can render
    setTimeout(() => {
      const { puzzle: p, solution: s } = generatePuzzle(d);
      setPuzzle(p);
      setSolution(s);
      setBoard(cloneBoard(p));
      setLoading(false);
    }, 30);
  };

  useEffect(() => {
    generate(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    if (board && !loading && isComplete(board)) {
      setWon(true);
    }
  }, [board, loading]);

  const isGiven = (r: number, c: number) => !!puzzle && puzzle[r][c] !== 0;

  const setValue = (val: number) => {
    if (!selected || !board) return;
    const { r, c } = selected;
    if (isGiven(r, c)) return;
    const nb = cloneBoard(board);
    nb[r][c] = nb[r][c] === val ? 0 : val;
    setBoard(nb);
  };

  const erase = () => {
    if (!selected || !board) return;
    const { r, c } = selected;
    if (isGiven(r, c)) return;
    const nb = cloneBoard(board);
    nb[r][c] = 0;
    setBoard(nb);
  };

  const hint = () => {
    if (!selected || !board || !solution) {
      toast.info("Wähle zuerst ein Feld");
      return;
    }
    const { r, c } = selected;
    if (isGiven(r, c)) return;
    const nb = cloneBoard(board);
    nb[r][c] = solution[r][c];
    setBoard(nb);
  };

  const reset = () => {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setWon(false);
    setSelected(null);
  };

  const counts = useMemo(() => {
    const c = Array(10).fill(0);
    if (!board) return c;
    for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) c[board[r][cc]]++;
    return c;
  }, [board]);

  const selVal = selected && board ? board[selected.r][selected.c] : 0;

  return (
    <div className="px-4 pt-4 pb-32 onboarding-slide min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/experiment")}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[18px]">Sudoku</h1>
        <button
          onClick={reset}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Zurücksetzen"
        >
          <RotateCcw className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Difficulty selector */}
      <div
        className="grid grid-cols-3 gap-1 p-1 rounded-[14px] mb-4"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            onClick={() => setDifficulty(d.id)}
            className="py-2 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{
              background: difficulty === d.id ? "rgba(255,255,255,0.14)" : "transparent",
              color: difficulty === d.id ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Board */}
      <div
        className="relative mx-auto aspect-square w-full max-w-[400px] rounded-[12px] overflow-hidden select-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.25)",
        }}
      >
        {loading || !board ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Generiere Rätsel …
          </div>
        ) : (
          <div className="grid grid-cols-9 grid-rows-9 w-full h-full">
            {board.map((row, r) =>
              row.map((val, c) => {
                const given = isGiven(r, c);
                const isSel = selected?.r === r && selected?.c === c;
                const sameRowCol =
                  selected && (selected.r === r || selected.c === c ||
                    (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                      Math.floor(selected.c / 3) === Math.floor(c / 3)));
                const sameVal = selVal !== 0 && val === selVal;
                const bad = conflictsAt(board, r, c);
                const borderRight = (c + 1) % 3 === 0 && c !== 8;
                const borderBottom = (r + 1) % 3 === 0 && r !== 8;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => setSelected({ r, c })}
                    className="flex items-center justify-center text-[18px] font-semibold transition-colors"
                    style={{
                      borderRight: borderRight
                        ? "2px solid rgba(255,255,255,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderBottom: borderBottom
                        ? "2px solid rgba(255,255,255,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: isSel
                        ? "rgba(139,92,246,0.35)"
                        : sameVal
                        ? "rgba(139,92,246,0.18)"
                        : sameRowCol
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                      color: bad
                        ? "hsl(0 80% 70%)"
                        : given
                        ? "hsl(var(--foreground))"
                        : "hsl(265 90% 78%)",
                    }}
                  >
                    {val === 0 ? "" : val}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {won && (
        <div
          className="mt-4 mx-auto max-w-[400px] text-center p-3 rounded-[12px] text-sm font-semibold"
          style={{
            background: "rgba(139,92,246,0.18)",
            border: "1px solid rgba(139,92,246,0.4)",
            color: "hsl(var(--foreground))",
          }}
        >
          🎉 Gelöst! Stark gemacht.
        </div>
      )}

      {/* Action row */}
      <div className="mt-4 mx-auto max-w-[400px] grid grid-cols-3 gap-2">
        <button
          onClick={erase}
          className="py-2.5 rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Eraser className="w-4 h-4" /> Löschen
        </button>
        <button
          onClick={hint}
          className="py-2.5 rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Lightbulb className="w-4 h-4" /> Hinweis
        </button>
        <button
          onClick={() => generate(difficulty)}
          className="py-2.5 rounded-[12px] text-[13px] font-semibold active:scale-95 transition-transform"
          style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)" }}
        >
          Neu
        </button>
      </div>

      {/* Number pad */}
      <div className="mt-3 mx-auto max-w-[400px] grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const done = counts[n] >= 9;
          return (
            <button
              key={n}
              onClick={() => setValue(n)}
              disabled={done}
              className="aspect-square rounded-[10px] text-[18px] font-bold active:scale-95 transition-all"
              style={{
                background: done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: done ? "hsl(var(--muted-foreground) / 0.4)" : "hsl(var(--foreground))",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SudokuPage;