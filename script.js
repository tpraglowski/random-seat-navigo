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
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

const SIDEBAR_COLLAPSED_KEY = "random-seat-navigo-sidebar-collapsed";

function capitalizeWords(text) {
  return text.replace(/(^|\s)(\p{L})/gu, (m, pre, letter) => pre + letter.toLocaleUpperCase("pl"));
}

// Fixed room layout: 6 clusters of desks positioned like the reference sketch —
// five 3-desk clusters plus one 2-desk cluster, scattered rather than a grid.
// x/y are percentages within the .board canvas.
const DESK_LAYOUT = [
  { id: "A", desks: 2, x: 12, y: 30 },
  { id: "B", desks: 3, x: 38, y: 22 },
  { id: "C", desks: 3, x: 75, y: 32 },
  { id: "D", desks: 3, x: 36, y: 55 },
  { id: "E", desks: 3, x: 75, y: 68 },
  { id: "F", desks: 3, x: 36, y: 82 },
];

function rolesOf(cluster) {
  return cluster.desks === 2 ? ["left", "center"] : ["left", "center", "right"];
}

const ALL_DESK_IDS = DESK_LAYOUT.flatMap((cluster) => rolesOf(cluster).map((role) => `${cluster.id}-${role}`));

function neighborsOf(deskId) {
  const clusterId = deskId.split("-")[0];
  return ALL_DESK_IDS.filter((id) => id !== deskId && id.startsWith(`${clusterId}-`));
}

function makeClass() {
  return { names: "", blocked: [], assignment: {}, constraints: [] };
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
  board.innerHTML = "";

  DESK_LAYOUT.forEach((cluster) => {
    const clusterEl = document.createElement("div");
    clusterEl.className = "cluster";
    clusterEl.style.left = `${cluster.x}%`;
    clusterEl.style.top = `${cluster.y}%`;

    const roles = rolesOf(cluster);
    // Angular width of the trapezoid as seen from the shared pivot 71.78px above it
    // (atan((topWidth/2) / pivotDistance) * 2) — rotating by exactly this many
    // degrees makes each petal's edge land exactly on its neighbor's edge.
    const fanStep = 29.67;
    const mid = (roles.length - 1) / 2;
    // How far (px, real screen space) a neighbor slides away so the hovered
    // desk's 1.22x scale-up never covers it, on top of the permanent gap below.
    const PUSH = 24;
    // Permanent small gap (px) between resting desks — the rounded corners'
    // stroke still bleeds a little at the touching seam even with exact angles.
    const REST_GAP = 10;

    const deskEls = [];

    roles.forEach((role, i) => {
      const deskId = `${cluster.id}-${role}`;
      const desk = document.createElement("div");
      desk.className = "desk";
      desk.dataset.key = deskId;
      const angle = (i - mid) * fanStep;
      desk.style.setProperty("--angle", `${angle}deg`);
      // Positive fan angle renders further to screen-left, so a desk before
      // mid needs a positive (rightward) rest shift to move away from center.
      const restShift = i < mid ? REST_GAP : i > mid ? -REST_GAP : 0;
      desk.style.setProperty("--rest-shift", `${restShift}px`);

      let label;
      if (cls.blocked.includes(deskId)) {
        desk.classList.add("blocked");
        label = "—";
      } else if (cls.assignment[deskId]) {
        desk.classList.add("filled");
        label = cls.assignment[deskId];
      } else {
        desk.classList.add("empty");
        label = "puste";
      }

      desk.innerHTML = `
        <div class="desk-inner">
          <svg class="desk-shape" viewBox="0 0 74 68" preserveAspectRatio="none">
            <polygon class="fill" points="18,0 56,0 74,68 0,68" />
            <polygon class="outline" points="18,0 56,0 74,68 0,68" />
          </svg>
          <span class="desk-label">${escapeHtml(label)}</span>
        </div>
      `;
      desk.addEventListener("click", () => toggleBlocked(deskId));
      deskEls.push(desk);
    });

    // Draw the petals furthest from center first so the middle one paints on
    // top and its label is never covered by its neighbors at rest.
    [...deskEls]
      .sort((a, b) => Math.abs(deskEls.indexOf(b) - mid) - Math.abs(deskEls.indexOf(a) - mid))
      .forEach((desk) => clusterEl.appendChild(desk));

    deskEls.forEach((desk, i) => {
      desk.addEventListener("mouseenter", () => {
        desk.classList.add("active");
        deskEls.forEach((other, j) => {
          if (j === i) return;
          // Positive fan angle renders further to screen-left (see fanStep/angle
          // above), so a neighbor with a smaller index needs to move further
          // screen-right (positive shift), not left, to move away from i.
          other.style.setProperty("--hover-shift", `${j < i ? PUSH : -PUSH}px`);
        });
      });
      desk.addEventListener("mouseleave", () => {
        desk.classList.remove("active");
        deskEls.forEach((other) => other.style.setProperty("--hover-shift", "0px"));
      });
    });

    board.appendChild(clusterEl);
  });
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

function countViolations(assignment, constraints) {
  const seatOf = {};
  for (const [seat, name] of Object.entries(assignment)) seatOf[name] = seat;
  let violations = 0;
  for (const { a, b } of constraints) {
    const seatA = seatOf[a];
    const seatB = seatOf[b];
    if (!seatA || !seatB) continue;
    if (neighborsOf(seatA).includes(seatB)) violations++;
  }
  return violations;
}

function shuffleSeats() {
  const cls = currentClass();
  const names = getNames(cls.names);
  const availableSeats = ALL_DESK_IDS.filter((id) => !cls.blocked.includes(id));

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
    const violations = countViolations(assignment, cls.constraints);
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
  const cursor = namesInput.selectionStart;
  const capitalized = capitalizeWords(namesInput.value);
  if (capitalized !== namesInput.value) {
    namesInput.value = capitalized;
    namesInput.setSelectionRange(cursor, cursor);
  }
  currentClass().names = capitalized;
  saveClasses();
  const count = getNames(capitalized).length;
  nameCount.textContent = `${count} ${count === 1 ? "uczeń" : "uczniów"}`;
  renderConstraintOptions();
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

sidebarToggle.addEventListener("click", () => {
  const collapsed = sidebar.classList.toggle("collapsed");
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
});

if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
  sidebar.classList.add("collapsed");
}

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
