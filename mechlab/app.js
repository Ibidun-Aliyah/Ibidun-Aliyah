// MechLab: personal AI study lab. Everything runs in the browser.
// Data lives in IndexedDB; API keys live in localStorage on this device only.
import { marked } from './vendor/marked.mjs';
import DOMPurify from './vendor/purify.mjs';
import katex from './vendor/katex.mjs';
import { SYSTEM_PROMPT, MODE_PROMPTS, MODE_LABELS, QUICK_PROMPTS } from './prompts.js';

/* ---------------- utils ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY_MS = 86400000;

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

const ls = {
  get(k, d) { try { const v = localStorage.getItem('mechlab.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mechlab.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ---------------- IndexedDB ---------------- */
const STORES = ['files', 'sessions', 'glossary', 'cards'];
let dbp;
function db() {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('mechlab', 1);
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
  clear: (s) => tx(s, 'readwrite', (os) => os.clear()),
};

/* ---------------- settings & courses ---------------- */
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

/* ---------------- file helpers ---------------- */
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
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.85));
  } catch {
    return file; // e.g. HEIC on browsers that can't decode it: keep original
  }
}
const fileKind = (f) => (f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'text');

// Turn stored file records into provider-neutral parts: {kind, mime, name, data|text}
async function filesToParts(files) {
  const parts = [];
  let bytes = 0;
  for (const f of files) {
    const k = fileKind(f);
    if (k === 'text') {
      const text = await f.blob.text();
      bytes += text.length;
      parts.push({ kind: 'text', name: f.name, text });
    } else {
      const data = await blobToBase64(f.blob);
      bytes += data.length;
      parts.push({ kind: k, mime: f.type, name: f.name, data });
    }
  }
  return { parts, bytes };
}

/* ---------------- AI providers ---------------- */
const AI = {
  provider: () => ls.get('provider', 'gemini'),
  async stream({ system, history, files, onText }) {
    const p = AI.provider();
    const { parts, bytes } = await filesToParts(files);
    const limit = p === 'gemini' ? 18e6 : 30e6;
    if (bytes > limit) throw new Error(`The ticked materials are too big to send at once (${(bytes / 1e6).toFixed(1)} MB). Untick some files and try again.`);
    return p === 'claude' ? claudeStream({ system, history, parts, onText }) : geminiStream({ system, history, parts, onText });
  },
};

async function geminiStream({ system, history, parts, onText }) {
  const key = ls.get('geminiKey', '');
  if (!key) throw new Error('No Gemini API key yet. Add it in Settings.');
  const model = ls.get('geminiModel', '') || 'gemini-2.5-flash';
  const fileParts = parts.flatMap((p) => (p.kind === 'text'
    ? [{ text: `--- Material: ${p.name} ---\n${p.text}` }]
    : [{ text: `--- Material: ${p.name} ---` }, { inline_data: { mime_type: p.mime, data: p.data } }]));
  const contents = history.map((m, i) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: i === 0 ? [...fileParts, { text: m.text }] : [{ text: m.text }],
  }));
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
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let j;
      try { j = JSON.parse(line.slice(5)); } catch { continue; }
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
  return (j.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /gemini/i.test(m.name) && !bad.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }));
}
function pickDefaultGemini(models) {
  const score = (id) => (/flash/.test(id) ? 4 : /pro/.test(id) ? 2 : 0) - (/lite/.test(id) ? 2 : 0) - (/(preview|exp)/.test(id) ? 1 : 0) - (/latest/.test(id) ? 0.5 : 0);
  return [...models].sort((a, b) => score(b.id) - score(a.id) || b.id.localeCompare(a.id, undefined, { numeric: true }))[0]?.id;
}

let AnthropicCtor;
async function claudeStream({ system, history, parts, onText }) {
  const key = ls.get('claudeKey', '');
  if (!key) throw new Error('No Claude API key yet. Add it in Settings.');
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
  const messages = history.map((m, i) => ({
    role: m.role,
    content: i === 0 ? [...fileBlocks, { type: 'text', text: m.text }] : m.text,
  }));
  const params = { model, max_tokens: 32000, system, messages };
  // Opus/Sonnet: if a safety classifier declines, the API retries on a fallback model instead of stopping.
  const stream = model.includes('haiku')
    ? client.messages.stream(params)
    : client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  let full = '';
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') { full += ev.delta.text; onText(full); }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') full += '\n\n_(The model declined to continue this answer. Try rephrasing.)_';
  if (final.stop_reason === 'max_tokens') full += '\n\n_(Answer was cut off for length. Say "continue".)_';
  onText(full);
  return full;
}

/* ---------------- rendering ---------------- */
marked.setOptions({ gfm: true, breaks: false });
const SIM_CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:">`;

// Returns {html, sims: [htmlDoc], memory: [{glossary, flashcards}], building}
function renderMessage(text, streaming = false) {
  const sims = [], memory = [];
  let building = false;
  let src = text;
  if (streaming) {
    // hide an unfinished ```html or ```json block while it streams in
    const fences = [...src.matchAll(/```(\w*)/g)];
    if (fences.length % 2 === 1) {
      const last = fences[fences.length - 1];
      building = last[1] === 'html';
      src = src.slice(0, last.index);
    }
  }
  src = src.replace(/```json\s*([\s\S]*?)```/g, (m, body) => {
    try {
      const j = JSON.parse(body);
      if (j && (j.glossary || j.flashcards)) { memory.push(j); return ''; }
    } catch { /* not ours */ }
    return m;
  });
  src = src.replace(/```html\s*([\s\S]*?)```/g, (m, body) => { sims.push(body); return `\n\n@@SIM${sims.length - 1}@@\n\n`; });
  const math = [];
  const keep = (tex, display) => { math.push({ tex, display }); return `@@MATH${math.length - 1}@@`; };
  // protect code first so $ inside code isn't treated as maths
  const code = [];
  src = src.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (m) => { code.push(m); return `@@CODE${code.length - 1}@@`; });
  src = src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/(?<![\\$\w])\$(?![\s$])([^$\n]+?)(?<!\s)\$(?![\w$])/g, (_, t) => keep(t, false));
  src = src.replace(/@@CODE(\d+)@@/g, (_, i) => code[+i]);
  let html = DOMPurify.sanitize(marked.parse(src));
  html = html.replace(/@@MATH(\d+)@@/g, (_, i) => {
    const { tex, display } = math[+i];
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
  });
  html = html.replace(/(<p>)?@@SIM(\d+)@@(<\/p>)?/g, (_, a, i) => `<div class="sim" data-sim="${i}"></div>`);
  if (building) html += '<p class="muted">⏳ Building your interactive visual…</p>';
  return { html, sims, memory };
}

function mountSims(el, sims) {
  $$('.sim', el).forEach((box) => {
    const doc = sims[+box.dataset.sim];
    if (doc == null) return;
    const full = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (h) => h + SIM_CSP) : SIM_CSP + doc;
    box.innerHTML = `<div class="sim-bar"><span>🎛 Interactive visual</span><span><button class="btn small" data-act="taller">Taller</button> <button class="btn small" data-act="reload">Restart</button></span></div>`;
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('title', 'Interactive visual');
    f.srcdoc = full;
    box.appendChild(f);
    box.querySelector('[data-act=reload]').onclick = () => { f.srcdoc = full + ' '; };
    box.querySelector('[data-act=taller]').onclick = () => { f.style.height = (f.offsetHeight + 250) + 'px'; };
  });
}

/* ---------------- memory (glossary + flashcards) ---------------- */
async function saveMemory(memory, courseId) {
  let g = 0, c = 0;
  if (!memory.length) return '';
  const existing = await DB.all('glossary');
  const have = new Set(existing.map((e) => e.courseId + '|' + e.term.toLowerCase()));
  for (const m of memory) {
    for (const t of m.glossary || []) {
      if (!t?.term || have.has(courseId + '|' + t.term.toLowerCase())) continue;
      have.add(courseId + '|' + t.term.toLowerCase());
      await DB.put('glossary', { id: uid(), courseId, term: t.term, meaning: t.meaning || '', analogy: t.analogy || '', added: Date.now() });
      g++;
    }
    for (const f of m.flashcards || []) {
      if (!f?.front) continue;
      await DB.put('cards', { id: uid(), courseId, front: f.front, back: f.back || '', due: Date.now(), interval: 0, ease: 2.5, reps: 0, added: Date.now() });
      c++;
    }
  }
  refreshCounts();
  return [g && `${g} new glossary term${g > 1 ? 's' : ''}`, c && `${c} flashcard${c > 1 ? 's' : ''}`].filter(Boolean).join(' and ');
}

/* ---------------- streak ---------------- */
function markStudied() {
  const days = new Set(ls.get('studyDays', []));
  days.add(ymd());
  ls.set('studyDays', [...days].slice(-400));
}
function streak() {
  const days = new Set(ls.get('studyDays', []));
  let n = 0;
  const d = new Date();
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1); // today not done yet still keeps yesterday's streak alive
  while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return { n, today: days.has(ymd()) };
}

/* ---------------- tabs ---------------- */
function goto(tab) {
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach((s) => s.classList.toggle('active', s.id === 'tab-' + tab));
  ls.set('tab', tab);
  ({ today: renderToday, library: renderLibrary, learn: renderLearnSide, review: renderReview, glossary: renderGlossary, settings: renderSettings })[tab]?.();
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

/* ---------------- TODAY ---------------- */
const coursesOn = (dayIdx) => S.courses.filter((c) => c.days.includes(DAYS[dayIdx]));

async function refreshCounts() {
  const cards = await DB.all('cards');
  $('#dueCount').textContent = cards.filter((c) => c.due <= Date.now()).length;
}

function renderToday() {
  const now = new Date();
  const d = now.getDay();
  const hasKey = ls.get('provider', 'gemini') === 'claude' ? ls.get('claudeKey', '') : ls.get('geminiKey', '');
  $('#setupBanner').classList.toggle('hidden', !!hasKey);
  $('#todayTitle').textContent = `Today · ${DAY_NAMES[d]}`;
  const today = coursesOn(d);
  $('#todayClasses').innerHTML = today.length
    ? today.map((c) => `<div class="class-line"><b>${esc(c.name)}</b><br><span class="muted small">Test likely on the previous lecture.</span> <a href="#" data-prep="${esc(c.id)}">Quick prep</a></div>`).join('')
    : '<p class="muted">No classes on the timetable today. Good day to catch up on a weak topic.</p>';
  const tmr = coursesOn((d + 1) % 7);
  $('#tonight').innerHTML = tmr.length
    ? `<p class="muted small">Tomorrow (${DAY_NAMES[(d + 1) % 7]}) you have:</p>` + tmr.map((c) => `<div class="class-line"><b>${esc(c.name)}</b> <a href="#" data-prep="${esc(c.id)}">Revise last lecture →</a></div>`).join('')
    : '<p class="muted">No classes tomorrow. Clear your due flashcards, then pick one topic you felt shaky on this week.</p>';
  const st = streak();
  $('#streak').textContent = `${st.n} 🔥`;
  $('#streakNote').textContent = st.today ? 'You studied today. Nice.' : 'You haven\'t studied yet today.';
  $('#weekGrid').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((i) => {
    const cs = coursesOn(i);
    return `<div class="day ${i === d ? 'today' : ''}"><b>${DAYS[i]}</b>${cs.length ? cs.map((c) => esc(c.name)).join('<br>') : '<span class="muted">-</span>'}</div>`;
  }).join('');
  refreshCounts();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-prep]');
  if (!a) return;
  e.preventDefault();
  goto('learn');
  $('#lnCourse').value = a.dataset.prep;
  onCourseChange();
  newSession();
  $('#topic').focus();
  toast('Tick the last lecture\'s notes, then press ⏰ Test prep');
});

/* ---------------- LIBRARY ---------------- */
async function addFiles(fileList) {
  const courseId = $('#upCourse').value;
  const kind = $('#upKind').value;
  const week = $('#upWeek').value.trim();
  let n = 0;
  for (const f of fileList) {
    let blob = f, type = f.type || (/\.(txt|md|csv)$/i.test(f.name) ? 'text/plain' : '');
    if (!type) { toast(`Skipped ${f.name}: unsupported type. Save it as PDF.`); continue; }
    if (type.startsWith('image/')) { blob = await compressImage(f); type = blob.type || type; }
    if (blob.size > 25e6) { toast(`${f.name} is over 25 MB. Split or compress it first.`); continue; }
    await DB.put('files', { id: uid(), courseId, kind, week, name: f.name, type, size: blob.size, blob, added: Date.now() });
    n++;
  }
  if (n) toast(`Added ${n} file${n > 1 ? 's' : ''}`);
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
      <button class="btn small" data-open="${f.id}">Open</button>
      <button class="btn small danger" data-delfile="${f.id}">Delete</button>
    </div>`).join('') : '<p class="muted">Nothing here yet. Add your notes above.</p>';
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
  if (d && confirm('Delete this file from your library?')) { await DB.del('files', d.dataset.delfile); renderLibrary(); }
});

/* ---------------- LEARN ---------------- */
let session = null;     // {id, courseId, title, messages:[{role,text,display}], created, updated}
let busy = false;

async function renderLearnSide() {
  fillCourseSelect($('#lnCourse'));
  if (!$('#lnCourse').value && S.courses[0]) $('#lnCourse').value = S.courses[0].id;
  const want = ls.get('learnCourse', '');
  if (want && S.course(want) && $('#lnCourse').value !== want && !session) $('#lnCourse').value = want;
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
$('#lnFiles').addEventListener('change', () => {
  ls.set('ticked.' + $('#lnCourse').value, $$('#lnFiles input:checked').map((i) => i.value));
});
async function renderSessions() {
  const cid = $('#lnCourse').value;
  const ss = (await DB.all('sessions')).filter((s) => s.courseId === cid).sort((a, b) => b.updated - a.updated).slice(0, 30);
  $('#lnSessions').innerHTML = ss.length
    ? ss.map((s) => `<button data-session="${s.id}" class="${session?.id === s.id ? 'active' : ''}" title="${esc(s.title)}">${esc(s.title)}</button>`).join('')
    : '<p class="muted small">None yet.</p>';
}
function onCourseChange() {
  ls.set('learnCourse', $('#lnCourse').value);
  if (session && session.courseId !== $('#lnCourse').value) newSession();
  renderFilePick();
  renderSessions();
}
$('#lnCourse').addEventListener('change', onCourseChange);
$('#lnSessions').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-session]');
  if (!b) return;
  session = await DB.get('sessions', b.dataset.session);
  renderChat();
  renderSessions();
});
function newSession() {
  session = null;
  $('#chat').innerHTML = '<div class="empty"><p>New session. Pick a mode above to begin.</p></div>';
  renderSessions();
}
$('#newSession').addEventListener('click', newSession);

function msgEl(m) {
  const div = document.createElement('div');
  div.className = 'msg ' + m.role;
  if (m.role === 'user') {
    div.innerHTML = `<div class="who">You</div>${esc(m.display || m.text).replace(/\n/g, '<br>')}`;
  } else {
    const r = renderMessage(m.text);
    div.innerHTML = `<div class="who">Tutor</div>${r.html}${m.saved ? `<div class="saved-note">✓ Saved ${esc(m.saved)}</div>` : ''}`;
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

function buildSystem(course, files) {
  return SYSTEM_PROMPT({
    name: ls.get('myName', '') || 'the student',
    level: ls.get('myLevel', '') || 'a Mechatronics Engineering undergraduate at LASUSTECH, Nigeria',
    course: course?.name || 'Mechatronics',
    materials: files.map((f) => `- ${f.name} (${f.kind}${f.week ? ', ' + f.week : ''})`).join('\n'),
  });
}

async function send(text, display) {
  if (busy) return;
  const cid = $('#lnCourse').value;
  const course = S.course(cid);
  const tickedIds = new Set(ls.get('ticked.' + cid, []));
  const files = (await DB.all('files')).filter((f) => tickedIds.has(f.id));
  if (!session) {
    session = { id: uid(), courseId: cid, title: (display || text).slice(0, 60), messages: [], created: Date.now(), updated: Date.now() };
    $('#chat').innerHTML = '';
  }
  const userMsg = { role: 'user', text, display };
  session.messages.push(userMsg);
  const chat = $('#chat');
  chat.appendChild(msgEl(userMsg));
  const out = document.createElement('div');
  out.className = 'msg assistant';
  out.innerHTML = '<div class="who">Tutor</div><div class="body typing"></div>';
  chat.appendChild(out);
  chat.scrollTop = chat.scrollHeight;
  const body = out.querySelector('.body');
  busy = true;
  $('#sendBtn').disabled = true;
  let last = 0, pending = '';
  const paint = (t) => {
    const r = renderMessage(t, true);
    body.innerHTML = r.html;
    const nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 200;
    if (nearBottom) chat.scrollTop = chat.scrollHeight;
  };
  try {
    const full = await AI.stream({
      system: buildSystem(course, files),
      history: session.messages.map(({ role, text: t }) => ({ role, text: t })),
      files,
      onText: (t) => {
        pending = t;
        const now = performance.now();
        if (now - last > 120) { last = now; paint(t); }
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
    renderSessions();
  } catch (err) {
    session.messages.pop(); // let the student retry the same message
    out.classList.add('error');
    out.innerHTML = `<div class="who">Error</div>${esc(err.message || String(err))}`;
    if (!display) $('#ask').value = text;
    if (!session.messages.length) session = null;
  } finally {
    busy = false;
    $('#sendBtn').disabled = false;
  }
}

$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  const mode = b.dataset.mode;
  const topic = $('#topic').value.trim();
  const T = topic || 'the attached materials (cover the main topics in them)';
  send(MODE_PROMPTS[mode](T, topic), `${MODE_LABELS[mode]}${topic ? ': ' + topic : ''}`);
});
$('#quick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-quick]');
  if (!b) return;
  if (!session) { toast('Start with a mode first'); return; }
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
  if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 800px)').matches) { e.preventDefault(); $('#askForm').requestSubmit(); }
});

/* ---------------- REVIEW (spaced repetition) ---------------- */
let reviewQueue = [], showBack = false;
async function renderReview() {
  fillCourseSelect($('#rvCourse'), true);
  const cid = $('#rvCourse').value;
  const cards = (await DB.all('cards')).filter((c) => !cid || c.courseId === cid);
  reviewQueue = cards.filter((c) => c.due <= Date.now()).sort((a, b) => a.due - b.due);
  showBack = false;
  drawCard();
  $('#cardList').innerHTML = cards.length
    ? cards.sort((a, b) => a.due - b.due).map((c) => `<div class="gl-item"><div>${esc(c.front)}</div><div class="muted">${esc(S.course(c.courseId)?.name || '')} · due ${c.due <= Date.now() ? 'now' : new Date(c.due).toLocaleDateString()} <a href="#" data-delcard="${c.id}">delete</a></div></div>`).join('')
    : '<p class="muted">No cards yet. They\'re created automatically when you learn.</p>';
}
function drawCard() {
  const c = reviewQueue[0];
  const box = $('#reviewBox');
  if (!c) { box.innerHTML = '<div class="flash"><div class="front">🎉 All caught up!</div><p class="muted">Nothing due right now. Come back tomorrow, or learn something new.</p></div>'; return; }
  const md = (t) => renderMessage(t).html;
  box.innerHTML = `
    <p class="muted small">${reviewQueue.length} due · ${esc(S.course(c.courseId)?.name || '')}</p>
    <div class="flash"><div class="front">${md(c.front)}</div>${showBack ? `<div class="back">${md(c.back)}</div>` : ''}</div>
    ${showBack
      ? `<div class="rate"><button class="btn" data-rate="again">Again</button><button class="btn" data-rate="hard">Hard</button><button class="btn primary" data-rate="good">Good</button><button class="btn" data-rate="easy">Easy</button></div>`
      : `<button class="btn primary" data-reveal>Show answer</button> <span class="muted small">Say your answer out loud first.</span>`}`;
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
  markStudied();
  showBack = false;
  drawCard();
  refreshCounts();
});
$('#rvCourse').addEventListener('change', renderReview);
$('#cardList').addEventListener('click', async (e) => {
  const d = e.target.closest('[data-delcard]');
  if (!d) return;
  e.preventDefault();
  await DB.del('cards', d.dataset.delcard);
  renderReview();
});

/* ---------------- GLOSSARY ---------------- */
async function renderGlossary() {
  fillCourseSelect($('#glCourse'), true);
  const cid = $('#glCourse').value, q = $('#glSearch').value.trim().toLowerCase();
  const items = (await DB.all('glossary'))
    .filter((g) => (!cid || g.courseId === cid) && (!q || (g.term + ' ' + g.meaning).toLowerCase().includes(q)))
    .sort((a, b) => a.term.localeCompare(b.term));
  $('#glList').innerHTML = items.length
    ? items.map((g) => `<div class="gl-item"><span class="gl-term">${esc(g.term)}</span> <span class="tag">${esc(S.course(g.courseId)?.name || '')}</span><div>${renderMessage(g.meaning).html}</div>${g.analogy ? `<div class="muted small">💡 ${esc(g.analogy)}</div>` : ''}</div>`).join('')
    : '<p class="muted">No terms yet. Try the 🔤 Jargon mode on your notes.</p>';
}
$('#glCourse').addEventListener('change', renderGlossary);
$('#glSearch').addEventListener('input', renderGlossary);

/* ---------------- SETTINGS ---------------- */
function bindSetting(id, key, def = '', after) {
  const el = $('#' + id);
  el.value = ls.get(key, def);
  el.addEventListener('change', () => { ls.set(key, el.value.trim()); after?.(); });
}
function renderSettings() {
  const prov = ls.get('provider', 'gemini');
  $('#provider').value = prov;
  $('#geminiBox').classList.toggle('hidden', prov !== 'gemini');
  $('#claudeBox').classList.toggle('hidden', prov !== 'claude');
  renderGeminiModels();
  renderCourseEditor();
}
function renderGeminiModels() {
  const models = ls.get('geminiModels', []);
  const cur = ls.get('geminiModel', '');
  const sel = $('#geminiModel');
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
    toast(`Found ${models.length} models. Picked ${ls.get('geminiModel', '')}.`);
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
$('#courseEditor').addEventListener('click', (e) => {
  const d = e.target.closest('[data-delcourse]');
  if (!d) return;
  const cs = S.courses;
  if (!confirm(`Remove "${cs[+d.dataset.delcourse].name}"? Its files, cards and sessions stay saved.`)) return;
  cs.splice(+d.dataset.delcourse, 1);
  S.courses = cs;
  renderCourseEditor();
});
$('#addCourse').addEventListener('click', () => {
  const name = prompt('Course name?');
  if (!name) return;
  S.courses = [...S.courses, { id: uid(), name: name.trim(), days: [] }];
  renderCourseEditor();
});

bindSetting('provider', 'provider', 'gemini', renderSettings);
bindSetting('geminiKey', 'geminiKey', '', () => { if (ls.get('geminiKey', '')) loadGeminiModels(); });
bindSetting('claudeKey', 'claudeKey');
bindSetting('claudeModel', 'claudeModel', 'claude-opus-5-5');
bindSetting('myName', 'myName');
bindSetting('myLevel', 'myLevel');
bindSetting('eveTime', 'eveTime', '19:00');
$('#geminiModel').addEventListener('change', (e) => ls.set('geminiModel', e.target.value));
$('#loadModels').addEventListener('click', loadGeminiModels);
$('#testAI').addEventListener('click', async () => {
  $('#testResult').textContent = 'Testing…';
  try {
    const t = await AI.stream({ system: 'Reply in one short sentence.', history: [{ role: 'user', text: 'Say hello to a mechatronics student in one sentence.' }], files: [], onText: () => {} });
    $('#testResult').textContent = '✓ ' + t.slice(0, 140);
  } catch (e) { $('#testResult').textContent = '✗ ' + e.message; }
});

/* ---------------- reminders: timetable export, calendar, in-app ---------------- */
function timetableJson() {
  return JSON.stringify({
    timezone: 'Africa/Lagos',
    evening_reminder: ls.get('eveTime', '19:00'),
    courses: S.courses.map((c) => ({ name: c.name, days: c.days })),
  }, null, 2);
}
$('#copyTimetable').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(timetableJson()); toast('Copied. Paste it into mechlab/reminders/timetable.json on GitHub.'); }
  catch { prompt('Copy this:', timetableJson()); }
});
$('#downloadIcs').addEventListener('click', () => {
  // Lagos is UTC+1 all year (no daylight saving), so times are written in UTC.
  const [eh, em] = ls.get('eveTime', '19:00').split(':').map(Number);
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const nextAt = (day, h, m) => {
    const d = new Date();
    d.setUTCHours(h - 1, m, 0, 0);
    while (d.getUTCDay() !== day || d < new Date()) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const ev = [];
  for (let day = 0; day < 7; day++) {
    const tmr = coursesOn((day + 1) % 7), tdy = coursesOn(day);
    if (tmr.length) ev.push({ day, h: eh, m: em, title: `📚 Revise for tomorrow: ${tmr.map((c) => c.name).join(', ')}`, desc: 'Test at the start of class is on the last lecture. Open MechLab → Today → Revise last lecture.' });
    if (tdy.length) ev.push({ day, h: 7, m: 0, title: `🎯 Classes today: ${tdy.map((c) => c.name).join(', ')}`, desc: 'Do a 10-minute recap of the last lecture before each class.' });
  }
  ev.push({ day: 6, h: 10, m: 0, title: '🔁 Weekly MechLab review', desc: 'Clear due flashcards and re-learn your weakest topic of the week.' });
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MechLab//EN', 'CALSCALE:GREGORIAN'];
  ev.forEach((e, i) => {
    const s = nextAt(e.day, e.h, e.m), end = new Date(s.getTime() + 30 * 60000);
    lines.push('BEGIN:VEVENT', `UID:mechlab-${i}-${Date.now()}@mechlab`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BY[e.day]}`, `SUMMARY:${e.title}`, `DESCRIPTION:${e.desc}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e.title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  a.download = 'mechlab-reminders.ics';
  a.click();
});
$('#notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { toast('This browser does not support notifications'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Notifications on (they only fire while MechLab is open; use GitHub reminders for the rest)' : 'Notifications not allowed');
});
setInterval(() => {
  // In-app nudge at the evening time if the student hasn't studied yet today.
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hm !== ls.get('eveTime', '19:00') || ls.get('nudged', '') === ymd() || streak().today) return;
  ls.set('nudged', ymd());
  const tmr = coursesOn((now.getDay() + 1) % 7).map((c) => c.name);
  const body = tmr.length ? `Tomorrow: ${tmr.join(', ')}. Revise the last lecture now.` : 'Clear your flashcards and keep the streak going.';
  if ('Notification' in window && Notification.permission === 'granted') new Notification('MechLab: time to read 📚', { body });
  else toast(body, 8000);
}, 30000);

/* ---------------- backup ---------------- */
$('#exportBtn').addEventListener('click', async () => {
  toast('Preparing backup…');
  const out = { version: 1, exported: new Date().toISOString(), settings: {}, stores: {} };
  for (const k of Object.keys(localStorage)) if (k.startsWith('mechlab.') && !/Key$/.test(k)) out.settings[k] = localStorage.getItem(k);
  for (const s of STORES) {
    out.stores[s] = await Promise.all((await DB.all(s)).map(async (r) => (r.blob ? { ...r, blob: undefined, blob64: await blobToBase64(r.blob) } : r)));
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = `mechlab-backup-${ymd()}.json`;
  a.click();
});
$('#importInput').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f || !confirm('Import this backup? Items with the same ID will be overwritten.')) return;
  try {
    const j = JSON.parse(await f.text());
    for (const [k, v] of Object.entries(j.settings || {})) localStorage.setItem(k, v);
    for (const s of STORES) {
      for (const r of j.stores?.[s] || []) {
        if (r.blob64) { const bin = Uint8Array.from(atob(r.blob64), (ch) => ch.charCodeAt(0)); r.blob = new Blob([bin], { type: r.type }); delete r.blob64; }
        await DB.put(s, r);
      }
    }
    toast('Backup restored');
    goto('today');
  } catch (err) { toast('Import failed: ' + err.message, 5000); }
  e.target.value = '';
});

/* ---------------- boot ---------------- */
goto(ls.get('tab', 'today'));
