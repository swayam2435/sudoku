/**
 * Sudoku Engine & Application Controller
 * Pure ES6+ Vanilla JavaScript
 */

// --- State Management ---
const state = {
  difficulty: 'medium',
  solution: [],       // 81 elements
  initialBoard: [],   // 81 elements
  currentBoard: [],   // 81 elements
  selectedCell: null, // Index 0..80
  timer: 0,
  timerInterval: null,
  isPaused: false,
  mistakes: 0,
  isCompleted: false
};

const DIFFICULTY_CLUES = {
  easy: 40,
  medium: 32,
  hard: 26
};

// DOM Elements
let boardEl, timerEl, mistakesEl, difficultySelect, pauseOverlay, winModal;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  setupEventListeners();
  startNewGame();
});

function initDOMElements() {
  boardEl = document.getElementById('sudoku-board');
  timerEl = document.getElementById('timer-display');
  mistakesEl = document.getElementById('mistakes-count');
  difficultySelect = document.getElementById('difficulty-select');
  pauseOverlay = document.getElementById('pause-overlay');
  winModal = document.getElementById('win-modal');
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Action buttons
  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-reset').addEventListener('click', resetCurrentBoard);
  document.getElementById('btn-erase').addEventListener('click', eraseSelectedCell);
  document.getElementById('btn-hint').addEventListener('click', giveHint);
  document.getElementById('btn-check').addEventListener('click', checkSolution);
  document.getElementById('btn-solve').addEventListener('click', solvePuzzleAnimated);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    winModal.classList.add('hidden');
    startNewGame();
  });

  difficultySelect.addEventListener('change', (e) => {
    state.difficulty = e.target.value;
    startNewGame();
  });

  // Numpad input
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.value, 10);
      enterNumber(val);
    });
  });

  // Keyboard Navigation & Shortcuts
  document.addEventListener('keydown', handleKeyboardInput);
}

// --- Sudoku Algorithm Engine ---

/**
 * Validates if value placement obeys Sudoku rules
 */
function isValid(board, idx, val) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;

  for (let i = 0; i < 9; i++) {
    // Row check
    if (board[row * 9 + i] === val && (row * 9 + i) !== idx) return false;
    // Col check
    if (board[i * 9 + col] === val && (i * 9 + col) !== idx) return false;
    // 3x3 Box check
    const boxRow = Math.floor(row / 3) * 3 + Math.floor(i / 3);
    const boxCol = Math.floor(col / 3) * 3 + (i % 3);
    const boxIdx = boxRow * 9 + boxCol;
    if (board[boxIdx] === val && boxIdx !== idx) return false;
  }
  return true;
}

/**
 * Backtracking solver to solve grid or check uniqueness
 */
function solveBacktrack(board, countObj = null) {
  let emptyIdx = -1;
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) {
      emptyIdx = i;
      break;
    }
  }

  if (emptyIdx === -1) {
    if (countObj) {
      countObj.count++;
      return countObj.count >= 2;
    }
    return true;
  }

  for (let num = 1; num <= 9; num++) {
    if (isValid(board, emptyIdx, num)) {
      board[emptyIdx] = num;
      if (solveBacktrack(board, countObj)) return true;
      board[emptyIdx] = 0;
    }
  }
  return false;
}

/**
 * Counts number of solutions for puzzle uniqueness verification
 */
function countSolutions(board) {
  const boardCopy = [...board];
  const countObj = { count: 0 };
  solveBacktrack(boardCopy, countObj);
  return countObj.count;
}

/**
 * Generates a full valid 9x9 board with randomized numbers
 */
function generateFullBoard() {
  const board = Array(81).fill(0);
  
  function fill(idx) {
    if (idx >= 81) return true;
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (let num of nums) {
      if (isValid(board, idx, num)) {
        board[idx] = num;
        if (fill(idx + 1)) return true;
        board[idx] = 0;
      }
    }
    return false;
  }
  
  fill(0);
  return board;
}

/**
 * Creates puzzle grid by stripping numbers while maintaining unique solution
 */
function createPuzzle(difficulty) {
  const fullBoard = generateFullBoard();
  const puzzle = [...fullBoard];
  const targetClues = DIFFICULTY_CLUES[difficulty] || 32;
  const indices = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  let cluesCount = 81;

  for (let idx of indices) {
    if (cluesCount <= targetClues) break;
    const temp = puzzle[idx];
    puzzle[idx] = 0;

    if (countSolutions(puzzle) === 1) {
      cluesCount--;
    } else {
      puzzle[idx] = temp;
    }
  }

  return { puzzle, solution: fullBoard };
}

// --- Game Flow & Logic ---

function startNewGame() {
  const { puzzle, solution } = createPuzzle(state.difficulty);
  state.solution = solution;
  state.initialBoard = [...puzzle];
  state.currentBoard = [...puzzle];
  state.selectedCell = null;
  state.mistakes = 0;
  state.isCompleted = false;
  state.isPaused = false;
  
  pauseOverlay.classList.add('hidden');
  mistakesEl.textContent = '0';
  
  resetTimer();
  startTimer();
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.dataset.row = Math.floor(i / 9);
    cell.dataset.col = i % 9;

    const val = state.currentBoard[i];
    if (val !== 0) {
      cell.textContent = val;
      if (state.initialBoard[i] !== 0) {
        cell.classList.add('given');
      } else {
        cell.classList.add('user-entered');
      }
    }

    cell.addEventListener('click', () => selectCell(i));
    boardEl.appendChild(cell);
  }
  updateCellStyles();
}

function selectCell(index) {
  if (state.isPaused || state.isCompleted) return;
  state.selectedCell = index;
  updateCellStyles();
}

function updateCellStyles() {
  const cells = boardEl.querySelectorAll('.cell');
  const selectedIdx = state.selectedCell;
  const selectedVal = selectedIdx !== null ? state.currentBoard[selectedIdx] : null;
  const selectedRow = selectedIdx !== null ? Math.floor(selectedIdx / 9) : null;
  const selectedCol = selectedIdx !== null ? selectedIdx % 9 : null;

  cells.forEach((cell, i) => {
    cell.classList.remove('selected', 'highlighted', 'same-number', 'conflict');

    if (selectedIdx === i) {
      cell.classList.add('selected');
    } else if (selectedIdx !== null) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const sameBox = Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
                        Math.floor(col / 3) === Math.floor(selectedCol / 3);

      if (row === selectedRow || col === selectedCol || sameBox) {
        cell.classList.add('highlighted');
      }
    }

    const currentVal = state.currentBoard[i];
    if (selectedVal !== null && selectedVal !== 0 && currentVal === selectedVal && i !== selectedIdx) {
      cell.classList.add('same-number');
    }

    // Highlight conflicts in real time
    if (currentVal !== 0 && !isValid(state.currentBoard, i, currentVal)) {
      cell.classList.add('conflict');
    }
  });
}

function enterNumber(num) {
  const idx = state.selectedCell;
  if (idx === null || state.isPaused || state.isCompleted) return;
  if (state.initialBoard[idx] !== 0) return; // Prevent modifying pre-filled given clues

  const prevVal = state.currentBoard[idx];
  if (prevVal === num) return;

  state.currentBoard[idx] = num;
  
  // Increment mistakes if wrong according to solution
  if (num !== state.solution[idx]) {
    state.mistakes++;
    mistakesEl.textContent = state.mistakes;
  }

  const cell = boardEl.children[idx];
  cell.textContent = num;
  cell.classList.add('user-entered');

  updateCellStyles();
  checkWinCondition();
}

function eraseSelectedCell() {
  const idx = state.selectedCell;
  if (idx === null || state.isPaused || state.isCompleted) return;
  if (state.initialBoard[idx] !== 0) return;

  state.currentBoard[idx] = 0;
  const cell = boardEl.children[idx];
  cell.textContent = '';
  cell.classList.remove('user-entered', 'conflict');

  updateCellStyles();
}

function giveHint() {
  if (state.isPaused || state.isCompleted) return;
  
  // Find all empty cells or wrong user cells
  const candidateIndices = [];
  for (let i = 0; i < 81; i++) {
    if (state.currentBoard[i] !== state.solution[i]) {
      candidateIndices.push(i);
    }
  }

  if (candidateIndices.length === 0) return;

  const randomIdx = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
  state.currentBoard[randomIdx] = state.solution[randomIdx];
  
  const cell = boardEl.children[randomIdx];
  cell.textContent = state.solution[randomIdx];
  cell.classList.remove('user-entered');
  cell.classList.add('given', 'hint-pulse');
  
  setTimeout(() => cell.classList.remove('hint-pulse'), 500);

  selectCell(randomIdx);
  checkWinCondition();
}

function checkSolution() {
  if (state.isPaused || state.isCompleted) return;
  let hasErrors = false;
  
  for (let i = 0; i < 81; i++) {
    const val = state.currentBoard[i];
    if (val !== 0 && val !== state.solution[i]) {
      hasErrors = true;
      boardEl.children[i].classList.add('conflict');
    }
  }

  if (!hasErrors && !state.currentBoard.includes(0)) {
    checkWinCondition();
  } else if (!hasErrors) {
    alert('Looking good so far! Keep going.');
  }
}

function solvePuzzleAnimated() {
  if (state.isPaused || state.isCompleted) return;
  state.currentBoard = [...state.solution];
  renderBoard();
  checkWinCondition();
}

function resetCurrentBoard() {
  if (state.isPaused || state.isCompleted) return;
  state.currentBoard = [...state.initialBoard];
  state.mistakes = 0;
  mistakesEl.textContent = '0';
  renderBoard();
}

// --- Keyboard Inputs ---
function handleKeyboardInput(e) {
  if (state.isPaused || state.isCompleted) return;

  const key = e.key;
  if (key >= '1' && key <= '9') {
    enterNumber(parseInt(key, 10));
  } else if (key === 'Backspace' || key === 'Delete') {
    eraseSelectedCell();
  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
    navigateGrid(key);
  }
}

function navigateGrid(key) {
  if (state.selectedCell === null) {
    selectCell(0);
    return;
  }

  let row = Math.floor(state.selectedCell / 9);
  let col = state.selectedCell % 9;

  if (key === 'ArrowUp') row = (row - 1 + 9) % 9;
  if (key === 'ArrowDown') row = (row + 1) % 9;
  if (key === 'ArrowLeft') col = (col - 1 + 9) % 9;
  if (key === 'ArrowRight') col = (col + 1) % 9;

  selectCell(row * 9 + col);
}

// --- Timer Management ---
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (!state.isPaused && !state.isCompleted) {
      state.timer++;
      updateTimerDisplay();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timer = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = String(Math.floor(state.timer / 60)).padStart(2, '0');
  const secs = String(state.timer % 60).padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

function togglePause() {
  if (state.isCompleted) return;
  state.isPaused = !state.isPaused;
  const pauseBtn = document.getElementById('btn-pause');
  
  if (state.isPaused) {
    pauseOverlay.classList.remove('hidden');
    pauseBtn.textContent = 'Resume';
  } else {
    pauseOverlay.classList.add('hidden');
    pauseBtn.textContent = 'Pause';
  }
}

// --- Win State Detection ---
function checkWinCondition() {
  for (let i = 0; i < 81; i++) {
    if (state.currentBoard[i] !== state.solution[i]) {
      return;
    }
  }

  state.isCompleted = true;
  clearInterval(state.timerInterval);
  showWinModal();
}

function showWinModal() {
  document.getElementById('modal-difficulty').textContent = 
    state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
  document.getElementById('modal-time').textContent = timerEl.textContent;
  document.getElementById('modal-mistakes').textContent = state.mistakes;
  winModal.classList.remove('hidden');
}