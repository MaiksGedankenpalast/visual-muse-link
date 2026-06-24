import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Trash2 } from "lucide-react";
import { Difficulty } from "@/lib/sudoku";
import { loadSavedGame, clearSavedGame, progressPercent } from "@/lib/sudokuStorage";

const LEVELS: { id: Difficulty; label: string; sub: string; accent: string }[] = [
  { id: "easy", label: "Leicht", sub: "Entspannt, ~38 leere Felder", accent: "rgba(110,231,183,0.45)" },
  { id: "medium", label: "Mittel", sub: "Ausgewogen, ~48 leere Felder", accent: "rgba(139,92,246,0.5)" },
  { id: "hard", label: "Schwer", sub: "Knifflig, ~56 leere Felder", accent: "rgba(244,114,182,0.5)" },
];

const SudokuPage = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  const handleDelete = (d: Difficulty) => {
    clearSavedGame(d);
    setTick((t) => t + 1);
  };

  return (
    <div className="px-4 pt-4 pb-32 onboarding-slide min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/experiment")}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[18px]">Sudoku</h1>
        <div className="w-9 h-9" />
      </div>

      <p className="text-muted-foreground text-[13px] mb-6 text-center max-w-[360px] mx-auto">
        Wähle eine Schwierigkeit. Dein laufendes Spiel wird pro Stufe gespeichert.
      </p>

      <div className="flex flex-col gap-3 max-w-[420px] mx-auto">
        {LEVELS.map((lvl) => {
          const saved = loadSavedGame(lvl.id);
          const progress = saved ? progressPercent(saved) : 0;
          return (
            <div
              key={lvl.id}
              className="rounded-[16px] p-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${lvl.accent}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-foreground text-[16px]">{lvl.label}</div>
                  <div className="text-muted-foreground text-[12px]">{lvl.sub}</div>
                </div>
                {saved && (
                  <button
                    onClick={() => handleDelete(lvl.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    aria-label="Spielstand löschen"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {saved && (
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Fortschritt</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full transition-all"
                      style={{ width: `${progress}%`, background: lvl.accent }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate(`/experiment/sudoku/${lvl.id}`)}
                className="w-full py-2.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{
                  background: lvl.accent,
                  color: "hsl(var(--foreground))",
                }}
              >
                <Play className="w-4 h-4" />
                {saved ? "Fortsetzen" : "Neues Spiel starten"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SudokuPage;