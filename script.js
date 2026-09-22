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
const fixedSeatName = document.getElementById("fixedSeatName");
const fixedSeatDesk = document.getElementById("fixedSeatDesk");
const addFixedSeatBtn = document.getElementById("addFixedSeatBtn");
const fixedSeatList = document.getElementById("fixedSeatList");
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

// Human-friendly TABLE numbers (1..6) — one per cluster, not per individual
// seat, matching how a teacher actually points at the room ("table 1 is the
// one top-right"). Order follows the reading path: top-right, top-middle
// (near the board), the small 2-desk one, middle, bottom-right, bottom-middle.
const CLUSTER_ORDER = ["C", "B", "A", "D", "E", "F"];
const CLUSTER_NUMBER = Object.fromEntries(CLUSTER_ORDER.map((id, i) => [id, i + 1]));
function clusterIdOf(deskId) {
  return deskId.split("-")[0];
}
function deskIdsOfClusterId(clusterId) {
  return ALL_DESK_IDS.filter((id) => id.startsWith(`${clusterId}-`));
}

function neighborsOf(deskId) {
  const clusterId = deskId.split("-")[0];
  return ALL_DESK_IDS.filter((id) => id !== deskId && id.startsWith(`${clusterId}-`));
}

function makeClass() {
  return { names: "", blocked: [], assignment: {}, constraints: [], fixedSeats: [] };
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
    // A 3-desk cluster keeps its center fixed at 0, so each side moving by
    // REST_GAP opens a REST_GAP-wide gap per pair. A 2-desk cluster has no
    // fixed center — both desks move — so each only needs half as much to
    // open the same-width gap between them.
    const REST_GAP = roles.length === 2 ? 5 : 10;

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
        label = String(CLUSTER_NUMBER[cluster.id]);
      }

      desk.innerHTML = `
        <div class="desk-inner">
          <svg class="desk-shape" viewBox="0 0 74 68" preserveAspectRatio="none">
            <polygon class="fill" points="18,0 56,0 74,68 0,68" />
            <polygon class="outline" points="18,0 56,0 74,68 0,68" />
          </svg>
          <span class="desk-label"><span class="desk-label-text">${escapeHtml(label)}</span></span>
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
  fixedSeatName.innerHTML = options;
}

function renderFixedSeatDeskOptions() {
  fixedSeatDesk.innerHTML = CLUSTER_ORDER.map(
    (id) => `<option value="${id}">Stolik ${CLUSTER_NUMBER[id]}</option>`
  ).join("");
}

function renderFixedSeatList() {
  const cls = currentClass();
  if (!cls.fixedSeats.length) {
    fixedSeatList.innerHTML = `<li class="constraint-empty" style="list-style:none">Brak stałych miejsc.</li>`;
    return;
  }
  fixedSeatList.innerHTML = cls.fixedSeats
    .map(
      (fs, i) =>
        `<li><span>${escapeHtml(fs.name)} → stolik ${CLUSTER_NUMBER[fs.clusterId]}</span><button data-idx="${i}" title="Usuń"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></li>`
    )
    .join("");
  fixedSeatList.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cls.fixedSeats.splice(Number(btn.dataset.idx), 1);
      saveClasses(true);
      renderFixedSeatList();
    });
  });
}

function renderConstraintList() {
  const cls = currentClass();
  if (!cls.constraints.length) {
    constraintList.innerHTML = `<li class="constraint-empty" style="list-style:none">Brak reguł.</li>`;
    return;
  }
  constraintList.innerHTML = cls.constraints
    .map(
      (pair, i) =>
        `<li><span>${escapeHtml(pair.a)} ↔ ${escapeHtml(pair.b)}</span><button data-idx="${i}" title="Usuń regułę"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></li>`
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
  renderFixedSeatDeskOptions();
  renderFixedSeatList();
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

  // Fixed table assignments only count when the person is still on the roster
  // and their table still has an unblocked seat free — everyone else (people
  // and desks) gets shuffled freely. Each fixed person gets a random seat
  // within their assigned table (re-rolled on every shuffle), so two people
  // pinned to the same table still land in different individual spots.
  const fixedBase = {};
  const claimedSeats = new Set();
  cls.fixedSeats
    .filter((fs) => names.includes(fs.name))
    .forEach((fs) => {
      const openSeats = deskIdsOfClusterId(fs.clusterId).filter(
        (id) => availableSeats.includes(id) && !claimedSeats.has(id)
      );
      if (!openSeats.length) return; // table full or blocked — falls back to free pool
      const seat = openSeats[Math.floor(Math.random() * openSeats.length)];
      claimedSeats.add(seat);
      fixedBase[seat] = fs.name;
    });
  const fixedNames = new Set(Object.values(fixedBase));
  const freeNames = names.filter((n) => !fixedNames.has(n));
  const freeSeats = availableSeats.filter((id) => !claimedSeats.has(id));

  const attempts = 300;
  let best = null;
  let bestViolations = Infinity;

  for (let i = 0; i < attempts && bestViolations > 0; i++) {
    const shuffledNames = shuffleArray(freeNames);
    const shuffledSeats = shuffleArray(freeSeats);
    const assignment = { ...fixedBase };
    shuffledNames.slice(0, shuffledSeats.length).forEach((name, idx) => {
      assignment[shuffledSeats[idx]] = name;
    });
    const violations = countViolations(assignment, cls.constraints);
    if (violations < bestViolations) {
      bestViolations = violations;
      best = assignment;
    }
  }

  animateShuffle(best, () => {
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
  });
}

// Slot-machine style reveal, table by table: every desk within one cluster
// flickers through random names together, decelerating like a spinning reel
// slowing to a stop, then lands with a soft bounce — table 1 settles, then
// table 2, and so on, instead of a flat per-seat stagger. Each candidate name
// drops in from above rather than just swapping in place.
function dropInText(textEl, text, isFinal) {
  textEl.textContent = text;
  textEl.classList.remove("drop-in", "drop-in-final");
  void textEl.offsetWidth; // force reflow so the animation restarts every tick
  textEl.classList.add(isFinal ? "drop-in-final" : "drop-in");
}

function flickerToFinal(textEl, pool, finalName, totalMs, onLanded) {
  let elapsed = 0;
  let delay = 45;
  function tick() {
    if (elapsed + delay >= totalMs) {
      dropInText(textEl, finalName, true);
      onLanded();
      return;
    }
    dropInText(textEl, pool[Math.floor(Math.random() * pool.length)], false);
    elapsed += delay;
    delay *= 1.16; // ease out: each flip takes a little longer, like it's slowing down
    setTimeout(tick, delay);
  }
  tick();
}

function animateShuffle(finalAssignment, onDone) {
  if (shuffleBtn.disabled) return;
  shuffleBtn.disabled = true;

  const deskEls = [...board.querySelectorAll(".desk")];
  const pool = Object.values(finalAssignment);

  const TABLE_STAGGER = 260; // ms between one table starting and the next
  const clusterOrderSeen = [];
  const withinClusterIndex = {};
  deskEls.forEach((desk) => {
    const cid = clusterIdOf(desk.dataset.key);
    if (!clusterOrderSeen.includes(cid)) clusterOrderSeen.push(cid);
    withinClusterIndex[desk.dataset.key] = clusterOrderSeen.filter((c) => c === cid).length;
  });

  let pending = 0;

  deskEls.forEach((desk) => {
    const key = desk.dataset.key;
    const finalName = finalAssignment[key];
    if (!finalName || !pool.length) return;

    const cid = clusterIdOf(key);
    const tableStagger = clusterOrderSeen.indexOf(cid) * TABLE_STAGGER;
    const seatWithinTable = deskIdsOfClusterId(cid).indexOf(key);
    const stagger = tableStagger + seatWithinTable * 60;
    const spinFor = 620 + Math.random() * 180;
    pending++;

    const label = desk.querySelector(".desk-label-text");

    setTimeout(() => {
      desk.classList.remove("empty");
      desk.classList.add("filled", "shuffling");

      flickerToFinal(label, pool, finalName, spinFor, () => {
        desk.classList.remove("shuffling");
        desk.classList.add("landed");
        setTimeout(() => desk.classList.remove("landed"), 420);
        if (--pending === 0) {
          shuffleBtn.disabled = false;
          onDone();
        }
      });
    }, stagger);
  });

  if (pending === 0) {
    shuffleBtn.disabled = false;
    onDone();
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

addFixedSeatBtn.addEventListener("click", () => {
  const name = fixedSeatName.value;
  const clusterId = fixedSeatDesk.value;
  if (!name || !clusterId) return;
  const cls = currentClass();
  // A person has at most one fixed table; a table can hold several fixed
  // people (up to its own seat count) — adding a new pairing only replaces
  // that person's own previous pairing, not other people already at that table.
  cls.fixedSeats = cls.fixedSeats.filter((fs) => fs.name !== name);
  cls.fixedSeats.push({ name, clusterId });
  saveClasses(true);
  renderFixedSeatList();
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
  // Classes saved before "fixedSeats" existed won't have that field yet, and
  // a short-lived earlier version stored a specific deskId instead of a table
  // (clusterId) — migrate that shape forward rather than dropping it.
  for (const cls of Object.values(state.classes)) {
    if (!cls.fixedSeats) {
      cls.fixedSeats = [];
    } else {
      cls.fixedSeats = cls.fixedSeats.map((fs) =>
        fs.clusterId ? fs : { name: fs.name, clusterId: clusterIdOf(fs.deskId) }
      );
    }
  }
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
