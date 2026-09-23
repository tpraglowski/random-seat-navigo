import { firebaseConfig } from './firebase-config.js';
import { ACCESS_CODE } from './access-config.js';
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
const topBar = document.getElementById("topBar");
const modeTabs = document.getElementById("modeTabs");
const modeTabPill = document.getElementById("modeTabPill");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsFullscreenBtn = document.getElementById("settingsFullscreenBtn");
const themeTabs = document.getElementById("themeTabs");
const themeTabPill = document.getElementById("themeTabPill");
const speedTabs = document.getElementById("speedTabs");
const speedTabPill = document.getElementById("speedTabPill");
const priorityTabs = document.getElementById("priorityTabs");
const priorityTabPill = document.getElementById("priorityTabPill");
const effectsTabs = document.getElementById("effectsTabs");
const effectsTabPill = document.getElementById("effectsTabPill");
const leavesLayer = document.getElementById("leavesLayer");
const todayDate = document.getElementById("todayDate");
const seatsOnlySection = document.getElementById("seatsOnlySection");
const personOnlySection = document.getElementById("personOnlySection");
const groupsOnlySection = document.getElementById("groupsOnlySection");
const seatsView = document.getElementById("seatsView");
const personView = document.getElementById("personView");
const groupsView = document.getElementById("groupsView");
const groupsHint = document.getElementById("groupsHint");
const groupsGrid = document.getElementById("groupsGrid");
const groupModeTabs = document.getElementById("groupModeTabs");
const groupModeTabPill = document.getElementById("groupModeTabPill");
const groupCountRow = document.getElementById("groupCountRow");
const groupCountInput = document.getElementById("groupCountInput");
const groupCountMinus = document.getElementById("groupCountMinus");
const groupCountPlus = document.getElementById("groupCountPlus");
const groupSizeRow = document.getElementById("groupSizeRow");
const groupSizeInput = document.getElementById("groupSizeInput");
const groupSizeMinus = document.getElementById("groupSizeMinus");
const groupSizePlus = document.getElementById("groupSizePlus");
const showGroupsOnBoardBtn = document.getElementById("showGroupsOnBoardBtn");
const clearGroupColorsBtn = document.getElementById("clearGroupColorsBtn");
const groupConstraintA = document.getElementById("groupConstraintA");
const groupConstraintB = document.getElementById("groupConstraintB");
const addGroupConstraintBtn = document.getElementById("addGroupConstraintBtn");
const groupConstraintList = document.getElementById("groupConstraintList");
const personPickText = document.getElementById("personPickText");
const losujLabel = document.getElementById("losujLabel");
const timerBtn = document.getElementById("timerBtn");
const timerBadge = document.getElementById("timerBadge");
const timerPanel = document.getElementById("timerPanel");
const timerFullscreenBtn = document.getElementById("timerFullscreenBtn");
const timerDisplay = document.getElementById("timerDisplay");
const timerMinutesInput = document.getElementById("timerMinutesInput");
const timerSecondsInput = document.getElementById("timerSecondsInput");
const timerSetBtn = document.getElementById("timerSetBtn");
const timerMinus = document.getElementById("timerMinus");
const timerPlus = document.getElementById("timerPlus");
const timerStartBtn = document.getElementById("timerStartBtn");
const timerResetBtn = document.getElementById("timerResetBtn");
const appRoot = document.getElementById("appRoot");
const accessGate = document.getElementById("accessGate");
const accessForm = document.getElementById("accessForm");
const accessCodeInput = document.getElementById("accessCode");
const accessError = document.getElementById("accessError");

const ACCESS_UNLOCKED_KEY = "random-seat-navigo-unlocked";

function unlockApp() {
  accessGate.classList.add("hidden");
  appRoot.classList.remove("hidden");
  topBar.classList.remove("hidden");
  // The mode pill was sized while top-bar was still display:none (0-width
  // buttons), so recompute it now that the bar is actually laid out.
  applyMode();
  init();
}

accessForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (accessCodeInput.value === ACCESS_CODE) {
    try {
      localStorage.setItem(ACCESS_UNLOCKED_KEY, "1");
    } catch {
      // ignore
    }
    accessError.classList.add("hidden");
    unlockApp();
  } else {
    accessError.classList.remove("hidden");
    accessCodeInput.value = "";
    accessCodeInput.focus();
  }
});

const SIDEBAR_COLLAPSED_KEY = "random-seat-navigo-sidebar-collapsed";
const MODE_KEY = "random-seat-navigo-mode";
const PICK_COOLDOWN = 5; // a picked person sits out this many following draws

const storedMode = localStorage.getItem(MODE_KEY);
let currentMode = storedMode === "person" || storedMode === "groups" ? storedMode : "seats";

const todayLabel = new Date().toLocaleDateString("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
todayDate.textContent = todayLabel.charAt(0).toLocaleUpperCase("pl") + todayLabel.slice(1);

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

// Cluster order by literal distance from the board (smallest y = closest to
// "TABLICA") — used by the "closest to the board" seating priority, distinct
// from CLUSTER_ORDER above which follows the teacher's reading path instead.
const PROXIMITY_ORDER = [...DESK_LAYOUT].sort((a, b) => a.y - b.y).map((c) => c.id);
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
  return {
    names: "",
    blocked: [],
    assignment: {},
    constraints: [],
    fixedSeats: [],
    pickHistory: [],
    groupCount: 4,
    groupSize: 3,
    groupMode: "count",
    groupConstraints: [],
  };
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
  resetGroupsView();
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

  clearGroupColorsBtn.classList.toggle("hidden", !showGroupColorsOnBoard);
  const groupOfName = {};
  if (showGroupColorsOnBoard && lastGroups) {
    lastGroups.forEach((names, gi) => names.forEach((name) => (groupOfName[name] = gi)));
  }

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
        if (groupOfName[label] !== undefined) {
          desk.style.setProperty("--seat-fill", GROUP_COLORS[groupOfName[label] % GROUP_COLORS.length]);
        }
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

  fitBoardToContainer();
}

// The board is a fixed 900x560 canvas so the fan-rotation math stays exact —
// instead of letting it overflow into a scrollbar, scale the whole thing down
// (a transform, so nothing inside has to be recalculated) to whatever fits
// the available space, up to its natural 1:1 size.
function fitBoardToContainer() {
  const scroll = board.parentElement;
  if (!scroll) return;
  const scale = Math.min(scroll.clientWidth / 900, scroll.clientHeight / 560, 1);
  board.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", fitBoardToContainer);
sidebar.addEventListener("transitionend", (e) => {
  if (e.propertyName === "width") fitBoardToContainer();
});

function renderConstraintOptions() {
  const names = getNames(namesInput.value);
  const options = names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  constraintA.innerHTML = options;
  constraintB.innerHTML = options;
  fixedSeatName.innerHTML = options;
  groupConstraintA.innerHTML = options;
  groupConstraintB.innerHTML = options;
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

function renderGroupConstraintList() {
  const cls = currentClass();
  if (!cls.groupConstraints.length) {
    groupConstraintList.innerHTML = `<li class="constraint-empty" style="list-style:none">Brak reguł.</li>`;
    return;
  }
  groupConstraintList.innerHTML = cls.groupConstraints
    .map(
      (pair, i) =>
        `<li><span>${escapeHtml(pair.a)} ↔ ${escapeHtml(pair.b)}</span><button data-idx="${i}" title="Usuń regułę"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></li>`
    )
    .join("");
  groupConstraintList.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cls.groupConstraints.splice(Number(btn.dataset.idx), 1);
      saveClasses(true);
      renderGroupConstraintList();
    });
  });
}

function renderMain() {
  renderClassSelect();
  renderClassSummary();
  renderBoard();
  if (currentMode === "groups") renderGroupControls();
}

// ---------- Mode switch: seating chart vs. picking one person ----------

function movePill(container, pill) {
  const activeBtn = container.querySelector(".mode-tab.active");
  if (!activeBtn) return;
  pill.style.width = `${activeBtn.offsetWidth}px`;
  pill.style.transform = `translateX(${activeBtn.offsetLeft - 3}px)`;
}

function moveAllPills() {
  movePill(modeTabs, modeTabPill);
  movePill(themeTabs, themeTabPill);
  movePill(speedTabs, speedTabPill);
  movePill(priorityTabs, priorityTabPill);
  movePill(effectsTabs, effectsTabPill);
  movePill(groupModeTabs, groupModeTabPill);
}

function applyMode() {
  const isPerson = currentMode === "person";
  const isGroups = currentMode === "groups";
  const isSeats = !isPerson && !isGroups;
  modeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === currentMode);
  });
  seatsOnlySection.classList.toggle("hidden", !isSeats);
  personOnlySection.classList.toggle("hidden", !isPerson);
  groupsOnlySection.classList.toggle("hidden", !isGroups);
  seatsView.classList.toggle("hidden", !isSeats);
  personView.classList.toggle("hidden", !isPerson);
  groupsView.classList.toggle("hidden", !isGroups);
  losujLabel.textContent = isPerson ? "Losuj osobę" : isGroups ? "Losuj grupy" : "Losuj miejsca";
  movePill(modeTabs, modeTabPill);
  if (isSeats) fitBoardToContainer();
  if (isGroups) renderGroupControls();
}

function renderGroupControls() {
  const cls = state.classes && currentClassName ? state.classes[currentClassName] : null;
  const mode = cls ? cls.groupMode : "count";
  groupModeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.groupMode === mode);
  });
  movePill(groupModeTabs, groupModeTabPill);
  groupCountRow.classList.toggle("hidden", mode !== "count");
  groupSizeRow.classList.toggle("hidden", mode !== "size");
  groupCountInput.value = cls ? cls.groupCount : 4;
  groupSizeInput.value = cls ? cls.groupSize : 3;
}

window.addEventListener("resize", moveAllPills);

function setMode(mode) {
  currentMode = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
  applyMode();
}

modeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

applyMode();

// ---------- Settings: theme + shuffle speed ----------

const THEME_KEY = "random-seat-navigo-theme";
const SPEED_KEY = "random-seat-navigo-speed";
const PRIORITY_KEY = "random-seat-navigo-seat-priority";

let currentTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
let shuffleSpeed = localStorage.getItem(SPEED_KEY) === "short" ? "short" : "long";
const storedPriority = localStorage.getItem(PRIORITY_KEY);
let seatPriority = storedPriority === "closest" || storedPriority === "min2" ? storedPriority : "random";

const EFFECTS_KEY = "random-seat-navigo-effects";
let specialEffects = localStorage.getItem(EFFECTS_KEY) === "on" ? "on" : "off";

const SPEED_PRESETS = {
  long: { tableStagger: 260, seatStagger: 60, spinBase: 620, spinRand: 180, tickStart: 45, tickGrowth: 1.16, pickMs: 900 },
  short: { tableStagger: 70, seatStagger: 20, spinBase: 200, spinRand: 70, tickStart: 28, tickGrowth: 1.1, pickMs: 320 },
};

function applyTheme() {
  if (currentTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  themeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === currentTheme);
  });
  movePill(themeTabs, themeTabPill);
}

function applySpeed() {
  speedTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.speed === shuffleSpeed);
  });
  movePill(speedTabs, speedTabPill);
}

function applySeatPriority() {
  priorityTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.priority === seatPriority);
  });
  movePill(priorityTabs, priorityTabPill);
}

// ---------- Special effects: orange theme + falling leaves ----------

const LEAF_COLORS = ["#e8730b", "#c0392b", "#e0b23c"];
// A pointed almond silhouette (tips top and bottom) reads as a leaf even at
// tiny sizes while spinning — the earlier rounder outline just looked like a
// dot once it got small.
const LEAF_SHAPE = `
  <path d="M12 1C21 7 21 17 12 23C3 17 3 7 12 1Z" />
  <path d="M12 3v18" stroke="rgba(0,0,0,0.3)" stroke-width="1" fill="none" />
`;
let leafInterval = null;

function spawnLeaf() {
  const leaf = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  leaf.setAttribute("viewBox", "0 0 24 24");
  leaf.classList.add("leaf");
  leaf.style.fill = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
  leaf.innerHTML = LEAF_SHAPE;

  const size = 16 + Math.random() * 14;
  const duration = 7 + Math.random() * 6;
  leaf.style.width = `${size}px`;
  leaf.style.height = `${size}px`;
  leaf.style.left = `${Math.random() * 100}%`;
  leaf.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
  leaf.style.setProperty("--spin", `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360)}deg`);
  leaf.style.animationDuration = `${duration}s`;

  leavesLayer.appendChild(leaf);
  setTimeout(() => leaf.remove(), duration * 1000 + 100);
}

function startLeaves() {
  if (leafInterval) return;
  spawnLeaf();
  leafInterval = setInterval(spawnLeaf, 275);
}

function stopLeaves() {
  clearInterval(leafInterval);
  leafInterval = null;
  leavesLayer.innerHTML = "";
}

function applyEffects() {
  if (specialEffects === "on") {
    document.documentElement.setAttribute("data-effects", "on");
    startLeaves();
  } else {
    document.documentElement.removeAttribute("data-effects");
    stopLeaves();
  }
  effectsTabs.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.effects === specialEffects);
  });
  movePill(effectsTabs, effectsTabPill);
}

themeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentTheme = btn.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
    } catch {
      // ignore
    }
    applyTheme();
  });
});

speedTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    shuffleSpeed = btn.dataset.speed;
    try {
      localStorage.setItem(SPEED_KEY, shuffleSpeed);
    } catch {
      // ignore
    }
    applySpeed();
  });
});

priorityTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    seatPriority = btn.dataset.priority;
    try {
      localStorage.setItem(PRIORITY_KEY, seatPriority);
    } catch {
      // ignore
    }
    applySeatPriority();
  });
});

effectsTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    specialEffects = btn.dataset.effects;
    try {
      localStorage.setItem(EFFECTS_KEY, specialEffects);
    } catch {
      // ignore
    }
    applyEffects();
  });
});

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = settingsPanel.classList.contains("hidden");
  settingsPanel.classList.toggle("hidden");
  if (willOpen) {
    moveAllPills();
    timerPanel.classList.add("hidden");
  } else {
    setPanelFullscreen(settingsPanel, settingsFullscreenBtn, false);
  }
});

document.addEventListener("click", (e) => {
  if (!settingsPanel.classList.contains("hidden") && !e.target.closest(".settings-wrap")) {
    settingsPanel.classList.add("hidden");
    setPanelFullscreen(settingsPanel, settingsFullscreenBtn, false);
  }
});

applyTheme();
applySpeed();
applySeatPriority();
applyEffects();

// ---------- Panel fullscreen toggle (timer + settings) ----------

const PANEL_MAXIMIZE_ICON =
  '<path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />';
const PANEL_MINIMIZE_ICON =
  '<path d="M9 3v4a2 2 0 0 1-2 2H3" /><path d="M15 3v4a2 2 0 0 0 2 2h4" /><path d="M9 21v-4a2 2 0 0 0-2-2H3" /><path d="M15 21v-4a2 2 0 0 1 2-2h4" />';

function setPanelFullscreen(panel, btn, on) {
  panel.classList.toggle("fullscreen", on);
  btn.querySelector("svg").innerHTML = on ? PANEL_MINIMIZE_ICON : PANEL_MAXIMIZE_ICON;
  btn.title = on ? "Wyjdź z pełnego ekranu" : "Pełny ekran";
  // Sub-tab pills are sized in px from the old (compact vs. fullscreen)
  // layout — recompute once the new width has actually been laid out.
  requestAnimationFrame(moveAllPills);
}

timerFullscreenBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setPanelFullscreen(timerPanel, timerFullscreenBtn, !timerPanel.classList.contains("fullscreen"));
});

settingsFullscreenBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setPanelFullscreen(settingsPanel, settingsFullscreenBtn, !settingsPanel.classList.contains("fullscreen"));
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (timerPanel.classList.contains("fullscreen")) setPanelFullscreen(timerPanel, timerFullscreenBtn, false);
  if (settingsPanel.classList.contains("fullscreen")) setPanelFullscreen(settingsPanel, settingsFullscreenBtn, false);
});

// ---------- Timer (minutnik) ----------

const TIMER_DEFAULT_SECS = 5 * 60;
const TIMER_MAX_SECS = 90 * 60;

let timerTotal = TIMER_DEFAULT_SECS;
let timerRemaining = TIMER_DEFAULT_SECS;
let timerRunning = false;
let timerInterval = null;
let timerEndAt = null;

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerRemaining);
  timerStartBtn.textContent = timerRunning ? "Pauza" : "Start";
  if (document.activeElement !== timerMinutesInput) timerMinutesInput.value = Math.floor(timerTotal / 60);
  if (document.activeElement !== timerSecondsInput) timerSecondsInput.value = timerTotal % 60;
  timerPanel
    .querySelectorAll(".timer-presets button, .timer-adjust button, .timer-manual input, .timer-manual button")
    .forEach((el) => {
      el.disabled = timerRunning;
    });
  if (timerRunning || timerRemaining !== timerTotal) {
    timerBadge.textContent = formatTime(timerRemaining);
    timerBadge.classList.remove("hidden");
  } else {
    timerBadge.classList.add("hidden");
  }
}

function setTimerSeconds(secs) {
  if (timerRunning) return;
  timerTotal = Math.max(0, Math.min(TIMER_MAX_SECS, secs));
  timerRemaining = timerTotal;
  renderTimer();
}

function playTimerBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [0, 0.3, 0.6].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
  } catch {
    // ignore — audio not available (e.g. autoplay policy)
  }
}

function stopTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function startPauseTimer() {
  if (timerRunning) {
    timerRunning = false;
    stopTimerInterval();
    renderTimer();
    return;
  }
  if (timerRemaining <= 0) return;
  timerRunning = true;
  timerEndAt = Date.now() + timerRemaining * 1000;
  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, Math.round((timerEndAt - Date.now()) / 1000));
    renderTimer();
    if (timerRemaining <= 0) {
      timerRunning = false;
      stopTimerInterval();
      renderTimer();
      timerBtn.classList.add("timer-ringing");
      setTimeout(() => timerBtn.classList.remove("timer-ringing"), 2600);
      playTimerBeep();
    }
  }, 250);
  renderTimer();
}

function resetTimer() {
  timerRunning = false;
  stopTimerInterval();
  timerRemaining = timerTotal;
  renderTimer();
}

timerPanel.querySelectorAll(".timer-presets button").forEach((btn) => {
  btn.addEventListener("click", () => setTimerSeconds(Number(btn.dataset.secs)));
});
timerMinus.addEventListener("click", () => setTimerSeconds(timerTotal - 60));
timerPlus.addEventListener("click", () => setTimerSeconds(timerTotal + 60));

function applyManualTimer() {
  const mins = Math.max(0, parseInt(timerMinutesInput.value, 10) || 0);
  const secs = Math.max(0, parseInt(timerSecondsInput.value, 10) || 0);
  setTimerSeconds(mins * 60 + secs);
}
timerSetBtn.addEventListener("click", applyManualTimer);
[timerMinutesInput, timerSecondsInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyManualTimer();
  });
});
timerStartBtn.addEventListener("click", startPauseTimer);
timerResetBtn.addEventListener("click", resetTimer);

timerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = timerPanel.classList.contains("hidden");
  timerPanel.classList.toggle("hidden");
  if (willOpen) settingsPanel.classList.add("hidden");
  else setPanelFullscreen(timerPanel, timerFullscreenBtn, false);
});

document.addEventListener("click", (e) => {
  if (!timerPanel.classList.contains("hidden") && !e.target.closest(".timer-wrap")) {
    timerPanel.classList.add("hidden");
    setPanelFullscreen(timerPanel, timerFullscreenBtn, false);
  }
});

renderTimer();

// ---------- Pick-one-person mode ----------

function pickPerson() {
  if (shuffleBtn.disabled) return;
  const cls = currentClass();
  const names = getNames(cls.names);
  if (!names.length) {
    alert("Brak uczniów na liście — dodaj ich w edycji klasy.");
    return;
  }

  // Exclude whoever was picked in the last PICK_COOLDOWN draws, but always
  // leave at least one candidate even for a very small class.
  const excludeCount = Math.min(PICK_COOLDOWN, names.length - 1);
  const excluded = new Set((cls.pickHistory || []).slice(0, excludeCount));
  const candidates = names.filter((n) => !excluded.has(n));
  const pool = candidates.length ? candidates : names;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  shuffleBtn.disabled = true;
  flickerToFinal(personPickText, names, picked, SPEED_PRESETS[shuffleSpeed].pickMs, () => {
    shuffleBtn.disabled = false;
    cls.pickHistory = [picked, ...(cls.pickHistory || [])].slice(0, PICK_COOLDOWN);
    saveClasses(true);
  });
}

// ---------- Group-drawing mode ----------

// A fixed, vivid palette (not theme-reactive) so groups stay visually
// distinct from each other and from the app's own accent color.
const GROUP_COLORS = [
  "#2e86de", "#e67e22", "#8e44ad", "#16a085", "#c0392b",
  "#27ae60", "#2980b9", "#d35400", "#7f5af0", "#cc3366",
];

// Which group (index) the current class's last drawn groups put each name
// in, kept only in memory (not synced) — powers "show groups on the seating
// plan" and is cleared whenever the class changes.
let lastGroups = null;
let showGroupColorsOnBoard = false;

function setGroupCount(n) {
  const clamped = Math.max(2, Math.min(12, Number(n) || 4));
  currentClass().groupCount = clamped;
  groupCountInput.value = clamped;
  saveClasses();
}

function setGroupSize(n) {
  const clamped = Math.max(2, Math.min(10, Number(n) || 3));
  currentClass().groupSize = clamped;
  groupSizeInput.value = clamped;
  saveClasses();
}

groupCountInput.addEventListener("change", () => setGroupCount(groupCountInput.value));
groupCountMinus.addEventListener("click", () => setGroupCount(currentClass().groupCount - 1));
groupCountPlus.addEventListener("click", () => setGroupCount(currentClass().groupCount + 1));

groupSizeInput.addEventListener("change", () => setGroupSize(groupSizeInput.value));
groupSizeMinus.addEventListener("click", () => setGroupSize(currentClass().groupSize - 1));
groupSizePlus.addEventListener("click", () => setGroupSize(currentClass().groupSize + 1));

groupModeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentClass().groupMode = btn.dataset.groupMode;
    saveClasses();
    renderGroupControls();
  });
});

// Number of groups to split into, from whichever control ("liczba grup" or
// "osób w grupie") is active — always at least 1 and never more than there
// are people, so a tiny class never ends up with empty groups.
function computeGroupCount(cls, n) {
  if (cls.groupMode === "size") {
    const size = Math.max(1, cls.groupSize || 3);
    return Math.max(1, Math.min(n, Math.ceil(n / size)));
  }
  return Math.max(1, Math.min(cls.groupCount || 4, n));
}

function countGroupViolations(groups, constraints) {
  const groupOf = {};
  groups.forEach((names, gi) => names.forEach((name) => (groupOf[name] = gi)));
  let violations = 0;
  for (const { a, b } of constraints) {
    if (groupOf[a] !== undefined && groupOf[a] === groupOf[b]) violations++;
  }
  return violations;
}

function resetGroupsView() {
  groupsHint.classList.remove("hidden");
  groupsGrid.classList.add("hidden");
  groupsGrid.innerHTML = "";
  lastGroups = null;
  showGroupColorsOnBoard = false;
  showGroupsOnBoardBtn.classList.add("hidden");
  clearGroupColorsBtn.classList.add("hidden");
}

function shuffleGroups() {
  if (shuffleBtn.disabled) return;
  const cls = currentClass();
  const names = getNames(cls.names);
  if (!names.length) {
    alert("Brak uczniów na liście — dodaj ich w edycji klasy.");
    return;
  }

  // Round-robin dealing of a shuffled name list keeps every group's size
  // within 1 of every other's no matter how many groups there are — that
  // alone gives an even split "for free". Repeated attempts vary who ends
  // up together, so we can still pick the draw with fewest broken "not
  // together" rules, same approach as the seating shuffle.
  const groupCount = computeGroupCount(cls, names.length);
  const attempts = 300;
  let best = null;
  let bestViolations = Infinity;

  for (let i = 0; i < attempts && bestViolations > 0; i++) {
    const shuffled = shuffleArray(names);
    const groups = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((name, idx) => groups[idx % groupCount].push(name));
    const violations = countGroupViolations(groups, cls.groupConstraints);
    if (violations < bestViolations) {
      bestViolations = violations;
      best = groups;
    }
  }

  lastGroups = best;
  animateGroups(best, () => {
    showGroupsOnBoardBtn.classList.remove("hidden");
    if (bestViolations > 0) {
      alert(
        `Nie udało się spełnić ${bestViolations} ${bestViolations === 1 ? "kryterium" : "kryteriów"} grup przy tym podziale. Spróbuj wylosować ponownie.`
      );
    }
  });
}

// Cards appear table-by-table like the seating shuffle, and names inside each
// card drop in one after another using the same drop-in-final keyframes.
function animateGroups(groups, onDone) {
  shuffleBtn.disabled = true;
  groupsHint.classList.add("hidden");
  groupsGrid.classList.remove("hidden");
  groupsGrid.innerHTML = "";

  const preset = SPEED_PRESETS[shuffleSpeed];
  let maxDelay = 0;

  groups.forEach((names, gi) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.style.setProperty("--group-color", GROUP_COLORS[gi % GROUP_COLORS.length]);
    card.innerHTML = `<h4>Grupa ${gi + 1}</h4><ul class="group-chip-list"></ul>`;
    groupsGrid.appendChild(card);
    const list = card.querySelector(".group-chip-list");

    const cardDelay = gi * preset.tableStagger;
    setTimeout(() => card.classList.add("group-card-in"), cardDelay);

    names.forEach((name, ni) => {
      const li = document.createElement("li");
      li.className = "group-chip";
      li.textContent = name;
      list.appendChild(li);
      const delay = cardDelay + 120 + ni * preset.seatStagger;
      maxDelay = Math.max(maxDelay, delay);
      setTimeout(() => li.classList.add("drop-in-final"), delay);
    });
  });

  setTimeout(() => {
    shuffleBtn.disabled = false;
    if (onDone) onDone();
  }, maxDelay + 400);
}

// ---------- Seat the last drawn groups together at shared tables ----------

// Bin-packs each group into as few tables as possible (largest groups and
// largest tables first) so everyone in a group ends up at the SAME table
// whenever it fits, splitting across more than one table only when a group
// is bigger than any single table's capacity — never mixing two groups at
// one table just to fill a spare seat.
function arrangeGroupsOnBoard() {
  const cls = currentClass();
  const availableSeats = ALL_DESK_IDS.filter((id) => !cls.blocked.includes(id));
  if (!availableSeats.length) {
    alert("Brak dostępnych stolików — odblokuj miejsca na planie.");
    return;
  }

  const clusters = Object.values(groupSeatsByCluster(availableSeats))
    .map((seats) => shuffleArray(seats))
    .sort((a, b) => b.length - a.length);

  const groupsBySize = lastGroups.map((names) => [...names]).sort((a, b) => b.length - a.length);

  const assignment = {};
  const unseated = [];
  let clusterIdx = 0;

  groupsBySize.forEach((names) => {
    let remaining = names;
    while (remaining.length && clusterIdx < clusters.length) {
      const seats = clusters[clusterIdx];
      const take = remaining.slice(0, seats.length);
      take.forEach((name, i) => (assignment[seats[i]] = name));
      remaining = remaining.slice(take.length);
      clusterIdx++;
    }
    unseated.push(...remaining);
  });

  showGroupColorsOnBoard = true;
  setMode("seats");

  animateShuffle(assignment, () => {
    cls.assignment = assignment;
    saveClasses(true);
    renderBoard();
    if (unseated.length) {
      alert(
        `${unseated.length} ${unseated.length === 1 ? "uczeń nie zmieścił się" : "uczniów nie zmieściło się"} przy stolikach — za mało miejsc, by posadzić wszystkie grupy przy osobnych stolikach.`
      );
    }
  });
}

showGroupsOnBoardBtn.addEventListener("click", () => {
  if (!lastGroups) return;
  arrangeGroupsOnBoard();
});

clearGroupColorsBtn.addEventListener("click", () => {
  showGroupColorsOnBoard = false;
  renderBoard();
});

function renderModalContents() {
  const cls = currentClass();
  classNameInput.value = currentClassName;
  namesInput.value = cls.names;
  nameCount.textContent = `${getNames(cls.names).length} ${getNames(cls.names).length === 1 ? "uczeń" : "uczniów"}`;
  renderConstraintOptions();
  renderConstraintList();
  renderGroupConstraintList();
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

// Groups free seats by cluster, in the same shape every seat-priority builder
// below needs (cluster id -> that cluster's currently-free desk ids).
function groupSeatsByCluster(freeSeats) {
  const byCluster = {};
  freeSeats.forEach((id) => {
    const cid = clusterIdOf(id);
    (byCluster[cid] ||= []).push(id);
  });
  return byCluster;
}

// Every combination of per-cluster counts (each either 0 or somewhere in
// [2, cap]) that sums exactly to n — the search space is tiny (at most 6
// clusters, capacity 2 or 3 each) so brute force is instant.
function findMinTwoCombos(n, caps) {
  const results = [];
  function rec(idx, remaining, counts) {
    if (idx === caps.length) {
      if (remaining === 0) results.push([...counts]);
      return;
    }
    counts.push(0);
    rec(idx + 1, remaining, counts);
    counts.pop();
    const maxTake = Math.min(caps[idx], remaining);
    for (let take = 2; take <= maxTake; take++) {
      counts.push(take);
      rec(idx + 1, remaining - take, counts);
      counts.pop();
    }
  }
  rec(0, n, []);
  return results;
}

// Seat order for the "closest to the board" priority: fill clusters nearest
// the board first (see PROXIMITY_ORDER), each one fully before moving to the
// next, so a partial class leaves only the far clusters empty.
function proximityOrderedSeats(freeSeats) {
  const byCluster = groupSeatsByCluster(freeSeats);
  return PROXIMITY_ORDER.filter((cid) => byCluster[cid]).flatMap((cid) => shuffleArray(byCluster[cid]));
}

// Seat order for the "at least 2 per table" priority: pick a random valid
// split of `seatCount` people across clusters where every used cluster gets
// 2 or more (or is left completely empty), then return those seats first,
// followed by the untouched ones (which the caller never reaches).
function minTwoOrderedSeats(freeSeats, seatCount) {
  if (!freeSeats.length || !seatCount) return shuffleArray(freeSeats);

  const byCluster = groupSeatsByCluster(freeSeats);
  const clusterIds = shuffleArray(Object.keys(byCluster));
  const caps = clusterIds.map((cid) => byCluster[cid].length);

  let combos = findMinTwoCombos(seatCount, caps);
  if (!combos.length) {
    // No exact split avoids a lone seat (only possible when seatCount itself
    // can't be reached, e.g. exactly 1 person left over) — seat that person
    // at a table that already has room rather than dropping them entirely.
    combos = findMinTwoCombos(seatCount - 1, caps);
    if (combos.length) {
      const combo = [...combos[Math.floor(Math.random() * combos.length)]];
      const bumpIdx = combo.findIndex((c, i) => c > 0 && c < caps[i]);
      if (bumpIdx >= 0) combo[bumpIdx] += 1;
      else combo[combo.findIndex((c) => c === 0)] = 1;
      combos = [combo];
    }
  }
  const counts = combos.length ? combos[Math.floor(Math.random() * combos.length)] : caps.map(() => 0);

  const used = [];
  const unused = [];
  clusterIds.forEach((cid, i) => {
    const seats = shuffleArray(byCluster[cid]);
    used.push(...seats.slice(0, counts[i]));
    unused.push(...seats.slice(counts[i]));
  });
  return [...used, ...unused];
}

function buildSeatOrder(freeSeats, seatCount) {
  if (seatPriority === "closest") return proximityOrderedSeats(freeSeats);
  if (seatPriority === "min2") return minTwoOrderedSeats(freeSeats, seatCount);
  return shuffleArray(freeSeats);
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
  const seatCount = Math.min(freeNames.length, freeSeats.length);

  const attempts = 300;
  let best = null;
  let bestViolations = Infinity;

  for (let i = 0; i < attempts && bestViolations > 0; i++) {
    const shuffledNames = shuffleArray(freeNames);
    const seatOrder = buildSeatOrder(freeSeats, seatCount);
    const assignment = { ...fixedBase };
    shuffledNames.slice(0, seatOrder.length).forEach((name, idx) => {
      assignment[seatOrder[idx]] = name;
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
  const preset = SPEED_PRESETS[shuffleSpeed];
  let elapsed = 0;
  let delay = preset.tickStart;
  function tick() {
    if (elapsed + delay >= totalMs) {
      dropInText(textEl, finalName, true);
      onLanded();
      return;
    }
    dropInText(textEl, pool[Math.floor(Math.random() * pool.length)], false);
    elapsed += delay;
    delay *= preset.tickGrowth; // ease out: each flip takes a little longer, like it's slowing down
    setTimeout(tick, delay);
  }
  tick();
}

function animateShuffle(finalAssignment, onDone) {
  if (shuffleBtn.disabled) return;
  shuffleBtn.disabled = true;

  const deskEls = [...board.querySelectorAll(".desk")];
  const pool = Object.values(finalAssignment);

  const preset = SPEED_PRESETS[shuffleSpeed];
  const TABLE_STAGGER = preset.tableStagger; // ms between one table starting and the next
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
    // Blocked desks never take part in the shuffle and never change, so they
    // sit the animation out — but every other desk spins, even ones that end
    // up empty (there just weren't enough students for every seat).
    if (desk.classList.contains("blocked") || !pool.length) return;

    const finalName = finalAssignment[key];
    const isFilled = Boolean(finalName);
    const finalLabel = isFilled ? finalName : String(CLUSTER_NUMBER[clusterIdOf(key)]);

    const cid = clusterIdOf(key);
    const tableStagger = clusterOrderSeen.indexOf(cid) * TABLE_STAGGER;
    const seatWithinTable = deskIdsOfClusterId(cid).indexOf(key);
    const stagger = tableStagger + seatWithinTable * preset.seatStagger;
    const spinFor = preset.spinBase + Math.random() * preset.spinRand;
    pending++;

    const label = desk.querySelector(".desk-label-text");

    setTimeout(() => {
      desk.classList.remove("empty");
      desk.classList.add("filled", "shuffling"); // vivid color while spinning either way

      flickerToFinal(label, pool, finalLabel, spinFor, () => {
        desk.classList.remove("shuffling");
        if (!isFilled) {
          desk.classList.remove("filled");
          desk.classList.add("empty");
        }
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

shuffleBtn.addEventListener("click", () => {
  if (currentMode === "person") pickPerson();
  else if (currentMode === "groups") shuffleGroups();
  else shuffleSeats();
});

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

addGroupConstraintBtn.addEventListener("click", () => {
  const a = groupConstraintA.value;
  const b = groupConstraintB.value;
  if (!a || !b || a === b) return;
  const cls = currentClass();
  const exists = cls.groupConstraints.some(
    (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)
  );
  if (exists) return;
  cls.groupConstraints.push({ a, b });
  saveClasses(true);
  renderGroupConstraintList();
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
    if (!cls.pickHistory) cls.pickHistory = [];
    if (!cls.groupCount) cls.groupCount = 4;
    if (!cls.groupSize) cls.groupSize = 3;
    if (!cls.groupMode) cls.groupMode = "count";
    if (!cls.groupConstraints) cls.groupConstraints = [];
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

// Runs last, once every const/let above this point has been initialized —
// init() (called from unlockApp) reaches back up to things like `state` that
// are declared further down the file than the gate code near the top.
let alreadyUnlocked = false;
try {
  alreadyUnlocked = localStorage.getItem(ACCESS_UNLOCKED_KEY) === "1";
} catch {
  // ignore
}
if (alreadyUnlocked) unlockApp();
