// Meme-based Space-bar animations. Self-contained: injects its own overlay and
// styles, draws everything as inline SVG/CSS (no external assets), and hands
// script.js a list of { id, name, title, icon, play } entries. `play()` starts
// the animation and returns how long it runs (ms).

const MEME_CSS = `
.meme-layer { position: fixed; inset: 0; overflow: hidden; z-index: 600; pointer-events: none; }
.meme-root { position: absolute; inset: 0; }
.meme-root svg { display: block; }

@keyframes meme-bob { from { transform: translateY(0); } to { transform: translateY(-5%); } }
@keyframes meme-twinkle {
  0%, 100% { opacity: 0.2; transform: rotate(45deg) scale(0.6); }
  50% { opacity: 1; transform: rotate(45deg) scale(1.4); }
}
@keyframes meme-fade-mid { 0% { opacity: 0; } 8%, 86% { opacity: 1; } 100% { opacity: 0; } }

/* ---- Nyan Cat ---- */
.meme-sky { position: absolute; inset: 0; background: #0b1b4d; opacity: 0; animation: meme-sky 4.2s ease-in-out forwards; }
@keyframes meme-sky { 0% { opacity: 0; } 10%, 84% { opacity: 0.78; } 100% { opacity: 0; } }
.meme-stars { position: absolute; inset: 0; opacity: 0; animation: meme-sky 4.2s ease-in-out forwards; }
.meme-star { position: absolute; width: 7px; height: 7px; background: #fff; box-shadow: 0 0 8px #fff; transform: rotate(45deg); animation: meme-twinkle 0.9s ease-in-out infinite; }
.meme-nyan { position: absolute; top: 34%; left: 0; width: clamp(150px, 22vw, 240px); transform: translateX(-25vw); animation: meme-nyan-fly 4.2s linear forwards; }
@keyframes meme-nyan-fly { from { transform: translateX(-25vw); } to { transform: translateX(185vw); } }
.meme-nyan-cat { position: relative; width: 100%; height: auto; animation: meme-bob 0.3s steps(1) infinite alternate; }
.meme-nyan-trail {
  position: absolute; right: 85%; top: 22%; width: 80vw; height: 52%;
  background: linear-gradient(to bottom, #ff1d1d 0 16.6%, #ff9a00 16.6% 33.3%, #ffee00 33.3% 50%, #2bff3a 50% 66.6%, #2f9bff 66.6% 83.3%, #7b3bff 83.3% 100%);
  animation: meme-bob 0.3s steps(1) infinite alternate-reverse;
}

/* ---- Among Us ---- */
.meme-amogus { position: absolute; left: 0; bottom: 7%; width: clamp(72px, 12vw, 130px); transform: translateX(-20vw); animation: meme-amogus-walk 4.2s linear forwards; }
@keyframes meme-amogus-walk { from { transform: translateX(-20vw); } to { transform: translateX(125vw); } }
.meme-amogus svg { width: 100%; height: auto; animation: meme-waddle 0.32s ease-in-out infinite alternate; }
@keyframes meme-waddle { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-4%) rotate(2deg); } }
.meme-leg-l, .meme-leg-r { transform-box: fill-box; animation: meme-leg 0.32s ease-in-out infinite alternate; }
.meme-leg-r { animation-direction: alternate-reverse; }
@keyframes meme-leg { from { transform: translateY(0); } to { transform: translateY(-14%); } }
.meme-bubble {
  position: absolute; left: 50%; bottom: 104%; transform: translateX(-50%) scale(0.3); opacity: 0;
  padding: 4px 14px; background: #fff; color: #111; border: 3px solid #111; border-radius: 16px;
  font: 800 clamp(1rem, 3vw, 1.7rem) "Segoe UI", system-ui, sans-serif; white-space: nowrap;
  animation: meme-bubble 4.2s linear forwards;
}
.meme-bubble::after { content: ""; position: absolute; left: 50%; top: 100%; width: 12px; height: 12px; background: #fff; border: solid #111; border-width: 0 3px 3px 0; transform: translate(-50%, -6px) rotate(45deg); }
@keyframes meme-bubble {
  0%, 28% { opacity: 0; transform: translateX(-50%) scale(0.3); }
  34% { opacity: 1; transform: translateX(-50%) scale(1.12); }
  38%, 70% { opacity: 1; transform: translateX(-50%) scale(1); }
  76%, 100% { opacity: 0; transform: translateX(-50%) scale(0.3); }
}

/* ---- Chrome T-Rex ---- */
.meme-dino-stage { position: absolute; inset: 0; background: #f7f7f7; opacity: 0; animation: meme-fade-mid 4s ease-in-out forwards; font-family: "Courier New", monospace; }
.meme-dino-score { position: absolute; top: 12%; right: 6%; color: #535353; font-weight: 700; font-size: clamp(1rem, 2.6vw, 1.6rem); letter-spacing: 0.1em; }
.meme-dino-score .hi { color: #757575; margin-right: 1em; }
.meme-dino-ground { position: absolute; left: 0; right: 0; bottom: 14%; height: 2px; background: #535353; }
.meme-dino, .meme-cactus { --w: clamp(52px, 9vw, 84px); position: absolute; bottom: 14%; }
.meme-dino { left: 16vw; width: var(--w); --jump: clamp(100px, 24vh, 200px); animation: meme-dino-jump 4s linear forwards; }
.meme-dino svg { width: 100%; height: auto; }
@keyframes meme-dino-jump {
  0%, 55% { transform: translateY(0); animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1); }
  66% { transform: translateY(calc(-1 * var(--jump))); animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.3); }
  82%, 100% { transform: translateY(0); }
}
.meme-dino-l, .meme-dino-r { animation: meme-dstep 0.18s steps(1) infinite alternate; }
.meme-dino-r { animation-direction: alternate-reverse; }
@keyframes meme-dstep { from { transform: translateY(0); } to { transform: translateY(-14%); } }
.meme-dino-l, .meme-dino-r { transform-box: fill-box; }
.meme-cactus { left: 0; width: calc(var(--w) * 0.5); transform: translateX(110vw); animation: meme-cactus 3.8s linear forwards; }
.meme-cactus svg { width: 100%; height: auto; }
@keyframes meme-cactus { from { transform: translateX(110vw); } to { transform: translateX(-10vw); } }

/* ---- Creeper ---- */
.meme-flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: meme-flash 4.4s linear forwards; }
@keyframes meme-flash { 0%, 71.5% { opacity: 0; } 72.5% { opacity: 0.95; } 82% { opacity: 0.35; } 92%, 100% { opacity: 0; } }
.meme-root { --cw: clamp(60px, 9vw, 110px); }
.meme-creeper { position: absolute; left: 0; bottom: 6%; width: var(--cw); transform: translateX(110vw); animation: meme-creeper-walk 4.4s linear forwards; }
@keyframes meme-creeper-walk {
  0% { transform: translateX(110vw); opacity: 1; }
  40% { transform: translateX(46vw); }
  71.9% { transform: translateX(46vw); opacity: 1; }
  72% { transform: translateX(46vw); opacity: 0; }
  100% { transform: translateX(46vw); opacity: 0; }
}
.meme-creeper-shake { animation: meme-shuffle 0.4s steps(2) infinite; transform-origin: 50% 100%; }
@keyframes meme-shuffle { from { transform: rotate(-2deg); } to { transform: rotate(2deg); } }
.meme-creeper-body { width: 100%; height: auto; transform-origin: 50% 100%; animation: meme-swell 4.4s linear forwards; }
@keyframes meme-swell {
  0%, 40% { transform: scale(1); filter: brightness(1); }
  46% { transform: scale(1.1); filter: brightness(2.3); }
  52% { transform: scale(1.15); filter: brightness(1); }
  58% { transform: scale(1.25); filter: brightness(2.3); }
  64% { transform: scale(1.32); filter: brightness(1); }
  68% { transform: scale(1.4); filter: brightness(2.5); }
  71.9%, 100% { transform: scale(1.5); filter: brightness(1); }
}
.meme-creeper-text {
  position: absolute; left: 50%; bottom: 160%; white-space: nowrap; opacity: 0;
  font: 900 clamp(1.4rem, 4vw, 2.6rem) "Segoe UI", system-ui, sans-serif; color: #5eb64f;
  -webkit-text-stroke: 2px #1b3a17; paint-order: stroke fill; transform: translateX(-50%);
  animation: meme-creeper-text 4.4s linear forwards;
}
@keyframes meme-creeper-text { 0%, 40% { opacity: 0; } 44%, 71% { opacity: 1; } 72%, 100% { opacity: 0; } }
.meme-debris { position: absolute; left: calc(46vw + var(--cw) / 2); bottom: calc(6% + var(--cw) * 1.7); opacity: 0; animation: meme-debris 0.9s ease-out 3.17s forwards; }
@keyframes meme-debris {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(260deg) scale(0.3); }
}
.meme-boom-text {
  position: absolute; left: 50%; top: 36%; opacity: 0;
  font: 900 clamp(3rem, 14vw, 9rem) "Segoe UI", system-ui, sans-serif; color: #ff8a00;
  -webkit-text-stroke: 5px #2a1400; paint-order: stroke fill; text-shadow: 0 6px 0 #2a1400;
  animation: meme-boom-pop 4.4s linear forwards;
}
@keyframes meme-boom-pop {
  0%, 71.9% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-6deg); }
  74% { opacity: 1; transform: translate(-50%, -50%) scale(1.25) rotate(-5deg); }
  80%, 92% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-4deg); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.05) rotate(-4deg); }
}

/* ---- Surprised Pikachu ---- */
.meme-pika { position: absolute; left: 50%; top: 46%; width: clamp(220px, 46vh, 420px); transform: translate(-50%, -50%) scale(0); animation: meme-pika 3.6s linear forwards; }
.meme-pika svg { width: 100%; height: auto; }
@keyframes meme-pika {
  0% { transform: translate(-50%, -50%) scale(0) rotate(-12deg); animation-timing-function: cubic-bezier(0.2, 1.6, 0.4, 1); }
  12% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  22% { transform: translate(-50%, -50%) scale(1.02) rotate(-1.5deg); }
  34% { transform: translate(-50%, -50%) scale(1) rotate(1.5deg); }
  46% { transform: translate(-50%, -50%) scale(1.02) rotate(-1.5deg); }
  58% { transform: translate(-50%, -50%) scale(1) rotate(1.2deg); }
  70%, 86% { transform: translate(-50%, -50%) scale(1) rotate(0deg); animation-timing-function: ease-in; }
  100% { transform: translate(-50%, -50%) scale(0) rotate(8deg); }
}
.meme-pika-text {
  position: absolute; left: 50%; top: 98%; transform: translateX(-50%); white-space: nowrap;
  font: 900 clamp(1.6rem, 6vw, 3.2rem) Impact, "Arial Black", sans-serif; text-transform: uppercase; color: #fff;
  -webkit-text-stroke: 3px #000; paint-order: stroke fill; letter-spacing: 0.03em;
}

/* ---- Doge ---- */
.meme-doge { position: absolute; left: 50%; top: 54%; width: clamp(200px, 42vh, 380px); transform: translate(-50%, -50%) scale(0); animation: meme-doge 4.2s linear forwards; }
.meme-doge svg { width: 100%; height: auto; }
@keyframes meme-doge {
  0% { transform: translate(-50%, -50%) scale(0); animation-timing-function: cubic-bezier(0.2, 1.6, 0.4, 1); }
  10% { transform: translate(-50%, -50%) scale(1); }
  30% { transform: translate(-50%, -52%) scale(1.02); }
  50% { transform: translate(-50%, -49%) scale(1); }
  70%, 88% { transform: translate(-50%, -51%) scale(1.02); animation-timing-function: ease-in; }
  100% { transform: translate(-50%, -50%) scale(0); }
}
.meme-word {
  position: absolute; opacity: 0; white-space: nowrap; color: var(--c); font-weight: 700;
  font: 700 clamp(1.3rem, 4.4vw, 3.2rem) "Comic Sans MS", "Comic Sans", "Chalkboard SE", "Comic Neue", cursive, sans-serif;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  animation: meme-word 2.6s linear var(--d) forwards;
}
@keyframes meme-word {
  0% { opacity: 0; transform: scale(0.3) rotate(var(--r)); }
  10% { opacity: 1; transform: scale(1.18) rotate(var(--r)); }
  16% { opacity: 1; transform: scale(1) rotate(var(--r)); }
  85% { opacity: 1; transform: scale(1) translateY(-6px) rotate(var(--r)); }
  100% { opacity: 0; transform: scale(1) translateY(-12px) rotate(var(--r)); }
}
`;

let styleInjected = false;

function ensureLayer() {
  if (!styleInjected) {
    const style = document.createElement("style");
    style.textContent = MEME_CSS;
    document.head.appendChild(style);
    styleInjected = true;
  }
  let layer = document.getElementById("memeLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "memeLayer";
    layer.className = "meme-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
  }
  return layer;
}

function mount(html, ms) {
  const root = document.createElement("div");
  root.className = "meme-root";
  root.innerHTML = html;
  ensureLayer().appendChild(root);
  setTimeout(() => root.remove(), ms + 250);
  return root;
}

const rand = (a, b) => a + Math.random() * (b - a);

// Tiny synth helpers on top of the AudioContext script.js already unlocks.
function makeSfx(getCtx) {
  const at = (delayMs, fn) =>
    setTimeout(async () => {
      try {
        const ctx = getCtx();
        if (!ctx) return;
        if (ctx.state !== "running") await ctx.resume();
        if (ctx.state === "running") fn(ctx);
      } catch (err) {
        console.warn("Meme sound failed:", err);
      }
    }, delayMs);

  const noiseBuffer = (ctx, dur) => {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };

  return {
    noise(delayMs, dur, { filter = "bandpass", from = 3200, to = 4800, q = 0.6, peak = 0.4, attack = 0.3, release = 0.4 } = {}) {
      at(delayMs, (ctx) => {
        const now = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx, dur);
        const f = ctx.createBiquadFilter();
        f.type = filter;
        f.Q.value = q;
        f.frequency.setValueAtTime(from, now);
        f.frequency.linearRampToValueAtTime(to, now + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(peak, now + attack);
        g.gain.setValueAtTime(peak, now + Math.max(attack, dur - release));
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        src.connect(f).connect(g).connect(ctx.destination);
        src.start(now);
        src.stop(now + dur);
      });
    },
    blip(delayMs, f0, f1, dur, peak = 0.18, type = "square") {
      at(delayMs, (ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(g).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      });
    },
  };
}

// Pixel-art helper: draws "#" cells of a string grid as SVG rects.
const px = (rows, x0, y0, cell, fill) =>
  rows
    .flatMap((row, y) => [...row].map((c, x) => (c === "#" ? `<rect x="${x0 + x * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}" fill="${fill}"/>` : "")))
    .join("");

export function createMemeAnimations({ getAudioCtx }) {
  const sfx = makeSfx(getAudioCtx);

  // ---------------- Nyan Cat ----------------
  const NYAN_MS = 4200;
  function playNyan() {
    const stars = Array.from({ length: 18 }, () => `<i class="meme-star" style="left:${rand(0, 100)}%;top:${rand(0, 100)}%;animation-delay:${rand(0, 0.9).toFixed(2)}s"></i>`).join("");
    mount(
      `<div class="meme-sky"></div><div class="meme-stars">${stars}</div>
       <div class="meme-nyan"><div class="meme-nyan-trail"></div>
       <svg class="meme-nyan-cat" viewBox="0 0 130 90">
         <rect x="2" y="42" width="22" height="10" rx="3" fill="#9a9a9a" stroke="#222" stroke-width="3"/>
         <g fill="#9a9a9a" stroke="#222" stroke-width="3"><rect x="26" y="64" width="10" height="16" rx="3"/><rect x="48" y="64" width="10" height="16" rx="3"/><rect x="70" y="64" width="10" height="16" rx="3"/><rect x="92" y="62" width="10" height="16" rx="3"/></g>
         <rect x="16" y="14" width="68" height="54" rx="7" fill="#f6d9a8" stroke="#222" stroke-width="3"/>
         <rect x="23" y="21" width="54" height="40" rx="5" fill="#ff8cc6"/>
         <g fill="#e9327d"><rect x="30" y="28" width="5" height="3"/><rect x="48" y="25" width="5" height="3"/><rect x="62" y="34" width="5" height="3"/><rect x="36" y="44" width="5" height="3"/><rect x="56" y="50" width="5" height="3"/><rect x="68" y="26" width="5" height="3"/><rect x="28" y="54" width="5" height="3"/></g>
         <path d="M82 34 L86 12 L100 28 Z" fill="#9a9a9a" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
         <path d="M108 28 L120 12 L124 36 Z" fill="#9a9a9a" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
         <ellipse cx="102" cy="46" rx="25" ry="21" fill="#9a9a9a" stroke="#222" stroke-width="3"/>
         <circle cx="94" cy="44" r="3.6" fill="#111"/><circle cx="112" cy="44" r="3.6" fill="#111"/>
         <circle cx="95" cy="43" r="1.1" fill="#fff"/><circle cx="113" cy="43" r="1.1" fill="#fff"/>
         <circle cx="86" cy="54" r="5" fill="#ff9bb0"/><circle cx="118" cy="54" r="5" fill="#ff9bb0"/>
         <path d="M96 56 Q103 63 110 56" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
       </svg></div>`,
      NYAN_MS
    );
    // a cheerful little arpeggio as it zooms by
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => sfx.blip(300 + i * 230, [523, 659, 784, 1047][i % 4], [523, 659, 784, 1047][i % 4], 0.16, 0.08, "square"));
    return NYAN_MS;
  }

  // ---------------- Among Us ----------------
  const AMOGUS_MS = 4200;
  function playAmongUs() {
    mount(
      `<div class="meme-amogus"><span class="meme-bubble">sus?</span>
       <svg viewBox="0 0 100 120">
         <rect x="4" y="42" width="20" height="44" rx="9" fill="#8f0e0e" stroke="#111" stroke-width="3"/>
         <rect class="meme-leg-l" x="22" y="82" width="26" height="30" rx="8" fill="#c51111" stroke="#111" stroke-width="3"/>
         <rect class="meme-leg-r" x="52" y="82" width="26" height="30" rx="8" fill="#c51111" stroke="#111" stroke-width="3"/>
         <path d="M22 40 C22 16 36 6 52 6 C70 6 80 18 80 40 V90 H22 Z" fill="#c51111" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
         <path d="M66 12 C76 18 80 28 80 40 V90 H62 Z" fill="#7a0a0a" opacity="0.35"/>
         <rect x="42" y="22" width="44" height="28" rx="14" fill="#9fd8e8" stroke="#111" stroke-width="3"/>
         <ellipse cx="62" cy="30" rx="10" ry="4.5" fill="#fff" opacity="0.7"/>
       </svg></div>`,
      AMOGUS_MS
    );
    sfx.blip(1450, 220, 180, 0.12, 0.12, "triangle");
    sfx.blip(1650, 220, 180, 0.12, 0.12, "triangle");
    return AMOGUS_MS;
  }

  // ---------------- Chrome T-Rex ----------------
  const DINO_MS = 4000;
  function playDino() {
    const root = mount(
      `<div class="meme-dino-stage">
         <div class="meme-dino-score"><span class="hi">HI 00420</span><span class="now">00000</span></div>
         <div class="meme-dino-ground"></div>
         <div class="meme-cactus"><svg viewBox="0 0 30 44" fill="#535353" shape-rendering="crispEdges">
           <rect x="11" y="0" width="9" height="44"/><rect x="2" y="16" width="9" height="6"/><rect x="2" y="8" width="6" height="14"/>
           <rect x="20" y="12" width="8" height="6"/><rect x="22" y="4" width="6" height="14"/></svg></div>
         <div class="meme-dino"><svg viewBox="0 0 60 64" fill="#535353" shape-rendering="crispEdges">
           <rect x="0" y="26" width="10" height="8"/><rect x="6" y="32" width="10" height="8"/>
           <rect x="10" y="28" width="30" height="22"/><rect x="32" y="16" width="12" height="16"/>
           <rect x="30" y="2" width="28" height="18"/><rect x="38" y="18" width="20" height="6"/>
           <rect x="46" y="6" width="5" height="5" fill="#f7f7f7"/><rect x="44" y="16" width="14" height="2" fill="#f7f7f7"/>
           <rect x="40" y="36" width="10" height="4"/><rect x="46" y="36" width="4" height="8"/>
           <rect class="meme-dino-l" x="16" y="50" width="8" height="14"/><rect class="meme-dino-r" x="30" y="50" width="8" height="14"/></svg></div>
       </div>`,
      DINO_MS
    );
    const now = root.querySelector(".now");
    let score = 0;
    const timer = setInterval(() => {
      score += 1 + Math.floor(Math.random() * 2);
      now.textContent = String(score).padStart(5, "0");
    }, 55);
    setTimeout(() => clearInterval(timer), DINO_MS);
    sfx.blip(2250, 420, 900, 0.14, 0.12, "square"); // the jump
    return DINO_MS;
  }

  // ---------------- Creeper ----------------
  const CREEPER_MS = 4400;
  function playCreeper() {
    const face = px(
      ["........", "........", ".##..##.", ".##..##.", "...##...", "..####..", "..####..", "..#..#.."],
      0, 0, 10, "#111"
    );
    const patches = [[10, 10, "#479a3a"], [50, 20, "#7bd169"], [30, 60, "#479a3a"], [60, 50, "#7bd169"], [0, 40, "#7bd169"], [20, 100, "#479a3a"], [50, 130, "#7bd169"], [10, 160, "#479a3a"], [60, 180, "#479a3a"], [30, 150, "#7bd169"]]
      .map(([x, y, c]) => `<rect x="${x}" y="${y}" width="10" height="10" fill="${c}" opacity="0.7"/>`)
      .join("");
    const colors = ["#ff8a00", "#ffd000", "#8a8a8a", "#5eb64f", "#ff4d00"];
    const debris = Array.from({ length: 18 }, () => {
      const a = rand(0, Math.PI * 2);
      const r = rand(90, 300);
      const s = rand(8, 20).toFixed(0);
      return `<i class="meme-debris" style="width:${s}px;height:${s}px;background:${colors[Math.floor(rand(0, colors.length))]};--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r).toFixed(0)}px"></i>`;
    }).join("");
    mount(
      `<div class="meme-flash"></div>
       <div class="meme-creeper"><span class="meme-creeper-text">ssssss…</span>
         <div class="meme-creeper-shake"><svg class="meme-creeper-body" viewBox="0 0 80 260">
           <rect x="0" y="0" width="80" height="200" fill="#5eb64f"/>${patches}
           <rect x="0" y="200" width="36" height="60" fill="#4fa142"/><rect x="44" y="200" width="36" height="60" fill="#4fa142"/>${face}
         </svg></div></div>
       ${debris}<span class="meme-boom-text">BUM!</span>`,
      CREEPER_MS
    );
    sfx.noise(1760, 1.4, { filter: "highpass", from: 2600, to: 6000, q: 0.5, peak: 0.35, attack: 0.5, release: 0.15 });
    sfx.noise(3170, 0.9, { filter: "lowpass", from: 900, to: 90, q: 0.7, peak: 0.9, attack: 0.01, release: 0.8 });
    sfx.blip(3170, 120, 28, 0.6, 0.6, "sine");
    return CREEPER_MS;
  }

  // ---------------- Surprised Pikachu ----------------
  const PIKA_MS = 3600;
  function playPikachu() {
    mount(
      `<div class="meme-pika">
         <svg viewBox="0 0 200 200">
           <ellipse cx="46" cy="42" rx="14" ry="38" transform="rotate(-25 46 42)" fill="#f8d84a"/>
           <ellipse cx="36" cy="14" rx="9" ry="15" transform="rotate(-25 36 14)" fill="#222"/>
           <ellipse cx="154" cy="42" rx="14" ry="38" transform="rotate(25 154 42)" fill="#f8d84a"/>
           <ellipse cx="164" cy="14" rx="9" ry="15" transform="rotate(25 164 14)" fill="#222"/>
           <ellipse cx="100" cy="112" rx="74" ry="64" fill="#f8d84a"/>
           <circle cx="46" cy="128" r="17" fill="#e94b3c"/><circle cx="154" cy="128" r="17" fill="#e94b3c"/>
           <ellipse cx="72" cy="98" rx="11" ry="15" fill="#1b1b1b"/><ellipse cx="128" cy="98" rx="11" ry="15" fill="#1b1b1b"/>
           <circle cx="75" cy="92" r="5" fill="#fff"/><circle cx="69" cy="103" r="2" fill="#fff"/>
           <circle cx="131" cy="92" r="5" fill="#fff"/><circle cx="125" cy="103" r="2" fill="#fff"/>
           <ellipse cx="100" cy="114" rx="3" ry="2.4" fill="#1b1b1b"/>
           <ellipse cx="100" cy="137" rx="9" ry="12" fill="#7a2a1a"/><ellipse cx="100" cy="144" rx="6" ry="5" fill="#e86a6a"/>
         </svg>
         <span class="meme-pika-text">Kartkówka?!</span>
       </div>`,
      PIKA_MS
    );
    sfx.blip(180, 700, 1400, 0.18, 0.12, "triangle"); // a little gasp
    return PIKA_MS;
  }

  // ---------------- Doge ----------------
  const DOGE_MS = 4200;
  function playDoge() {
    const words = [
      ["wow", "8%", "20%", "#ff4fd8", -8, 0.5],
      ["such szkoła", "52%", "10%", "#00e5ff", 5, 0.9],
      ["much learn", "4%", "66%", "#ffe600", -4, 1.2],
      ["very kartkówka", "50%", "78%", "#7cff3a", 6, 1.5],
      ["so zeszyt", "66%", "36%", "#ff9a00", -6, 1.8],
      ["amaze", "22%", "84%", "#b57bff", 4, 2.1],
    ]
      .map(([t, l, tp, c, r, d]) => `<span class="meme-word" style="left:${l};top:${tp};--c:${c};--r:${r}deg;--d:${d}s">${t}</span>`)
      .join("");
    mount(
      `<div class="meme-doge">
         <svg viewBox="0 0 200 200">
           <path d="M34 70 L44 8 L92 44 Z" fill="#d89a4a"/><path d="M166 70 L156 8 L108 44 Z" fill="#d89a4a"/>
           <path d="M46 58 L50 24 L74 42 Z" fill="#f1c488"/><path d="M154 58 L150 24 L126 42 Z" fill="#f1c488"/>
           <ellipse cx="100" cy="108" rx="72" ry="62" fill="#e0a85a"/>
           <ellipse cx="100" cy="134" rx="50" ry="38" fill="#fbeed6"/>
           <circle cx="70" cy="80" r="6" fill="#fbeed6"/><circle cx="130" cy="80" r="6" fill="#fbeed6"/>
           <path d="M62 98 Q72 90 82 98" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>
           <path d="M118 98 Q128 90 138 98" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>
           <ellipse cx="100" cy="120" rx="10" ry="7" fill="#222"/>
           <path d="M100 127 V136 Q90 148 80 141 M100 136 Q110 148 120 141" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>
         </svg>
       </div>${words}`,
      DOGE_MS
    );
    sfx.blip(500, 190, 120, 0.14, 0.15, "square"); // "bork"
    sfx.blip(760, 190, 120, 0.14, 0.15, "square");
    return DOGE_MS;
  }

  const icon = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  return [
    {
      id: "nyan", name: "Nyan", title: "Nyan Cat", play: playNyan,
      icon: icon(`<rect x="2" y="12" width="12" height="3" fill="#ff1d1d"/><rect x="2" y="15" width="12" height="3" fill="#ff9a00"/><rect x="2" y="18" width="12" height="3" fill="#ffee00"/><rect x="2" y="21" width="12" height="3" fill="#2bff3a"/><rect x="2" y="24" width="12" height="3" fill="#2f9bff"/><rect x="2" y="27" width="12" height="3" fill="#7b3bff"/><rect x="12" y="10" width="22" height="22" rx="3" fill="#f6d9a8" stroke="#222" stroke-width="1.6"/><rect x="15" y="13" width="16" height="16" rx="2" fill="#ff8cc6"/><ellipse cx="38" cy="26" rx="8" ry="7" fill="#9a9a9a" stroke="#222" stroke-width="1.6"/><path d="M32 22 L34 14 L38 19 Z M40 19 L44 14 L45 23 Z" fill="#9a9a9a" stroke="#222" stroke-width="1.4"/><circle cx="35" cy="25" r="1.4" fill="#111"/><circle cx="41" cy="25" r="1.4" fill="#111"/>`),
    },
    {
      id: "amongus", name: "Among Us", title: "Among Us", play: playAmongUs,
      icon: icon(`<rect x="8" y="18" width="7" height="16" rx="3" fill="#8f0e0e" stroke="#111" stroke-width="1.6"/><rect x="14" y="34" width="9" height="10" rx="3" fill="#c51111" stroke="#111" stroke-width="1.6"/><rect x="26" y="34" width="9" height="10" rx="3" fill="#c51111" stroke="#111" stroke-width="1.6"/><path d="M14 18 C14 8 20 4 25 4 C32 4 36 9 36 18 V36 H14 Z" fill="#c51111" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/><rect x="22" y="11" width="19" height="12" rx="6" fill="#9fd8e8" stroke="#111" stroke-width="1.6"/>`),
    },
    {
      id: "dino", name: "Dino", title: "Dinozaur z Chrome", play: playDino,
      icon: icon(`<g fill="#535353" shape-rendering="crispEdges"><rect x="3" y="20" width="7" height="6"/><rect x="7" y="25" width="7" height="6"/><rect x="10" y="22" width="20" height="14"/><rect x="24" y="14" width="8" height="12"/><rect x="22" y="4" width="20" height="13"/><rect x="28" y="15" width="14" height="4"/><rect x="14" y="36" width="5" height="9"/><rect x="24" y="36" width="5" height="9"/></g><rect x="33" y="7" width="4" height="4" fill="#f7f7f7"/>`),
    },
    {
      id: "creeper", name: "Creeper", title: "Creeper", play: playCreeper,
      icon: icon(`<rect x="6" y="6" width="36" height="36" fill="#5eb64f"/><g fill="#479a3a" opacity="0.8"><rect x="10" y="10" width="5" height="5"/><rect x="30" y="18" width="5" height="5"/><rect x="14" y="34" width="5" height="5"/></g><g fill="#111"><rect x="12" y="15" width="8" height="8"/><rect x="28" y="15" width="8" height="8"/><rect x="20" y="23" width="8" height="5"/><rect x="16" y="28" width="16" height="9"/></g><g fill="#5eb64f"><rect x="16" y="33" width="5" height="4"/><rect x="27" y="33" width="5" height="4"/></g>`),
    },
    {
      id: "pikachu", name: "Pikachu", title: "Zaskoczony Pikachu", play: playPikachu,
      icon: icon(`<ellipse cx="12" cy="11" rx="4" ry="10" transform="rotate(-25 12 11)" fill="#f8d84a"/><ellipse cx="9" cy="4" rx="2.6" ry="4" transform="rotate(-25 9 4)" fill="#222"/><ellipse cx="36" cy="11" rx="4" ry="10" transform="rotate(25 36 11)" fill="#f8d84a"/><ellipse cx="39" cy="4" rx="2.6" ry="4" transform="rotate(25 39 4)" fill="#222"/><ellipse cx="24" cy="28" rx="18" ry="16" fill="#f8d84a"/><circle cx="10" cy="32" r="4.5" fill="#e94b3c"/><circle cx="38" cy="32" r="4.5" fill="#e94b3c"/><ellipse cx="18" cy="25" rx="2.8" ry="3.8" fill="#1b1b1b"/><ellipse cx="30" cy="25" rx="2.8" ry="3.8" fill="#1b1b1b"/><ellipse cx="24" cy="34" rx="2.4" ry="3.2" fill="#7a2a1a"/>`),
    },
    {
      id: "doge", name: "Doge", title: "Doge", play: playDoge,
      icon: icon(`<path d="M9 18 L11 4 L23 11 Z" fill="#d89a4a"/><path d="M39 18 L37 4 L25 11 Z" fill="#d89a4a"/><ellipse cx="24" cy="28" rx="18" ry="16" fill="#e0a85a"/><ellipse cx="24" cy="34" rx="12" ry="9" fill="#fbeed6"/><path d="M15 25 Q18 22 21 25 M27 25 Q30 22 33 25" stroke="#222" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="31" rx="2.6" ry="1.8" fill="#222"/><path d="M24 33 V36 Q21 39 19 37 M24 36 Q27 39 29 37" stroke="#222" stroke-width="1.2" fill="none" stroke-linecap="round"/>`),
    },
  ];
}
