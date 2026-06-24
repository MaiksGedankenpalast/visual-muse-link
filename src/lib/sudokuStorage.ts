import { Board, Difficulty } from "./sudoku";

export type SavedGame = {
  puzzle: Board;
  solution: Board;
  board: Board;
  startedAt: number;
  updatedAt: number;
};

const KEY = (d: Difficulty) => `mindark.sudoku.${d}`;

export function loadSavedGame(d: Difficulty): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY(d));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed.puzzle || !parsed.solution || !parsed.board) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(d: Difficulty, game: SavedGame): void {
  try {
    localStorage.setItem(KEY(d), JSON.stringify({ ...game, updatedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function clearSavedGame(d: Difficulty): void {
  try {
    localStorage.removeItem(KEY(d));
  } catch {
    // ignore
  }
}

export function progressPercent(game: SavedGame): number {
  let blanks = 0;
  let filled = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (game.puzzle[r][c] === 0) {
        blanks++;
        if (game.board[r][c] !== 0) filled++;
      }
    }
  }
  if (blanks === 0) return 100;
  return Math.round((filled / blanks) * 100);
}