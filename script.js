const STORAGE_KEY = "random-seat-navigo-state";

const namesInput = document.getElementById("namesInput");
const nameCount = document.getElementById("nameCount");
const rowsInput = document.getElementById("rowsInput");
const colsInput = document.getElementById("colsInput");
const board = document.getElementById("board");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const classSelect = document.getElementById("classSelect");
const addClassBtn = document.getElementById("addClassBtn");
const renameClassBtn = document.getElementById("renameClassBtn");
const deleteClassBtn = document.getElementById("deleteClassBtn");

function makeClass() {
  return { names: "", rows: 4, cols: 6, blocked: [], assignment: {} };
}

function defaultState() {
  return {
    classes: {
      "Klasa 6a": makeClass(),
      "Klasa 7a": makeClass(),
    },
    currentClass: "Klasa 6a",
  };
}

let state = loadState() || defaultState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.classes || !Object.keys(parsed.classes).length) return null;
    if (!parsed.classes[parsed.currentClass]) {
      parsed.currentClass = Object.keys(parsed.classes)[0];
    }
    return parsed;
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

function currentClass() {
  return state.classes[state.currentClass];
}

function getNames() {
  return currentClass()
    .names.split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
}

function seatKey(r, c) {
  return `${r}-${c}`;
}

function renderClassSelect() {
  classSelect.innerHTML = Object.keys(state.classes)
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  classSelect.value = state.currentClass;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderClassFields() {
  const cls = currentClass();
  namesInput.value = cls.names;
  rowsInput.value = cls.rows;
  colsInput.value = cls.cols;
  updateCount();
}

function renderBoard() {
  const cls = currentClass();
  const rows = cls.rows;
  const cols = cls.cols;
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.innerHTML = "";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = seatKey(r, c);
      const seat = document.createElement("div");
      seat.className = "seat";
      seat.dataset.key = key;

      if (cls.blocked.includes(key)) {
        seat.classList.add("blocked");
        seat.textContent = "—";
      } else if (cls.assignment[key]) {
        seat.classList.add("filled");
        seat.textContent = cls.assignment[key];
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
  const cls = currentClass();
  const idx = cls.blocked.indexOf(key);
  if (idx >= 0) {
    cls.blocked.splice(idx, 1);
  } else {
    delete cls.assignment[key];
    cls.blocked.push(key);
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
  const cls = currentClass();
  const names = getNames();
  const availableSeats = [];
  for (let r = 0; r < cls.rows; r++) {
    for (let c = 0; c < cls.cols; c++) {
      const key = seatKey(r, c);
      if (!cls.blocked.includes(key)) availableSeats.push(key);
    }
  }

  const shuffledNames = shuffle(names);
  const shuffledSeats = shuffle(availableSeats);

  cls.assignment = {};
  shuffledNames.slice(0, shuffledSeats.length).forEach((name, i) => {
    cls.assignment[shuffledSeats[i]] = name;
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
  nameCount.textContent = `${count} ${count === 1 ? "uczeń" : "uczniów"}`;
}

namesInput.addEventListener("input", () => {
  currentClass().names = namesInput.value;
  saveState();
  updateCount();
});

rowsInput.addEventListener("change", () => {
  const cls = currentClass();
  cls.rows = Math.max(1, Math.min(12, parseInt(rowsInput.value, 10) || 1));
  rowsInput.value = cls.rows;
  saveState();
  renderBoard();
});

colsInput.addEventListener("change", () => {
  const cls = currentClass();
  cls.cols = Math.max(1, Math.min(10, parseInt(colsInput.value, 10) || 1));
  colsInput.value = cls.cols;
  saveState();
  renderBoard();
});

shuffleBtn.addEventListener("click", shuffleSeats);

resetBtn.addEventListener("click", () => {
  if (!confirm("Wyczyścić plan tej klasy (miejsca i blokady)?")) return;
  const cls = currentClass();
  cls.blocked = [];
  cls.assignment = {};
  saveState();
  renderBoard();
});

classSelect.addEventListener("change", () => {
  state.currentClass = classSelect.value;
  saveState();
  renderClassFields();
  renderBoard();
});

addClassBtn.addEventListener("click", () => {
  const name = prompt("Nazwa nowej klasy:");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  if (state.classes[trimmed]) {
    alert("Klasa o tej nazwie już istnieje.");
    return;
  }
  state.classes[trimmed] = makeClass();
  state.currentClass = trimmed;
  saveState();
  renderClassSelect();
  renderClassFields();
  renderBoard();
});

renameClassBtn.addEventListener("click", () => {
  const oldName = state.currentClass;
  const name = prompt("Nowa nazwa klasy:", oldName);
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === oldName) return;
  if (state.classes[trimmed]) {
    alert("Klasa o tej nazwie już istnieje.");
    return;
  }
  const ordered = {};
  for (const [key, value] of Object.entries(state.classes)) {
    ordered[key === oldName ? trimmed : key] = value;
  }
  state.classes = ordered;
  state.currentClass = trimmed;
  saveState();
  renderClassSelect();
});

deleteClassBtn.addEventListener("click", () => {
  const names = Object.keys(state.classes);
  if (names.length <= 1) {
    alert("Nie można usunąć jedynej klasy.");
    return;
  }
  if (!confirm(`Usunąć klasę "${state.currentClass}" wraz z jej planem?`)) return;
  delete state.classes[state.currentClass];
  state.currentClass = Object.keys(state.classes)[0];
  saveState();
  renderClassSelect();
  renderClassFields();
  renderBoard();
});

renderClassSelect();
renderClassFields();
renderBoard();
