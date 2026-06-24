export type Board = number[][]; // 0 = empty
export type Difficulty = "easy" | "medium" | "hard";

const N = 9;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function emptyBoard(): Board {
  return Array.from({ length: N }, () => Array(N).fill(0));
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

export function isValidPlacement(b: Board, row: number, col: number, val: number): boolean {
  for (let i = 0; i < N; i++) {
    if (b[row][i] === val && i !== col) return false;
    if (b[i][col] === val && i !== row) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (b[r][c] === val && !(r === row && c === col)) return false;
    }
  }
  return true;
}

function solve(b: Board, randomize = false, limit = 2): number {
  let count = 0;
  function bt(): boolean {
    let row = -1;
    let col = -1;
    let min = 10;
    const candidates: number[][] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (b[r][c] === 0) {
          const cand: number[] = [];
          for (let v = 1; v <= 9; v++) if (isValidPlacement(b, r, c, v)) cand.push(v);
          if (cand.length < min) {
            min = cand.length;
            row = r;
            col = c;
            candidates[0] = cand;
            if (min === 0) return false;
          }
        }
      }
    }
    if (row === -1) {
      count++;
      return count >= limit;
    }
    const vals = randomize ? shuffle(candidates[0]) : candidates[0];
    for (const v of vals) {
      b[row][col] = v;
      if (bt()) return true;
      b[row][col] = 0;
    }
    return false;
  }
  bt();
  return count;
}

export function solveBoard(b: Board): Board | null {
  const copy = cloneBoard(b);
  solve(copy, false, 1);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (copy[r][c] === 0) return null;
  return copy;
}

function generateFull(): Board {
  const b = emptyBoard();
  solve(b, true, 1);
  return b;
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateFull();
  const puzzle = cloneBoard(solution);
  const holes = difficulty === "easy" ? 38 : difficulty === "medium" ? 48 : 56;
  const cells = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= holes) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const test = cloneBoard(puzzle);
    const sols = solve(test, false, 2);
    if (sols !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }
  return { puzzle, solution };
}

export function isComplete(b: Board): boolean {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (b[r][c] === 0) return false;
    if (!isValidPlacement(b, r, c, b[r][c])) return false;
  }
  return true;
}

export function conflictsAt(b: Board, row: number, col: number): boolean {
  const v = b[row][col];
  if (v === 0) return false;
  return !isValidPlacement(b, row, col, v);
}