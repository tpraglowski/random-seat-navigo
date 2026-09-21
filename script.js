import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// All classes for this tool live in ONE Firestore document (store/randomSeatNavigoClasses),
// same "one doc per feature" pattern the MySchool app uses for subjectsByClass etc.
// Which class is selected on THIS device is a local-only preference (not synced).
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const classesDocRef = doc(db, 'store', 'randomSeatNavigoClasses');

const CACHE_KEY = 'random-seat-navigo-cache';
const CURRENT_CLASS_KEY = 'random-seat-navigo-current-class';

const namesInput = document.getElementById("namesInput");
const nameCount = document.getElementById("nameCount");
const rowsInput = document.getElementById("rowsInput");
const colsInput = document.getElementById("colsInput");
const board = document.getElementById("board");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const classSelect = document.getElementById("classSelect");
const classSummary = document.getElementById("classSummary");
const addClassBtn = document.getElementById("addClassBtn");
const editClassBtn = document.getElementById("editClassBtn");
const deleteClassBtn = document.getElementById("deleteClassBtn");
const classNameInput = document.getElementById("classNameInput");
const editModal = document.getElementById("editModal");
const closeEditBtn = document.getElementById("closeEditBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const constraintA = document.getElementById("constraintA");
const constraintB = document.getElementById("constraintB");
const addConstraintBtn = document.getElementById("addConstraintBtn");
const constraintList = document.getElementById("constraintList");
const syncStatus = document.getElementById("syncStatus");

function makeClass() {
  return { names: "", rows: 4, cols: 6, blocked: [], assignment: {}, constraints: [] };
}

function defaultClasses() {
  return { "Klasa 6a": makeClass(), "Klasa 7a": makeClass() };
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function cacheClasses() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state.classes));
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
}

let state = { classes: loadCache() };
let currentClassName = localStorage.getItem(CURRENT_CLASS_KEY) || null;
let firstLoadDone = false;
let saveTimer = null;

function currentClass() {
  return state.classes[currentClassName];
}

function getNames(text) {
  return (text ?? currentClass().names)
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
}

function seatKey(r, c) {
  return `${r}-${c}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function saveClasses(immediate = false) {
  cacheClasses();
  if (saveTimer) clearTimeout(saveTimer);
  const write = () => setDoc(classesDocRef, { value: state.classes }).catch((e) => console.error(e));
  if (immediate) write();
  else saveTimer = setTimeout(write, 400);
}

function setCurrentClass(name) {
  currentClassName = name;
  try {
    localStorage.setItem(CURRENT_CLASS_KEY, name);
  } catch {
    // ignore
  }
}

// ---------- Rendering ----------

function renderClassSelect() {
  classSelect.innerHTML = Object.keys(state.classes)
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  classSelect.value = currentClassName;
}

function renderClassSummary() {
  const count = getNames().length;
  classSummary.textContent = `${count} ${count === 1 ? "uczeń" : "uczniów"}`;
}

function renderBoard() {
  const cls = currentClass();
  board.style.gridTemplateColumns = `repeat(${cls.cols}, 1fr)`;
  board.innerHTML = "";

  for (let r = 0; r < cls.rows; r++) {
    for (let c = 0; c < cls.cols; c++) {
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

function renderRoomFields() {
  const cls = currentClass();
  rowsInput.value = cls.rows;
  colsInput.value = cls.cols;
}

function renderConstraintOptions() {
  const names = getNames(namesInput.value);
  const options = names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  constraintA.innerHTML = options;
  constraintB.innerHTML = options;
}

function renderConstraintList() {
  const cls = currentClass();
  if (!cls.constraints.length) {
    constraintList.innerHTML = `<li class="constraint-empty" style="list-style:none">Brak reguł.</li>`;
    return;
  }
  constraintList.innerHTML = cls.constraints
    .map(
      (pair, i) => `<li><span>${escapeHtml(pair.a)} ↔ ${escapeHtml(pair.b)}</span><button data-idx="${i}" title="Usuń regułę">✕</button></li>`
    )
    .join("");
  constraintList.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cls.constraints.splice(Number(btn.dataset.idx), 1);
      saveClasses(true);
      renderConstraintList();
    });
  });
}

function renderMain() {
  renderClassSelect();
  renderClassSummary();
  renderRoomFields();
  renderBoard();
}

function renderModalContents() {
  const cls = currentClass();
  classNameInput.value = currentClassName;
  namesInput.value = cls.names;
  nameCount.textContent = `${getNames(cls.names).length} ${getNames(cls.names).length === 1 ? "uczeń" : "uczniów"}`;
  renderConstraintOptions();
  renderConstraintList();
}

// ---------- Seat shuffling with "don't sit together" constraints ----------

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function neighborsOf(key, rows, cols) {
  const [r, c] = key.split("-").map(Number);
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
    .filter(([rr, cc]) => rr >= 0 && rr < rows && cc >= 0 && cc < cols)
    .map(([rr, cc]) => seatKey(rr, cc));
}

function countViolations(assignment, constraints, rows, cols) {
  const seatOf = {};
  for (const [seat, name] of Object.entries(assignment)) seatOf[name] = seat;
  let violations = 0;
  for (const { a, b } of constraints) {
    const seatA = seatOf[a];
    const seatB = seatOf[b];
    if (!seatA || !seatB) continue;
    if (neighborsOf(seatA, rows, cols).includes(seatB)) violations++;
  }
  return violations;
}

function shuffleSeats() {
  const cls = currentClass();
  const names = getNames(cls.names);
  const availableSeats = [];
  for (let r = 0; r < cls.rows; r++) {
    for (let c = 0; c < cls.cols; c++) {
      const key = seatKey(r, c);
      if (!cls.blocked.includes(key)) availableSeats.push(key);
    }
  }

  if (!names.length || !availableSeats.length) {
    cls.assignment = {};
    saveClasses(true);
    renderBoard();
    return;
  }

  const attempts = 300;
  let best = null;
  let bestViolations = Infinity;

  for (let i = 0; i < attempts && bestViolations > 0; i++) {
    const shuffledNames = shuffleArray(names);
    const shuffledSeats = shuffleArray(availableSeats);
    const assignment = {};
    shuffledNames.slice(0, shuffledSeats.length).forEach((name, idx) => {
      assignment[shuffledSeats[idx]] = name;
    });
    const violations = countViolations(assignment, cls.constraints, cls.rows, cls.cols);
    if (violations < bestViolations) {
      bestViolations = violations;
      best = assignment;
    }
  }

  cls.assignment = best;
  saveClasses(true);
  renderBoard();

  const messages = [];
  if (names.length > availableSeats.length) {
    messages.push(
      `${names.length - availableSeats.length} uczniów zostało bez miejsca (za mało dostępnych miejsc).`
    );
  }
  if (bestViolations > 0) {
    messages.push(
      `Nie udało się spełnić ${bestViolations} ${bestViolations === 1 ? "reguły" : "reguł"} rozsadzenia przy tym układzie sali. Spróbuj wylosować ponownie albo zwiększ salę.`
    );
  }
  if (messages.length) alert(messages.join("\n"));
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
  saveClasses(true);
  renderBoard();
}

// ---------- Modal ----------

function openEditModal() {
  renderModalContents();
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  renderMain();
}

function isModalOpen() {
  return !editModal.classList.contains("hidden");
}

// ---------- Events ----------

namesInput.addEventListener("input", () => {
  currentClass().names = namesInput.value;
  saveClasses();
  const count = getNames(namesInput.value).length;
  nameCount.textContent = `${count} ${count === 1 ? "uczeń" : "uczniów"}`;
  renderConstraintOptions();
});

rowsInput.addEventListener("change", () => {
  const cls = currentClass();
  cls.rows = Math.max(1, Math.min(12, parseInt(rowsInput.value, 10) || 1));
  rowsInput.value = cls.rows;
  saveClasses(true);
  renderBoard();
});

colsInput.addEventListener("change", () => {
  const cls = currentClass();
  cls.cols = Math.max(1, Math.min(10, parseInt(colsInput.value, 10) || 1));
  colsInput.value = cls.cols;
  saveClasses(true);
  renderBoard();
});

shuffleBtn.addEventListener("click", shuffleSeats);

resetBtn.addEventListener("click", () => {
  if (!confirm("Wyczyścić plan tej klasy (miejsca i blokady)?")) return;
  const cls = currentClass();
  cls.blocked = [];
  cls.assignment = {};
  saveClasses(true);
  renderBoard();
});

classSelect.addEventListener("change", () => {
  setCurrentClass(classSelect.value);
  renderMain();
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
  setCurrentClass(trimmed);
  saveClasses(true);
  renderMain();
  openEditModal();
});

editClassBtn.addEventListener("click", openEditModal);
closeEditBtn.addEventListener("click", closeEditModal);
saveEditBtn.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

classNameInput.addEventListener("change", () => {
  const oldName = currentClassName;
  const trimmed = classNameInput.value.trim();
  if (!trimmed || trimmed === oldName) {
    classNameInput.value = oldName;
    return;
  }
  if (state.classes[trimmed]) {
    alert("Klasa o tej nazwie już istnieje.");
    classNameInput.value = oldName;
    return;
  }
  const ordered = {};
  for (const [key, value] of Object.entries(state.classes)) {
    ordered[key === oldName ? trimmed : key] = value;
  }
  state.classes = ordered;
  setCurrentClass(trimmed);
  saveClasses(true);
});

deleteClassBtn.addEventListener("click", () => {
  const names = Object.keys(state.classes);
  if (names.length <= 1) {
    alert("Nie można usunąć jedynej klasy.");
    return;
  }
  if (!confirm(`Usunąć klasę "${currentClassName}" wraz z jej planem?`)) return;
  delete state.classes[currentClassName];
  setCurrentClass(Object.keys(state.classes)[0]);
  saveClasses(true);
  closeEditModal();
});

addConstraintBtn.addEventListener("click", () => {
  const a = constraintA.value;
  const b = constraintB.value;
  if (!a || !b || a === b) return;
  const cls = currentClass();
  const exists = cls.constraints.some(
    (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)
  );
  if (exists) return;
  cls.constraints.push({ a, b });
  saveClasses(true);
  renderConstraintList();
});

// ---------- Firebase init & live sync ----------

function applyRemoteClasses(classes) {
  state.classes = classes && Object.keys(classes).length ? classes : defaultClasses();
  if (!currentClassName || !state.classes[currentClassName]) {
    currentClassName = Object.keys(state.classes)[0];
  }
  cacheClasses();
}

async function init() {
  if (state.classes) {
    if (!currentClassName || !state.classes[currentClassName]) {
      currentClassName = Object.keys(state.classes)[0];
    }
    renderMain();
  }

  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error(e);
    syncStatus.textContent = state.classes ? "Tryb offline" : "Błąd połączenia";
    return;
  }

  onSnapshot(
    classesDocRef,
    async (snap) => {
      if (!firstLoadDone) {
        if (snap.exists()) {
          applyRemoteClasses(snap.data().value);
        } else {
          applyRemoteClasses(null);
          await setDoc(classesDocRef, { value: state.classes });
        }
        firstLoadDone = true;
        renderMain();
        syncStatus.textContent = "";
      } else if (!isModalOpen()) {
        applyRemoteClasses(snap.exists() ? snap.data().value : null);
        renderMain();
      }
    },
    (err) => {
      console.error(err);
      if (state.classes) {
        firstLoadDone = true;
        renderMain();
        syncStatus.textContent = "Tryb offline";
      } else {
        syncStatus.textContent = "Błąd połączenia";
      }
    }
  );
}

init();
