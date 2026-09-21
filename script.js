const STORAGE_KEY = "random-seat-navigo-state";

const namesInput = document.getElementById("namesInput");
const nameCount = document.getElementById("nameCount");
const rowsInput = document.getElementById("rowsInput");
const colsInput = document.getElementById("colsInput");
const board = document.getElementById("board");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const printBtn = document.getElementById("printBtn");

let state = loadState() || {
  names: "",
  rows: 4,
  cols: 6,
  blocked: [],
  assignment: {},
};

namesInput.value = state.names;
rowsInput.value = state.rows;
colsInput.value = state.cols;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
}

function getNames() {
  return state.names
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
}

function seatKey(r, c) {
  return `${r}-${c}`;
}

function renderBoard() {
  const rows = state.rows;
  const cols = state.cols;
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.innerHTML = "";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = seatKey(r, c);
      const seat = document.createElement("div");
      seat.className = "seat";
      seat.dataset.key = key;

      if (state.blocked.includes(key)) {
        seat.classList.add("blocked");
        seat.textContent = "—";
      } else if (state.assignment[key]) {
        seat.classList.add("filled");
        seat.textContent = state.assignment[key];
      } else {
        seat.classList.add("empty");
        seat.textContent = "puste";
      }

      seat.addEventListener("click", () => toggleBlocked(key));
      board.appendChild(seat);
    }
  }
}

function toggleBlocked(key) {
  const idx = state.blocked.indexOf(key);
  if (idx >= 0) {
    state.blocked.splice(idx, 1);
  } else {
    delete state.assignment[key];
    state.blocked.push(key);
  }
  saveState();
  renderBoard();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleSeats() {
  const names = getNames();
  const availableSeats = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const key = seatKey(r, c);
      if (!state.blocked.includes(key)) availableSeats.push(key);
    }
  }

  const shuffledNames = shuffle(names);
  const shuffledSeats = shuffle(availableSeats);

  state.assignment = {};
  shuffledNames.slice(0, shuffledSeats.length).forEach((name, i) => {
    state.assignment[shuffledSeats[i]] = name;
  });

  saveState();
  renderBoard();

  if (names.length > availableSeats.length) {
    alert(
      `Uwaga: ${names.length} uczniów, ale tylko ${availableSeats.length} dostępnych miejsc. ${
        names.length - availableSeats.length
      } uczniów zostało bez miejsca.`
    );
  }
}

function updateCount() {
  const count = getNames().length;
  nameCount.textContent = `${count} ${
    count === 1 ? "uczeń" : "uczniów"
  }`;
}

namesInput.addEventListener("input", () => {
  state.names = namesInput.value;
  saveState();
  updateCount();
});

rowsInput.addEventListener("change", () => {
  state.rows = Math.max(1, Math.min(12, parseInt(rowsInput.value, 10) || 1));
  rowsInput.value = state.rows;
  saveState();
  renderBoard();
});

colsInput.addEventListener("change", () => {
  state.cols = Math.max(1, Math.min(10, parseInt(colsInput.value, 10) || 1));
  colsInput.value = state.cols;
  saveState();
  renderBoard();
});

shuffleBtn.addEventListener("click", shuffleSeats);

resetBtn.addEventListener("click", () => {
  if (!confirm("Wyczyścić cały plan (miejsca i blokady)?")) return;
  state.blocked = [];
  state.assignment = {};
  saveState();
  renderBoard();
});

printBtn.addEventListener("click", () => window.print());

updateCount();
renderBoard();
