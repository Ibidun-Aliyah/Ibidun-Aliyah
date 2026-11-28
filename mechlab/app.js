// MechLab: a cute-but-serious AI study lab. Everything runs in the browser.
// Data lives in IndexedDB; settings and API keys live in localStorage on this device only.
import { marked } from './vendor/marked.mjs';
import DOMPurify from './vendor/purify.mjs';
import katex from './vendor/katex.mjs';
import { SYSTEM_PROMPT, MODE_PROMPTS, MODE_LABELS, QUICK_PROMPTS, QUIZ_PROMPT, GCODE_HELP_PROMPT } from './prompts.js';

/* ================= utils ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const DAY_MS = 86400000;

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
// In-page dialog: works everywhere, including sandboxed previews that ignore confirm()/prompt().
function ask(message, { input = null, okText = 'OK', cancelText = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-box card" role="dialog" aria-modal="true"><p></p>${input !== null ? '<textarea rows="3"></textarea>' : ''}<div class="row wrap" style="justify-content:flex-end">${cancelText ? `<button class="btn" data-no type="button">${cancelText}</button>` : ''}<button class="btn primary" data-yes type="button">${okText}</button></div></div>`;
    wrap.querySelector('p').textContent = message;
    const ta = wrap.querySelector('textarea');
    if (ta) ta.value = input;
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelector('[data-yes]').onclick = () => done(ta ? ta.value : true);
    wrap.querySelector('[data-no]')?.addEventListener('click', () => done(ta ? null : false));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done(ta ? null : false); });
    document.body.appendChild(wrap);
    (ta || wrap.querySelector('[data-yes]')).focus();
  });
}
const downloadsP = window.claude?.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
async function saveFile(filename, blob) {
  const dl = await downloadsP;
  if (dl) {
    try { await dl.save({ filename, data: blob }); } catch (e) { if (e?.code !== 'declined') toast('Could not save the file here: ' + (e?.message || e?.code)); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
const ls = {
  get(k, d) { try { const v = localStorage.getItem('mechlab.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mechlab.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// Night owl logic: until 5 AM it still counts as "tonight" (the previous day).
function studyDay(now = new Date()) { const d = new Date(now); if (d.getHours() < 5) d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); return d; }

/* ================= theme ================= */
const HOST_THEME = document.documentElement.getAttribute('data-theme');
function applyTheme() {
  const t = ls.get('theme', 'auto'), el = document.documentElement;
  if (t !== 'auto') el.setAttribute('data-theme', t);
  else if (HOST_THEME) el.setAttribute('data-theme', HOST_THEME);
  else el.removeAttribute('data-theme');
}
applyTheme();

/* ================= mascot: Gigi the gear ================= */
function mascot(mood = 'happy') {
  const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="54" y="6" width="12" height="18" rx="4" transform="rotate(${i * 45} 60 60)"/>`).join('');
  const eyes = mood === 'sleepy'
    ? '<path d="M44 58 q5 4 10 0 M66 58 q5 4 10 0" stroke="#3b2140" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : mood === 'wow'
      ? '<circle cx="49" cy="57" r="6" fill="#3b2140"/><circle cx="71" cy="57" r="6" fill="#3b2140"/><circle cx="51" cy="55" r="2" fill="#fff"/><circle cx="73" cy="55" r="2" fill="#fff"/>'
      : '<ellipse cx="49" cy="57" rx="4.5" ry="5.5" fill="#3b2140"/><ellipse cx="71" cy="57" rx="4.5" ry="5.5" fill="#3b2140"/><circle cx="50.5" cy="55" r="1.6" fill="#fff"/><circle cx="72.5" cy="55" r="1.6" fill="#fff"/>';
  const mouth = mood === 'wow' ? '<ellipse cx="60" cy="71" rx="5" ry="6" fill="#3b2140"/>' : mood === 'sleepy' ? '<path d="M55 70 q5 3 10 0" stroke="#3b2140" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<path d="M52 67 q8 9 16 0" stroke="#3b2140" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <g fill="#ff8fc0">${teeth}</g>
    <circle cx="60" cy="60" r="40" fill="#ffa6cf"/>
    <circle cx="60" cy="60" r="34" fill="#ffc2df"/>
    ${eyes}${mouth}
    <ellipse cx="40" cy="68" rx="6" ry="3.5" fill="#ff7fb3" opacity=".7"/><ellipse cx="80" cy="68" rx="6" ry="3.5" fill="#ff7fb3" opacity=".7"/>
    <g transform="translate(72 14) rotate(20)"><path d="M0 8 L-14 0 L-14 16 Z M0 8 L14 0 L14 16 Z" fill="#a78bfa"/><circle cx="0" cy="8" r="4.5" fill="#8b5cf6"/></g>
    ${mood === 'sleepy' ? '<text x="88" y="40" font-size="14" font-weight="700" fill="#8b5cf6">z</text><text x="98" y="28" font-size="10" font-weight="700" fill="#8b5cf6">z</text>' : ''}
  </svg>`;
}
const QUOTES = [
  'Engineers aren\'t born, they\'re compiled ✨', 'One concept at a time, bestie 💗', 'Tiny gears turn big machines. 10 minutes counts!',
  'Confused is just "about to understand" in disguise 🧠', 'Feedback loop: try, check, adjust. That\'s literally control engineering 🎛',
  'You + G-code = unstoppable ⚙️', 'Pretty AND precise. That\'s the brand 💅', 'Every expert was once a beginner with a cute notebook 📓',
  'Your future self is already proud of you 🌸', 'Mistakes are just data. Collect them, learn from them 📊',
];

/* ================= confetti ================= */
function confetti(n = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.id = 'confetti'; document.body.appendChild(c);
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const cols = ['#ff7eb6', '#b9a2ff', '#ffd36e', '#7ee0c3', '#ffb3d1', '#8b5cf6'];
  const shapes = ['♥', '★', '✦', '●'];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, s: 12 + Math.random() * 12, c: pick(cols), t: pick(shapes) }));
  let f = 0;
  (function frame() {
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.font = `${p.s}px sans-serif`; g.fillText(p.t, -p.s / 3, p.s / 3); g.restore();
    }
    if (++f < 110) requestAnimationFrame(frame); else c.remove();
  })();
}

/* ================= sparkles (XP), levels, badges ================= */
const LEVELS = [[0, 'Curious Cadet 🐣'], [100, 'Circuit Cutie ⚡'], [300, 'Gear Girl ⚙️'], [700, 'Sensor Sweetheart 💗'], [1200, 'Automation Princess 👑'], [2000, 'Control Queen 🎛'], [3500, 'Mechatronics Mastermind 🌟']];
const BADGES = {
  'first-lesson': ['🌱', 'First lesson', 'Finish your first lesson'],
  'first-quiz': ['🎀', 'Quiz debut', 'Complete a 5-question quiz'],
  perfect: ['💯', 'Perfect score', 'Get 5/5 on a quiz'],
  checkin: ['📅', 'Planner girlie', 'Do 5 check-ins'],
  streak3: ['🔥', 'On fire', '3-day study streak'],
  streak7: ['🌈', 'Unstoppable', '7-day study streak'],
  'night-owl': ['🦉', 'Night owl', 'Finish a whole night plan'],
  visual: ['🎛', 'Seeing is believing', 'Generate an interactive visual'],
  'gcode-first': ['⚙️', 'Machine whisperer', 'Run a G-code program'],
  'gcode-challenge': ['🏅', 'CNC challenger', 'Complete a CNC challenge'],
  'gcode-queen': ['👑', 'G-code Queen', 'Complete every CNC challenge'],
  vision: ['👁️', 'Computer whisperer', 'Train an image classifier'],
  cards50: ['💌', 'Memory queen', 'Review 50 flashcards'],
};
function levelOf(xp) { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; return i; }
function award(n, why) {
  const before = ls.get('xp', 0), after = before + n;
  ls.set('xp', after);
  if (levelOf(after) > levelOf(before)) { confetti(140); toast(`🎉 Level up! You're now a ${LEVELS[levelOf(after)][1]}`, 4500); }
  else toast(`+${n} ✨ ${why}`);
  renderXP();
}
function badge(id) {
  const got = new Set(ls.get('badges', []));
  if (got.has(id) || !BADGES[id]) return;
  got.add(id); ls.set('badges', [...got]);
  confetti(100);
  setTimeout(() => toast(`🏅 New badge: ${BADGES[id][0]} ${BADGES[id][1]}!`, 4000), 600);
  if ($('#tab-home').classList.contains('active')) renderHome();
}
function renderXP() {
  const xp = ls.get('xp', 0), i = levelOf(xp);
  const [lo, name] = LEVELS[i], hi = LEVELS[i + 1]?.[0];
  $('#lvlPill').textContent = `✨ ${xp} · ${name}`;
  if ($('#lvlName')) {
    $('#lvlName').textContent = name;
    $('#xpText').textContent = hi ? `${xp - lo} / ${hi - lo} ✨ to next level` : `${xp} ✨ max level!`;
    $('#xpFill').style.width = hi ? `${Math.round((xp - lo) / (hi - lo) * 100)}%` : '100%';
    $('#xpCount').textContent = xp;
  }
}

/* ================= IndexedDB ================= */
const STORES = ['files', 'sessions', 'glossary', 'cards', 'quizzes'];
let dbp;
function db() {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('mechlab', 2);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
const DB = {
  all: (s) => tx(s, 'readonly', (os) => os.getAll()),
  get: (s, id) => tx(s, 'readonly', (os) => os.get(id)),
  put: (s, v) => tx(s, 'readwrite', (os) => os.put(v)),
  del: (s, id) => tx(s, 'readwrite', (os) => os.delete(id)),
};

/* ================= courses, check-ins & predictions ================= */
const DEFAULT_COURSES = [
  { id: 'control', name: 'Control Engineering', days: ['Mon'] },
  { id: 'mcu', name: 'Microcontrollers & Embedded Systems', days: ['Tue'] },
  { id: 'indaut', name: 'Industrial Automation', days: ['Tue', 'Thu'] },
  { id: 'sensors', name: 'Sensors & Actuators', days: ['Tue', 'Thu'] },
  { id: 'cv', name: 'Computer Vision', days: ['Tue'] },
  { id: 'mpd', name: 'Machine Power & Drives', days: ['Thu'] },
  { id: 'eco', name: 'Eco-Mechatronics', days: ['Thu'] },
  { id: 'evc', name: 'Engineering Valuation & Costing', days: ['Thu'] },
  { id: 'lab', name: 'Practicals', days: ['Fri'] },
];
const S = {
  get courses() { return ls.get('courses', DEFAULT_COURSES); },
  set courses(v) { ls.set('courses', v); },
  course(id) { return this.courses.find((c) => c.id === id); },
};
const checkins = () => ls.get('checkins', {}); // { 'YYYY-MM-DD': { courses: [ids], at: ms } }

// Probability each course holds on a date: timetable is the prior, past check-ins on the same weekday update it.
function predict(date) {
  const w = date.getDay(), key = ymd(date), ci = checkins();
  const past = Object.entries(ci).filter(([d]) => d < key && new Date(d + 'T12:00').getDay() === w).map(([, v]) => v);
  return S.courses.map((c) => {
    const prior = c.days.includes(DAYS[w]) ? 0.8 : 0.08;
    const hits = past.filter((v) => v.courses.includes(c.id)).length;
    return { course: c, p: (hits + prior * 2) / (past.length + 2), seen: past.length };
  });
}
function classesOn(date) {
  const c = checkins()[ymd(date)];
  if (c) return { list: c.courses.map((id) => S.course(id)).filter(Boolean), confirmed: true };
  return { list: predict(date).filter((x) => x.p >= 0.5).map((x) => x.course), confirmed: false };
}
function confirmDay(date, ids) {
  const ci = checkins();
  const fresh = !ci[ymd(date)];
  ci[ymd(date)] = { courses: ids, at: Date.now() };
  ls.set('checkins', ci);
  if (fresh) award(3, 'checked in');
  if (Object.keys(ci).length >= 5) badge('checkin');
}

/* ================= file helpers ================= */
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
async function compressImage(file, maxDim = 2000) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.85));
  } catch { return file; } // e.g. HEIC the browser can't decode: keep original
}
const fileKind = (f) => (f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'text');
async function filesToParts(files) {
  const parts = [];
  let bytes = 0;
  for (const f of files) {
    const k = fileKind(f);
    if (k === 'text') { const text = await f.blob.text(); bytes += text.length; parts.push({ kind: 'text', name: f.name, text }); }
    else { const data = await blobToBase64(f.blob); bytes += data.length; parts.push({ kind: k, mime: f.type, name: f.name, data }); }
  }
  return { parts, bytes };
}
async function tickedFiles(cid) {
  const ids = new Set(ls.get('ticked.' + cid, []));
  return (await DB.all('files')).filter((f) => ids.has(f.id));
}

/* ================= AI providers ================= */
// "here" = Claude built into the page (claude.ai artifact preview): no key needed, uses the viewer's Claude account.
const samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
const providerNow = () => ls.get('provider', window.claude?.use ? 'here' : 'gemini');
let pdfjsP;
const pdfText = new Map();
async function readPdf(f, maxImages) {
  if (pdfText.has(f.id)) return pdfText.get(f.id);
  pdfjsP ??= import('./vendor/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href; return m; });
  const pdfjs = await pdfjsP;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    text += `\n[page ${i}] ` + tc.items.map((it) => it.str).join(' ');
  }
  const images = [];
  if (text.replace(/\[page \d+\]|\s/g, '').length < 20 * doc.numPages && maxImages) {
    // Scanned/handwritten PDF: send page pictures instead of (missing) text.
    for (let i = 1; i <= Math.min(doc.numPages, maxImages); i++) {
      const page = await doc.getPage(i), vp = page.getViewport({ scale: 1.6 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      images.push(await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85)));
    }
  }
  const out = { text, images, pages: doc.numPages };
  pdfText.set(f.id, out);
  return out;
}
const SAMPLE_ERRORS = {
  not_granted: 'You didn\'t allow this page to use Claude. Reload and press Allow, or add a Gemini key in Settings.',
  sampling_disabled: 'Claude isn\'t available for this account here.',
  rate_limited: 'Claude usage limit reached for now. Try again a bit later 🌙',
  prompt_too_large: 'Too much material at once. Untick some files and try again.',
  refused: 'Claude declined that one. Try rephrasing.',
  session_expired: 'Please sign in to Claude again.',
};
async function hereStream({ system, history, files, onText }) {
  const sample = await samplePromise;
  if (!sample) throw new Error('Built-in Claude isn\'t available in this view. Add a Gemini key in Settings.');
  const limits = await sample.limits().catch(() => ({}));
  const maxImg = limits.images?.maxCount || 0;
  let materials = '', images = [], skipped = 0;
  for (const f of files) {
    const k = fileKind(f);
    if (k === 'text') materials += `\n--- Material: ${f.name} ---\n${await f.blob.text()}\n`;
    else if (k === 'image') { if (images.length < maxImg) { images.push(f.blob); materials += `\n--- Material: ${f.name} (attached as image ${images.length}) ---\n`; } else skipped++; }
    else {
      const r = await readPdf(f, Math.max(0, maxImg - images.length));
      if (r.images.length) { materials += `\n--- Material: ${f.name} (scanned PDF, ${r.images.length} page images attached) ---\n${r.text}\n`; images.push(...r.images); if (r.images.length < r.pages) skipped++; }
      else materials += `\n--- Material: ${f.name} (text extracted from PDF) ---\n${r.text}\n`;
    }
  }
  const budget = 200000 - system.length - history.reduce((n, m) => n + m.text.length, 0);
  if (materials.length > budget) { materials = materials.slice(0, Math.max(0, budget)) + '\n[...materials cut to fit]'; }
  if (skipped) materials += `\n(Note: ${skipped} material(s) were too many pictures to attach this time.)`;
  const head = `${system}\n\n=== COURSE MATERIALS ===${materials || '\n(none)'}\n=== END OF MATERIALS ===\n\n`;
  const msgs = history.map((m, i) => ({ role: m.role, content: i === 0 ? head + m.text : m.text }));
  try {
    const r = await sample(msgs, { cache: false, onText: ({ text }) => onText(text), ...(images.length ? { images } : {}) });
    return r.truncated ? r.text + '\n\n_(Answer was cut off for length. Say "continue".)_' : r.text;
  } catch (e) {
    throw new Error(SAMPLE_ERRORS[e?.code] || e?.message || 'Claude had a hiccup. Try again.');
  }
}
const AI = {
  async stream({ system, history, files, onText }) {
    const p = providerNow();
    if (p === 'here') return hereStream({ system, history, files, onText });
    const { parts, bytes } = await filesToParts(files);
    const limit = p === 'gemini' ? 18e6 : 30e6;
    if (bytes > limit) throw new Error(`The ticked materials are too big to send at once (${(bytes / 1e6).toFixed(1)} MB). Untick some files and try again.`);
    return p === 'claude' ? claudeStream({ system, history, parts, onText }) : geminiStream({ system, history, parts, onText });
  },
};
async function geminiStream({ system, history, parts, onText }) {
  const key = ls.get('geminiKey', '');
  if (!key) throw new Error('No Gemini API key yet. Add it in Settings ⚙️');
  const model = ls.get('geminiModel', '') || 'gemini-2.5-flash';
  const fileParts = parts.flatMap((p) => (p.kind === 'text'
    ? [{ text: `--- Material: ${p.name} ---\n${p.text}` }]
    : [{ text: `--- Material: ${p.name} ---` }, { inline_data: { mime_type: p.mime, data: p.data } }]));
  const contents = history.map((m, i) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: i === 0 ? [...fileParts, { text: m.text }] : [{ text: m.text }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 32768 } }),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { msg = (await res.json()).error?.message || msg; } catch { /* not JSON */ }
    if (res.status === 429) msg = 'Gemini free-tier limit reached for now. Wait a minute (or until tomorrow for the daily limit), or switch model/provider in Settings. Details: ' + msg;
    throw new Error(msg);
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let j; try { j = JSON.parse(line.slice(5)); } catch { continue; }
      if (j.promptFeedback?.blockReason) throw new Error('Gemini blocked this request: ' + j.promptFeedback.blockReason);
      const t = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      if (t) { full += t; onText(full); }
    }
  }
  return full;
}
async function geminiModels(key) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.message || res.status);
  const j = await res.json();
  const bad = /(tts|image|embed|live|audio|robotics|computer-use|aqa|imagen|veo|learnlm|nano)/i;
  return (j.models || []).filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /gemini/i.test(m.name) && !bad.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }));
}
function pickDefaultGemini(models) {
  const score = (id) => (/flash/.test(id) ? 4 : /pro/.test(id) ? 2 : 0) - (/lite/.test(id) ? 2 : 0) - (/(preview|exp)/.test(id) ? 1 : 0) - (/latest/.test(id) ? 0.5 : 0);
  return [...models].sort((a, b) => score(b.id) - score(a.id) || b.id.localeCompare(a.id, undefined, { numeric: true }))[0]?.id;
}
let AnthropicCtor;
async function claudeStream({ system, history, parts, onText }) {
  const key = ls.get('claudeKey', '');
  if (!key) throw new Error('No Claude API key yet. Add it in Settings ⚙️');
  AnthropicCtor ??= (await import('./vendor/anthropic-sdk.mjs')).default;
  const client = new AnthropicCtor({ apiKey: key, dangerouslyAllowBrowser: true });
  const model = ls.get('claudeModel', 'claude-opus-5-5');
  const fileBlocks = parts.map((p) => {
    if (p.kind === 'pdf') return { type: 'document', title: p.name, source: { type: 'base64', media_type: 'application/pdf', data: p.data } };
    if (p.kind === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mime, data: p.data } };
    return { type: 'document', title: p.name, source: { type: 'text', media_type: 'text/plain', data: p.text } };
  });
  // Cache the materials so follow-up questions in a session cost a fraction of the first one.
  if (fileBlocks.length) fileBlocks[fileBlocks.length - 1].cache_control = { type: 'ephemeral' };
  const messages = history.map((m, i) => ({ role: m.role, content: i === 0 ? [...fileBlocks, { type: 'text', text: m.text }] : m.text }));
  const params = { model, max_tokens: 32000, system, messages };
  // Opus/Sonnet: if a safety classifier declines, the API retries on a fallback model instead of stopping.
  const stream = model.includes('haiku')
    ? client.messages.stream(params)
    : client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  let full = '';
  for await (const ev of stream) if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { full += ev.delta.text; onText(full); }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') full += '\n\n_(The model declined to continue this answer. Try rephrasing.)_';
  if (final.stop_reason === 'max_tokens') full += '\n\n_(Answer was cut off for length. Say "continue".)_';
  onText(full);
  return full;
}
function buildSystem(course, files) {
  return SYSTEM_PROMPT({
    name: ls.get('myName', '') || 'the student',
    level: ls.get('myLevel', '') || 'a Mechatronics Engineering undergraduate at LASUSTECH, Nigeria',
    course: course?.name || 'Mechatronics',
    materials: files.map((f) => `- ${f.name} (${f.kind}${f.week ? ', ' + f.week : ''})`).join('\n'),
  });
}

/* ================= rendering ================= */
marked.setOptions({ gfm: true, breaks: false });
const SIM_CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:">`;
function renderMessage(text, streaming = false) {
  const sims = [], memory = [];
  let building = false, src = text;
  if (streaming) {
    const fences = [...src.matchAll(/```(\w*)/g)];
    if (fences.length % 2 === 1) { const last = fences[fences.length - 1]; building = last[1] === 'html'; src = src.slice(0, last.index); }
  }
  src = src.replace(/```json\s*([\s\S]*?)```/g, (m, body) => {
    try { const j = JSON.parse(body); if (j && (j.glossary || j.flashcards)) { memory.push(j); return ''; } } catch { /* not ours */ }
    return m;
  });
  src = src.replace(/```html\s*([\s\S]*?)```/g, (m, body) => { sims.push(body); return `\n\n@@SIM${sims.length - 1}@@\n\n`; });
  const math = [], code = [];
  const keep = (tex, display) => { math.push({ tex, display }); return `@@MATH${math.length - 1}@@`; };
  src = src.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (m) => { code.push(m); return `@@CODE${code.length - 1}@@`; });
  src = src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/(?<![\\$\w])\$(?![\s$])([^$\n]+?)(?<!\s)\$(?![\w$])/g, (_, t) => keep(t, false));
  src = src.replace(/@@CODE(\d+)@@/g, (_, i) => code[+i]);
  let html = DOMPurify.sanitize(marked.parse(src));
  html = html.replace(/@@MATH(\d+)@@/g, (_, i) => katex.renderToString(math[+i].tex, { displayMode: math[+i].display, throwOnError: false, output: 'html' }));
  html = html.replace(/(<p>)?@@SIM(\d+)@@(<\/p>)?/g, (_, a, i) => `<div class="sim" data-sim="${i}"></div>`);
  if (building) html += '<p class="muted">🎨 Building your interactive visual…</p>';
  return { html, sims, memory };
}
const md = (t) => renderMessage(t).html;
function mountSims(el, sims) {
  $$('.sim', el).forEach((box) => {
    const doc = sims[+box.dataset.sim];
    if (doc == null) return;
    const full = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (h) => h + SIM_CSP) : SIM_CSP + doc;
    box.innerHTML = `<div class="sim-bar"><span>🎛 Interactive visual</span><span><button class="btn small" data-act="taller">Taller</button> <button class="btn small" data-act="reload">Restart</button></span></div>`;
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('title', 'Interactive visual');
    f.srcdoc = full;
    box.appendChild(f);
    box.querySelector('[data-act=reload]').onclick = () => { f.srcdoc = full + ' '; };
    box.querySelector('[data-act=taller]').onclick = () => { f.style.height = (f.offsetHeight + 250) + 'px'; };
  });
}

/* ================= memory: glossary + flashcards ================= */
async function addCard(courseId, front, back) {
  await DB.put('cards', { id: uid(), courseId, front, back: back || '', due: Date.now(), interval: 0, ease: 2.5, reps: 0, added: Date.now() });
}
async function saveMemory(memory, courseId) {
  if (!memory.length) return '';
  let g = 0, c = 0;
  const have = new Set((await DB.all('glossary')).map((e) => e.courseId + '|' + e.term.toLowerCase()));
  for (const m of memory) {
    for (const t of m.glossary || []) {
      if (!t?.term || have.has(courseId + '|' + t.term.toLowerCase())) continue;
      have.add(courseId + '|' + t.term.toLowerCase());
      await DB.put('glossary', { id: uid(), courseId, term: t.term, meaning: t.meaning || '', analogy: t.analogy || '', added: Date.now() });
      g++;
    }
    for (const f of m.flashcards || []) { if (f?.front) { await addCard(courseId, f.front, f.back); c++; } }
  }
  refreshCounts();
  return [g && `${g} glossary word${g > 1 ? 's' : ''}`, c && `${c} flashcard${c > 1 ? 's' : ''}`].filter(Boolean).join(' and ');
}

/* ================= streak ================= */
function markStudied() {
  const days = new Set(ls.get('studyDays', []));
  days.add(ymd(studyDay()));
  ls.set('studyDays', [...days].slice(-400));
  const n = streak().n;
  if (n >= 3) badge('streak3');
  if (n >= 7) badge('streak7');
}
function streak() {
  const days = new Set(ls.get('studyDays', []));
  let n = 0;
  const d = studyDay();
  const today = days.has(ymd(d));
  if (!today) d.setDate(d.getDate() - 1);
  while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return { n, today };
}

/* ================= navigation ================= */
let labInstance = null;
function goto(tab) {
  if (!$('#tab-' + tab)) tab = 'home';
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach((s) => s.classList.toggle('active', s.id === 'tab-' + tab));
  if (tab !== 'labs') { labInstance?.destroy?.(); labInstance = null; }
  ls.set('tab', tab);
  window.scrollTo({ top: 0 });
  ({ home: renderHome, library: renderLibrary, learn: renderLearnSide, cards: () => { renderReview(); renderGlossary(); }, quiz: renderQuizTab, settings: renderSettings, labs: renderLabs })[tab]?.();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-goto]');
  if (!t) return;
  e.preventDefault();
  goto(t.dataset.tab || t.dataset.goto);
});
function fillCourseSelect(sel, withAll = false) {
  const v = sel.value;
  sel.innerHTML = (withAll ? '<option value="">All courses</option>' : '') + S.courses.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  if ([...sel.options].some((o) => o.value === v)) sel.value = v;
}
async function refreshCounts() {
  const n = (await DB.all('cards')).filter((c) => c.due <= Date.now()).length;
  if ($('#dueCount')) $('#dueCount').textContent = n;
  return n;
}

/* ================= HOME ================= */
function greeting() {
  const h = new Date().getHours(), name = ls.get('myName', '') || 'bestie';
  if (h < 5) return [`Midnight scholar mode, ${name} 🌙`, 'happy'];
  if (h < 12) return [`Good morning, ${name} 🌅`, 'happy'];
  if (h < 17) return [`Good afternoon, ${name} 🌸`, 'happy'];
  if (h < 21) return [`Good evening, ${name} 🌆`, 'sleepy'];
  return [`Night study time, ${name} 🌙`, 'wow'];
}
function renderHome() {
  const prov = providerNow();
  const hasKey = prov === 'here' || (prov === 'claude' ? ls.get('claudeKey', '') : ls.get('geminiKey', ''));
  $('#setupBanner').classList.toggle('hidden', !!hasKey);
  const [g, mood] = greeting();
  $('#greeting').textContent = g;
  $('#heroMascot').innerHTML = mascot(mood);
  $('#mascotSays').textContent = QUOTES[(new Date().getDate() + new Date().getHours()) % QUOTES.length];
  renderXP();
  renderCheckin();
  renderPlan();
  renderTodayQuizzes();
  const st = streak();
  $('#streak').textContent = st.n;
  $('#badgeCount').textContent = ls.get('badges', []).length;
  refreshCounts();
  // week with predictions
  const start = studyDay();
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  $('#weekGrid').innerHTML = week.map((d, i) => {
    const ci = checkins()[ymd(d)];
    const items = ci
      ? (ci.courses.length ? ci.courses.map((id) => `${esc(S.course(id)?.name || '')} <span class="conf">✓</span>`).join('<br>') : '<span class="muted">No classes ✓</span>')
      : predict(d).filter((x) => x.p >= 0.3).sort((a, b) => b.p - a.p).map((x) => `${esc(x.course.name)} <span class="p">${Math.round(x.p * 100)}%</span>`).join('<br>') || '<span class="muted">-</span>';
    return `<div class="day ${i === 0 ? 'today' : ''}"><b>${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()]}</b>${items}</div>`;
  }).join('');
  const got = new Set(ls.get('badges', []));
  $('#badges').innerHTML = Object.entries(BADGES).map(([id, [e, n, d]]) => `<div class="badge ${got.has(id) ? '' : 'locked'}" title="${esc(d)}"><span>${e}</span>${esc(n)}</div>`).join('');
}

function renderCheckin() {
  const now = new Date(), h = now.getHours();
  const night = h >= 12 || h < 5;          // afternoon/evening/night: ask about tomorrow
  const target = night ? addDays(studyDay(now), 1) : studyDay(now);
  const editing = renderCheckin.editing === ymd(target);
  const ci = checkins()[ymd(target)];
  const when = night ? `tomorrow (${DAY_NAMES[target.getDay()]})` : `today (${DAY_NAMES[target.getDay()]})`;
  const box = $('#checkin');
  if (ci && !editing) {
    const names = ci.courses.map((id) => S.course(id)?.name).filter(Boolean);
    box.innerHTML = `<div class="card checkin checkin-done">✅ <span><b>${night ? 'Tomorrow' : 'Today'}:</b> ${names.length ? esc(names.join(', ')) : 'no classes'}</span> <button class="btn small" id="ciEdit" type="button">Edit</button></div>`;
    $('#ciEdit').onclick = () => { renderCheckin.editing = ymd(target); renderCheckin(); };
    return;
  }
  const pred = predict(target);
  const sel = new Set(ci ? ci.courses : pred.filter((x) => x.p >= 0.5).map((x) => x.course.id));
  const learned = pred[0]?.seen || 0;
  box.innerHTML = `<div class="card checkin">
    <h2>${night ? '🌙 Night check-in' : '🌅 Morning check-in'}</h2>
    <div>Which classes are <b>confirmed</b> for ${when}?</div>
    <div class="chips" id="ciChips">${pred.sort((a, b) => b.p - a.p).map((x) => `<button class="chip ${sel.has(x.course.id) ? 'on' : ''}" data-cid="${esc(x.course.id)}" type="button">${esc(x.course.name)}<em>${Math.round(x.p * 100)}%</em></button>`).join('')}</div>
    <div class="row wrap"><button class="btn primary" id="ciOk" type="button">Confirm ✨</button><button class="btn" id="ciNone" type="button">No classes</button></div>
    <p class="small muted">% = my guess from your timetable${learned ? ` and ${learned} past ${DAY_NAMES[target.getDay()]} check-in${learned > 1 ? 's' : ''}` : ''}. The more you check in, the smarter I get 🧠</p>
  </div>`;
  $('#ciChips').onclick = (e) => { const c = e.target.closest('.chip'); if (c) c.classList.toggle('on'); };
  const done = (ids) => { confirmDay(target, ids); renderCheckin.editing = null; renderHome(); toast(ids.length ? 'Got it! Your plan is updated 💗' : 'No classes. Rest or catch up, your call 🌸'); };
  $('#ciOk').onclick = () => done($$('#ciChips .chip.on').map((c) => c.dataset.cid));
  $('#ciNone').onclick = () => done([]);
}

function renderPlan() {
  const night = studyDay();
  const key = 'plan.' + ymd(night);
  const doneSet = new Set(ls.get(key, []));
  const tmr = classesOn(addDays(night, 1));
  const today = classesOn(night);
  const items = [
    { id: 'nap', time: '7:30 PM', what: '😴 Power nap. Set your alarm for 11:00 PM first!' },
    { id: 'wake', time: '11:00 PM', what: '⏰ Wake up, drink water, 10 min of flashcards', act: ['Cards', 'cards'] },
    ...tmr.list.map((c) => ({ id: 'rev-' + c.id, time: '', what: `📖 Revise last lecture: <b>${esc(c.name)}</b> (test tomorrow!)`, act: ['Prep', 'prep:' + c.id] })),
    ...today.list.map((c) => ({ id: 'qz-' + c.id, time: '', what: `🎀 5-question quiz on today's <b>${esc(c.name)}</b>`, act: ['Quiz', 'quiz:' + c.id] })),
    { id: 'sleep', time: '2:30 AM', what: '🌙 Lights out. You did amazing, Gigi is proud.' },
  ];
  if (!tmr.list.length && !today.list.length) items.splice(2, 0, { id: 'weak', time: '', what: '💡 No classes around. Pick your shakiest topic and do 📘 Teach me + 🎀 quiz', act: ['Learn', 'learn'] });
  $('#plan').innerHTML = `${tmr.confirmed ? '' : '<p class="small muted">Tomorrow isn\'t confirmed yet, so this uses my prediction.</p>'}
    <ul class="timeline">${items.map((it) => `<li class="${doneSet.has(it.id) ? 'done' : ''}">
      <button class="tick" data-tick="${it.id}" type="button" aria-label="Mark done">${doneSet.has(it.id) ? '✓' : ''}</button>
      <div class="what">${it.time ? `<span class="time">${it.time}</span>` : ''}${it.what}</div>
      ${it.act ? `<button class="btn small" data-act="${it.act[1]}" type="button">${it.act[0]}</button>` : '<span></span>'}
    </li>`).join('')}</ul>`;
  $('#plan').onclick = (e) => {
    const t = e.target.closest('[data-tick]'), a = e.target.closest('[data-act]');
    if (t) {
      const s = new Set(ls.get(key, []));
      if (s.has(t.dataset.tick)) s.delete(t.dataset.tick); else { s.add(t.dataset.tick); award(5, 'plan step done'); markStudied(); }
      ls.set(key, [...s]);
      if (items.every((it) => s.has(it.id))) { confetti(160); badge('night-owl'); }
      renderPlan();
    }
    if (a) doAction(a.dataset.act);
  };
}
function doAction(act) {
  const [k, v] = act.split(':');
  if (k === 'cards') goto('cards');
  else if (k === 'learn') goto('learn');
  else if (k === 'prep') { goto('learn'); $('#lnCourse').value = v; onCourseChange(); newSession(); toast('Tick the last lecture\'s notes, then press ⏰ Test prep'); }
  else if (k === 'quiz') { goto('quiz'); $('#qzCourse').value = v; renderQuizFilesNote(); $('#qzTopic').focus(); }
}
function renderTodayQuizzes() {
  const today = classesOn(studyDay());
  const done = new Set(ls.get('plan.' + ymd(studyDay()), []));
  $('#todayQuizzes').innerHTML = today.list.length
    ? today.list.map((c) => `<div class="hist-row"><span>${done.has('qz-' + c.id) ? '✅' : '🎀'} ${esc(c.name)}</span><button class="btn small primary" data-act="quiz:${esc(c.id)}" type="button">Quiz me</button></div>`).join('')
    : '<p class="muted small">No classes today. Quiz yourself on anything from the 🎀 Quiz tab.</p>';
  $('#todayQuizzes').onclick = (e) => { const a = e.target.closest('[data-act]'); if (a) doAction(a.dataset.act); };
}

/* ================= LIBRARY ================= */
async function addFiles(fileList) {
  const courseId = $('#upCourse').value, kind = $('#upKind').value, week = $('#upWeek').value.trim();
  let n = 0;
  for (const f of fileList) {
    let blob = f, type = f.type || (/\.(txt|md|csv)$/i.test(f.name) ? 'text/plain' : '');
    if (!type) { toast(`Skipped ${f.name}: unsupported type. Save it as PDF.`); continue; }
    if (type.startsWith('image/')) { blob = await compressImage(f); type = blob.type || type; }
    if (blob.size > 25e6) { toast(`${f.name} is over 25 MB. Split or compress it first.`); continue; }
    const id = uid();
    await DB.put('files', { id, courseId, kind, week, name: f.name, type, size: blob.size, blob, added: Date.now() });
    // auto-tick new uploads so they're used straight away
    ls.set('ticked.' + courseId, [...new Set([...ls.get('ticked.' + courseId, []), id])]);
    n++;
  }
  if (n) award(2 * n, `added ${n} file${n > 1 ? 's' : ''}`);
  renderLibrary();
}
async function renderLibrary() {
  fillCourseSelect($('#upCourse'));
  fillCourseSelect($('#libFilter'), true);
  const filter = $('#libFilter').value;
  const files = (await DB.all('files')).filter((f) => !filter || f.courseId === filter).sort((a, b) => b.added - a.added);
  $('#libList').innerHTML = files.length ? files.map((f) => `
    <div class="lib-item">
      <div class="meta">
        <div class="name">${esc(f.name)}</div>
        <div><span class="tag ${f.kind}">${esc(f.kind)}</span><span class="tag">${esc(S.course(f.courseId)?.name || 'Unknown course')}</span>${f.week ? `<span class="tag">${esc(f.week)}</span>` : ''}<span class="muted small">${(f.size / 1e6).toFixed(1)} MB</span></div>
      </div>
      <button class="btn small" data-open="${f.id}" type="button">Open</button>
      <button class="btn small danger" data-delfile="${f.id}" type="button">Delete</button>
    </div>`).join('') : '<p class="muted">Nothing here yet. Add your notes above 🌸</p>';
}
$('#fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
$('#libFilter').addEventListener('change', renderLibrary);
$('#libList').addEventListener('click', async (e) => {
  const o = e.target.closest('[data-open]'), d = e.target.closest('[data-delfile]');
  if (o) { const f = await DB.get('files', o.dataset.open); window.open(URL.createObjectURL(f.blob), '_blank'); }
  if (d && await ask('Delete this file from your library?', { okText: 'Delete' })) { await DB.del('files', d.dataset.delfile); renderLibrary(); }
});

/* ================= LEARN ================= */
let session = null, busy = false;
async function renderLearnSide() {
  fillCourseSelect($('#lnCourse'));
  const want = ls.get('learnCourse', '');
  if (want && S.course(want) && !session) $('#lnCourse').value = want;
  if (!session) newSession();
  await renderFilePick();
  await renderSessions();
}
async function renderFilePick() {
  const cid = $('#lnCourse').value;
  const ticked = new Set(ls.get('ticked.' + cid, []));
  const files = (await DB.all('files')).filter((f) => f.courseId === cid).sort((a, b) => a.added - b.added);
  $('#lnFiles').innerHTML = files.length
    ? files.map((f) => `<label><input type="checkbox" value="${f.id}" ${ticked.has(f.id) ? 'checked' : ''}><span>${esc(f.name)} <span class="tag ${f.kind}">${esc(f.week || f.kind)}</span></span></label>`).join('')
    : `<p class="muted small">No materials for this course yet. <a href="#" data-goto="library">Add some</a>. You can still learn from general knowledge.</p>`;
}
$('#lnFiles').addEventListener('change', () => ls.set('ticked.' + $('#lnCourse').value, $$('#lnFiles input:checked').map((i) => i.value)));
async function renderSessions() {
  const cid = $('#lnCourse').value;
  const ss = (await DB.all('sessions')).filter((s) => s.courseId === cid).sort((a, b) => b.updated - a.updated).slice(0, 30);
  $('#lnSessions').innerHTML = ss.length
    ? ss.map((s) => `<button data-session="${s.id}" class="${session?.id === s.id ? 'active' : ''}" title="${esc(s.title)}" type="button">${esc(s.title)}</button>`).join('')
    : '<p class="muted small">None yet.</p>';
}
function onCourseChange() {
  ls.set('learnCourse', $('#lnCourse').value);
  if (session && session.courseId !== $('#lnCourse').value) newSession();
  renderFilePick(); renderSessions();
}
$('#lnCourse').addEventListener('change', onCourseChange);
$('#lnSessions').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-session]');
  if (!b) return;
  session = await DB.get('sessions', b.dataset.session);
  renderChat(); renderSessions();
});
function newSession() {
  session = null;
  $('#chat').innerHTML = `<div class="empty">${mascot('happy')}<div><b>Let's learn something!</b><ol class="small"><li>Pick a course, tick your materials.</li><li>Type a topic (or leave blank to cover the ticked notes).</li><li>Tap a mode. Still lost? Hit 😵 and I'll try a totally different way.</li></ol></div></div>`;
  renderSessions();
}
$('#newSession').addEventListener('click', newSession);
function msgEl(m) {
  const div = document.createElement('div');
  div.className = 'msg ' + m.role;
  if (m.role === 'user') div.innerHTML = `<div class="who">You 💗</div>${esc(m.display || m.text).replace(/\n/g, '<br>')}`;
  else {
    const r = renderMessage(m.text);
    div.innerHTML = `<div class="who">Gigi ⚙️</div>${r.html}${m.saved ? `<div class="saved-note">✓ Saved ${esc(m.saved)}</div>` : ''}`;
    mountSims(div, r.sims);
  }
  return div;
}
function renderChat() {
  const chat = $('#chat');
  chat.innerHTML = '';
  if (!session?.messages.length) { newSession(); return; }
  session.messages.forEach((m) => chat.appendChild(msgEl(m)));
  chat.scrollTop = chat.scrollHeight;
}
async function send(text, display, mode) {
  if (busy) return;
  const cid = $('#lnCourse').value, course = S.course(cid), files = await tickedFiles(cid);
  if (!session) { session = { id: uid(), courseId: cid, title: (display || text).slice(0, 60), messages: [], created: Date.now(), updated: Date.now() }; $('#chat').innerHTML = ''; }
  const userMsg = { role: 'user', text, display };
  session.messages.push(userMsg);
  const chat = $('#chat');
  chat.appendChild(msgEl(userMsg));
  const out = document.createElement('div');
  out.className = 'msg assistant';
  out.innerHTML = '<div class="who">Gigi ⚙️</div><div class="body typing"></div>';
  chat.appendChild(out);
  chat.scrollTop = chat.scrollHeight;
  const body = out.querySelector('.body');
  busy = true; $('#sendBtn').disabled = true;
  let last = 0, pending = '';
  try {
    const full = await AI.stream({
      system: buildSystem(course, files),
      history: session.messages.map(({ role, text: t }) => ({ role, text: t })),
      files,
      onText: (t) => {
        pending = t;
        const now = performance.now();
        if (now - last > 120) {
          last = now;
          body.innerHTML = renderMessage(t, true).html;
          if (chat.scrollHeight - chat.scrollTop - chat.clientHeight < 200) chat.scrollTop = chat.scrollHeight;
        }
      },
    });
    const reply = { role: 'assistant', text: full || pending };
    const r = renderMessage(reply.text);
    reply.saved = await saveMemory(r.memory, cid);
    session.messages.push(reply);
    session.updated = Date.now();
    await DB.put('sessions', session);
    out.replaceWith(msgEl(reply));
    markStudied();
    award(mode ? 10 : 2, mode ? 'lesson' : 'question');
    if (mode === 'teach' || mode === 'lastlecture') badge('first-lesson');
    if (r.sims.length) badge('visual');
    renderSessions();
  } catch (err) {
    session.messages.pop();
    out.classList.add('error');
    out.innerHTML = `<div class="who">Oops 🥺</div>${esc(err.message || String(err))}`;
    if (!display) $('#ask').value = text;
    if (!session.messages.length) session = null;
  } finally { busy = false; $('#sendBtn').disabled = false; }
}
$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  const mode = b.dataset.mode, topic = $('#topic').value.trim();
  if (mode === 'quiz5') { goto('quiz'); $('#qzCourse').value = $('#lnCourse').value; $('#qzTopic').value = topic; renderQuizFilesNote(); return; }
  const T = topic || 'the attached materials (cover the main topics in them)';
  send(MODE_PROMPTS[mode](T, topic), `${MODE_LABELS[mode]}${topic ? ': ' + topic : ''}`, mode);
});
$('#quick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-quick]');
  if (!b) return;
  if (!session) { toast('Start with a mode first 💗'); return; }
  send(QUICK_PROMPTS[b.dataset.quick], b.textContent);
});
$('#askForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = $('#ask').value.trim();
  if (!t) return;
  $('#ask').value = '';
  send(t);
});
$('#ask').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && matchMedia('(min-width: 800px)').matches) { e.preventDefault(); $('#askForm').requestSubmit(); }
});

/* ================= QUIZ ================= */
function parseJsonLoose(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(body);
}
async function renderQuizFilesNote() {
  const cid = $('#qzCourse').value, n = (await tickedFiles(cid)).length;
  $('#qzFilesNote').textContent = n ? `Use my ${n} ticked material${n > 1 ? 's' : ''} for this course` : 'No ticked materials for this course (it will use general knowledge)';
}
function renderQuizTab() {
  fillCourseSelect($('#qzCourse'));
  const want = ls.get('learnCourse', '');
  if (want && !$('#qzCourse').dataset.touched) $('#qzCourse').value = want;
  renderQuizFilesNote();
  renderQuizHistory();
}
$('#qzCourse').addEventListener('change', (e) => { e.target.dataset.touched = '1'; renderQuizFilesNote(); });
async function renderQuizHistory() {
  const qs = (await DB.all('quizzes')).sort((a, b) => b.at - a.at).slice(0, 30);
  $('#quizHistory').innerHTML = qs.length
    ? qs.map((q) => `<div class="hist-row"><span>${q.score === q.total ? '💯' : q.score >= 3 ? '🌸' : '🌱'} <b>${esc(q.title)}</b><br><span class="small muted">${esc(S.course(q.courseId)?.name || '')} · ${new Date(q.at).toLocaleDateString()}</span></span><span><b>${q.score}/${q.total}</b> <button class="btn small" data-redo="${q.id}" type="button">Redo</button></span></div>`).join('')
    : '<p class="muted small">No quizzes yet. Your scores will show up here.</p>';
}
$('#quizHistory').addEventListener('click', async (e) => {
  const r = e.target.closest('[data-redo]');
  if (!r) return;
  const q = await DB.get('quizzes', r.dataset.redo);
  playQuiz({ ...q.quiz }, q.courseId, q.topic);
});
$('#qzGo').addEventListener('click', async () => {
  const cid = $('#qzCourse').value, course = S.course(cid), topic = $('#qzTopic').value.trim();
  const files = $('#qzUseFiles').checked ? await tickedFiles(cid) : [];
  if (!topic && !files.length) { toast('Tell me what was taught, or tick some materials 💗'); $('#qzTopic').focus(); return; }
  const player = $('#quizPlayer');
  player.classList.remove('hidden');
  player.innerHTML = `<div class="loading">${mascot('wow')}<div><b>Cooking your quiz…</b><div class="small muted">Reading your notes and picking the sneakiest questions 🧁</div></div></div>`;
  player.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#qzGo').disabled = true;
  try {
    let text = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      text = await AI.stream({ system: buildSystem(course, files), history: [{ role: 'user', text: QUIZ_PROMPT({ topic, course: course?.name, hasMaterials: !!files.length }) }], files, onText: () => {} });
      try {
        const quiz = parseJsonLoose(text);
        quiz.questions = (quiz.questions || []).filter((q) => q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).slice(0, 5);
        if (quiz.questions.length < 3) throw new Error('too few questions');
        playQuiz(quiz, cid, topic);
        return;
      } catch { /* try once more */ }
    }
    throw new Error('The AI sent back a quiz I couldn\'t read. Try again?');
  } catch (err) {
    player.innerHTML = `<div class="msg error">${esc(err.message)}</div>`;
  } finally { $('#qzGo').disabled = false; }
});
const PRAISE = ['Yasss! ✨', 'Correct, genius 💅', 'Nailed it! 💗', 'Engineer energy ⚙️', 'Look at you go! 🌸'];
const SOFT = ['Almost! Here\'s the trick 👇', 'Not quite, but now you\'ll never forget it 💡', 'Sneaky one! Read this 👇'];
function playQuiz(quiz, courseId, topic) {
  const player = $('#quizPlayer');
  player.classList.remove('hidden');
  const results = [];
  let i = 0;
  const draw = () => {
    const q = quiz.questions[i];
    player.innerHTML = `
      <div class="row between"><h2>🎀 ${esc(quiz.title || 'Quick test')}</h2><span class="small muted">${i + 1} / ${quiz.questions.length}</span></div>
      <div class="qz-dots">${quiz.questions.map((_, k) => `<i class="${k < results.length ? (results[k] ? 'ok' : 'bad') : k === i ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="qz-q">${md(q.q)}</div>
      <div class="qz-opts">${q.options.map((o, k) => `<button class="qz-opt" data-k="${k}" type="button"><b>${'ABCD'[k] || k + 1}</b><span>${md(o)}</span></button>`).join('')}</div>
      <div id="qzAfter"></div>`;
    $('.qz-opts', player).onclick = (e) => {
      const b = e.target.closest('.qz-opt');
      if (!b || b.disabled) return;
      const k = +b.dataset.k, ok = k === q.answer;
      results.push(ok);
      $$('.qz-opt', player).forEach((x) => { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      $('#qzAfter').innerHTML = `<div class="qz-explain"><b>${ok ? pick(PRAISE) : pick(SOFT)}</b><div>${md(q.explain || '')}</div></div>
        <div class="row" style="margin-top:.7rem"><button class="btn primary" id="qzNext" type="button">${i + 1 < quiz.questions.length ? 'Next →' : 'See my score 🎉'}</button></div>`;
      $('#qzNext').onclick = () => { i++; if (i < quiz.questions.length) draw(); else finish(); };
      $('#qzNext').focus();
    };
  };
  const finish = async () => {
    const score = results.filter(Boolean).length, total = quiz.questions.length;
    const missed = quiz.questions.filter((_, k) => !results[k]);
    for (const q of missed) await addCard(courseId, q.q, `**${q.options[q.answer]}**\n\n${q.explain || ''}`);
    await DB.put('quizzes', { id: uid(), at: Date.now(), courseId, topic, title: quiz.title || topic || 'Quiz', score, total, quiz });
    const k = 'plan.' + ymd(studyDay()), s = new Set(ls.get(k, [])); s.add('qz-' + courseId); ls.set(k, [...s]);
    markStudied();
    award(score * 5 + (score === total ? 10 : 0), `quiz: ${score}/${total}`);
    badge('first-quiz');
    if (score === total) { badge('perfect'); confetti(180); } else if (score >= 3) confetti(80);
    const msg = score === total ? 'PERFECT. You\'re literally built different 💯' : score >= 4 ? 'So close to perfect! Proud of you 🌸' : score >= 3 ? 'Good job! The tricky ones are now flashcards 💌' : 'That\'s okay! Learning happens in the mistakes. Your misses are now flashcards 💌';
    player.innerHTML = `<div class="qz-end">${mascot(score >= 3 ? 'wow' : 'happy')}<div class="bignum">${score} / ${total}</div><p><b>${msg}</b></p>
      <div class="row wrap" style="justify-content:center">
        ${missed.length ? '<button class="btn primary" id="qzExplain" type="button">🤖 Explain my mistakes</button>' : ''}
        <button class="btn" id="qzAgain" type="button">↺ Retake</button>
        ${missed.length ? '<button class="btn" data-goto="cards" type="button">💌 Review cards</button>' : ''}
      </div></div>`;
    $('#qzAgain').onclick = () => playQuiz(quiz, courseId, topic);
    if ($('#qzExplain')) $('#qzExplain').onclick = () => {
      goto('learn'); $('#lnCourse').value = courseId; onCourseChange(); newSession();
      send(`I just took a quiz on ${topic || 'this course'} and got these wrong:\n\n${missed.map((q, n) => `${n + 1}. ${q.q}\n   Correct answer: ${q.options[q.answer]}`).join('\n')}\n\nTeach me the concepts behind each one so I truly get them, starting with any prerequisite I might be missing. Then give me one similar question per mistake to try.`, '🤖 Explain my quiz mistakes', 'teach');
    };
    renderQuizHistory();
  };
  draw();
  player.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================= LABS ================= */
async function openLab(name) {
  if (labInstance?.destroy) labInstance.destroy();
  labInstance = null;
  ls.set('lab', name);
  $$('.lab-card[data-lab]').forEach((c) => c.classList.toggle('active', c.dataset.lab === name));
  const root = $('#labRoot');
  root.innerHTML = '<p class="muted">Loading lab… ⚙️</p>';
  const store = { get: (k, d) => ls.get(k, d), set: (k, v) => ls.set(k, v) };
  if (name === 'gcode') {
    const { mountGcodeLab } = await import('./labs/gcode.js');
    labInstance = mountGcodeLab(root, {
      award, badge, store,
      onAskTutor: (code, msgs) => {
        goto('learn');
        const ia = S.courses.find((c) => /automation/i.test(c.name));
        if (ia) { $('#lnCourse').value = ia.id; onCourseChange(); }
        newSession();
        send(GCODE_HELP_PROMPT(code, msgs), '🤖 Explain my G-code program', 'worked');
      },
    });
  } else if (name === 'vision') {
    const { mountVisionLab } = await import('./labs/vision.js');
    labInstance = mountVisionLab(root, { award, badge });
  }
  markStudied();
}
function renderLabs() {
  const last = ls.get('lab', '');
  if (last) openLab(last);
}
$('#labPicker').addEventListener('click', (e) => { const c = e.target.closest('[data-lab]'); if (c) openLab(c.dataset.lab); });

/* ================= CARDS: review + glossary ================= */
let reviewQueue = [], showBack = false;
async function renderReview() {
  fillCourseSelect($('#rvCourse'), true);
  const cid = $('#rvCourse').value;
  const cards = (await DB.all('cards')).filter((c) => !cid || c.courseId === cid);
  reviewQueue = cards.filter((c) => c.due <= Date.now()).sort((a, b) => a.due - b.due);
  showBack = false;
  drawCard();
  $('#cardList').innerHTML = cards.length
    ? cards.sort((a, b) => a.due - b.due).map((c) => `<div class="gl-item"><div>${md(c.front)}</div><div class="muted">${esc(S.course(c.courseId)?.name || '')} · due ${c.due <= Date.now() ? 'now' : new Date(c.due).toLocaleDateString()} <a href="#" data-delcard="${c.id}">delete</a></div></div>`).join('')
    : '<p class="muted">No cards yet. They\'re made automatically when you learn.</p>';
}
function drawCard() {
  const c = reviewQueue[0], box = $('#reviewBox');
  if (!c) { box.innerHTML = `<div class="flash"><div class="front">🎉 All caught up!</div><p class="muted">Nothing due right now. Come back tomorrow, or learn something new.</p></div>`; return; }
  box.innerHTML = `
    <p class="muted small">${reviewQueue.length} due · ${esc(S.course(c.courseId)?.name || '')}</p>
    <div class="flash"><div class="front">${md(c.front)}</div>${showBack ? `<div class="back">${md(c.back)}</div>` : ''}</div>
    ${showBack
      ? '<div class="rate"><button class="btn" data-rate="again" type="button">😵 Again</button><button class="btn" data-rate="hard" type="button">😬 Hard</button><button class="btn primary" data-rate="good" type="button">😊 Good</button><button class="btn" data-rate="easy" type="button">😎 Easy</button></div>'
      : '<button class="btn primary" data-reveal type="button">Show answer</button> <span class="muted small">Say your answer out loud first 🗣</span>'}`;
}
$('#reviewBox').addEventListener('click', async (e) => {
  if (e.target.closest('[data-reveal]')) { showBack = true; drawCard(); return; }
  const r = e.target.closest('[data-rate]')?.dataset.rate;
  if (!r) return;
  const c = reviewQueue.shift();
  if (r === 'again') { c.reps = 0; c.interval = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = Date.now() + 10 * 60000; reviewQueue.push(c); }
  else {
    let i = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.interval * c.ease);
    if (r === 'hard') { i = Math.max(1, Math.round((c.interval || 1) * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); }
    if (r === 'easy') { i = Math.round(i * 1.3) + 1; c.ease += 0.15; }
    c.interval = i; c.reps++; c.due = Date.now() + i * DAY_MS;
  }
  await DB.put('cards', c);
  const n = ls.get('reviews', 0) + 1; ls.set('reviews', n);
  if (n >= 50) badge('cards50');
  ls.set('xp', ls.get('xp', 0) + 1); renderXP();
  markStudied();
  showBack = false;
  drawCard(); refreshCounts();
  if (!reviewQueue.length) { confetti(70); toast('All cards done! 💌'); }
});
$('#rvCourse').addEventListener('change', renderReview);
$('#cardList').addEventListener('click', async (e) => {
  const d = e.target.closest('[data-delcard]');
  if (!d) return;
  e.preventDefault();
  await DB.del('cards', d.dataset.delcard);
  renderReview();
});
async function renderGlossary() {
  fillCourseSelect($('#glCourse'), true);
  const cid = $('#glCourse').value, q = $('#glSearch').value.trim().toLowerCase();
  const items = (await DB.all('glossary'))
    .filter((g) => (!cid || g.courseId === cid) && (!q || (g.term + ' ' + g.meaning).toLowerCase().includes(q)))
    .sort((a, b) => a.term.localeCompare(b.term));
  $('#glList').innerHTML = items.length
    ? items.map((g) => `<div class="gl-item"><span class="gl-term">${esc(g.term)}</span> <span class="tag">${esc(S.course(g.courseId)?.name || '')}</span><div>${md(g.meaning)}</div>${g.analogy ? `<div class="muted small">💡 ${esc(g.analogy)}</div>` : ''}</div>`).join('')
    : '<p class="muted">No words yet. Try 🔤 Jargon mode on your notes.</p>';
}
$('#glCourse').addEventListener('change', renderGlossary);
$('#glSearch').addEventListener('input', renderGlossary);

/* ================= SETTINGS ================= */
function bindSetting(id, key, def = '', after) {
  const el = $('#' + id);
  el.value = ls.get(key, def);
  el.addEventListener('change', () => { ls.set(key, el.value.trim()); after?.(); });
}
function renderSettings() {
  const prov = providerNow();
  $('#hereOpt').hidden = !window.claude?.use;
  $('#provider').value = prov;
  $('#geminiBox').classList.toggle('hidden', prov !== 'gemini');
  $('#hereBox').classList.toggle('hidden', prov !== 'here');
  $('#claudeBox').classList.toggle('hidden', prov !== 'claude');
  renderGeminiModels();
  renderCourseEditor();
}
function renderGeminiModels() {
  const models = ls.get('geminiModels', []), cur = ls.get('geminiModel', ''), sel = $('#geminiModel');
  sel.innerHTML = models.length
    ? models.map((m) => `<option value="${esc(m.id)}">${esc(m.label)} (${esc(m.id)})</option>`).join('')
    : `<option value="">${cur ? esc(cur) : 'Press "Load my models" after adding your key'}</option>`;
  if (cur) sel.value = cur;
}
async function loadGeminiModels() {
  const key = ls.get('geminiKey', '');
  if (!key) { toast('Paste your Gemini key first'); return; }
  try {
    const models = await geminiModels(key);
    ls.set('geminiModels', models);
    if (!models.some((m) => m.id === ls.get('geminiModel', ''))) ls.set('geminiModel', pickDefaultGemini(models) || '');
    renderGeminiModels();
    toast(`Found ${models.length} models. Picked ${ls.get('geminiModel', '')} ✨`);
  } catch (e) { toast('Could not load models: ' + e.message, 5000); }
}
function renderCourseEditor() {
  $('#courseEditor').innerHTML = S.courses.map((c, i) => `
    <div class="course-row" data-i="${i}">
      <input type="text" value="${esc(c.name)}" data-field="name" aria-label="Course name">
      <div class="days">${DAYS.map((d) => `<label><input type="checkbox" data-day="${d}" ${c.days.includes(d) ? 'checked' : ''}>${d}</label>`).join('')}</div>
      <button class="btn small danger" data-delcourse="${i}" type="button">Remove</button>
    </div>`).join('');
}
$('#courseEditor').addEventListener('change', (e) => {
  const row = e.target.closest('.course-row');
  if (!row) return;
  const cs = S.courses, c = cs[+row.dataset.i];
  if (e.target.dataset.field === 'name') c.name = e.target.value.trim() || c.name;
  if (e.target.dataset.day) c.days = $$('[data-day]', row).filter((x) => x.checked).map((x) => x.dataset.day);
  S.courses = cs;
});
$('#courseEditor').addEventListener('click', async (e) => {
  const d = e.target.closest('[data-delcourse]');
  if (!d) return;
  const cs = S.courses;
  if (!await ask(`Remove "${cs[+d.dataset.delcourse].name}"? Its files, cards and sessions stay saved.`, { okText: 'Remove' })) return;
  cs.splice(+d.dataset.delcourse, 1);
  S.courses = cs;
  renderCourseEditor();
});
$('#addCourse').addEventListener('click', async () => {
  const name = (await ask('Course name?', { input: '', okText: 'Add' }))?.trim();
  if (!name) return;
  S.courses = [...S.courses, { id: uid(), name: name.trim(), days: [] }];
  renderCourseEditor();
});
bindSetting('provider', 'provider', providerNow(), renderSettings);
bindSetting('geminiKey', 'geminiKey', '', () => { if (ls.get('geminiKey', '')) loadGeminiModels(); });
bindSetting('claudeKey', 'claudeKey');
bindSetting('claudeModel', 'claudeModel', 'claude-opus-5-5');
bindSetting('myName', 'myName', '', renderXP);
bindSetting('myLevel', 'myLevel');
bindSetting('theme', 'theme', 'auto', applyTheme);
$('#geminiModel').addEventListener('change', (e) => ls.set('geminiModel', e.target.value));
$('#loadModels').addEventListener('click', loadGeminiModels);
$('#testAI').addEventListener('click', async () => {
  $('#testResult').textContent = 'Testing…';
  try {
    const t = await AI.stream({ system: 'Reply in one short, cute sentence.', history: [{ role: 'user', text: 'Say hello to a mechatronics student in one sentence.' }], files: [], onText: () => {} });
    $('#testResult').textContent = '✓ ' + t.slice(0, 160);
    confetti(60);
  } catch (e) { $('#testResult').textContent = '✗ ' + e.message; }
});

/* ================= reminders: timetable export, alarms, in-app ================= */
function timetableJson() {
  return JSON.stringify({ timezone: 'Africa/Lagos', courses: S.courses.map((c) => ({ name: c.name, days: c.days })) }, null, 2);
}
$('#copyTimetable').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(timetableJson()); toast('Copied! Paste it into mechlab/reminders/timetable.json on GitHub.'); }
  catch { ask('Copy this:', { input: timetableJson(), cancelText: '' }); }
});
$('#downloadIcs').addEventListener('click', () => {
  // Lagos is UTC+1 all year (no daylight saving), so times are written in UTC.
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const nextAt = (day, h, m) => { const d = new Date(); d.setUTCHours(h - 1, m, 0, 0); while (d.getUTCDay() !== day || d < new Date()) d.setUTCDate(d.getUTCDate() + 1); return d; };
  const usual = (w) => S.courses.filter((c) => c.days.includes(DAYS[w])).map((c) => c.name);
  const ev = [];
  for (let day = 0; day < 7; day++) {
    const tmr = usual((day + 1) % 7);
    if (tmr.length) {
      ev.push({ day, h: 19, m: 15, title: '🌙 MechLab check-in + nap', desc: `Usually tomorrow: ${tmr.join(', ')}. Confirm in MechLab, then nap.` });
      ev.push({ day, h: 23, m: 0, title: '⏰ WAKE UP: study time', desc: `Revise the last lecture of: ${tmr.join(', ')}. Then today's quiz.` });
    }
    if (usual(day).length) ev.push({ day, h: 6, m: 30, title: '🌅 Confirm today\'s classes', desc: 'Open MechLab and check in.' });
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MechLab//EN', 'CALSCALE:GREGORIAN'];
  ev.forEach((e, i) => {
    const s = nextAt(e.day, e.h, e.m), end = new Date(s.getTime() + 15 * 60000);
    lines.push('BEGIN:VEVENT', `UID:mechlab-${i}-${Date.now()}@mechlab`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BY[e.day]}`, `SUMMARY:${e.title}`, `DESCRIPTION:${e.desc}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e.title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  saveFile('mechlab-alarms.ics', new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
});
$('#notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { toast('This browser does not support notifications'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Notifications on (only while MechLab is open; GitHub reminders cover the rest)' : 'Notifications not allowed');
});

/* ================= backup ================= */
$('#exportBtn').addEventListener('click', async () => {
  toast('Preparing backup…');
  const out = { version: 2, exported: new Date().toISOString(), settings: {}, stores: {} };
  for (const k of Object.keys(localStorage)) if (k.startsWith('mechlab.') && !/Key$/.test(k)) out.settings[k] = localStorage.getItem(k);
  for (const s of STORES) out.stores[s] = await Promise.all((await DB.all(s)).map(async (r) => (r.blob ? { ...r, blob: undefined, blob64: await blobToBase64(r.blob) } : r)));
  saveFile(`mechlab-backup-${ymd()}.json`, new Blob([JSON.stringify(out)], { type: 'application/json' }));
});
$('#importInput').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f || !await ask('Import this backup? Items with the same ID will be overwritten.', { okText: 'Import' })) return;
  try {
    const j = JSON.parse(await f.text());
    for (const [k, v] of Object.entries(j.settings || {})) localStorage.setItem(k, v);
    for (const s of STORES) for (const r of j.stores?.[s] || []) {
      if (r.blob64) { const bin = Uint8Array.from(atob(r.blob64), (ch) => ch.charCodeAt(0)); r.blob = new Blob([bin], { type: r.type }); delete r.blob64; }
      await DB.put(s, r);
    }
    toast('Backup restored 💗'); applyTheme(); goto('home');
  } catch (err) { toast('Import failed: ' + err.message, 5000); }
  e.target.value = '';
});

/* ================= boot ================= */
$('#brandMascot').innerHTML = mascot('happy');
renderXP();
const params = new URLSearchParams(location.search);
if (params.has('checkin') || params.has('plan')) {
  goto('home');
  history.replaceState(null, '', location.pathname);
  setTimeout(() => $(params.has('plan') ? '#planCard' : '#checkin')?.scrollIntoView({ behavior: 'smooth' }), 200);
} else goto(ls.get('tab', 'home'));
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.claude) navigator.serviceWorker.register('sw.js').catch(() => {});
