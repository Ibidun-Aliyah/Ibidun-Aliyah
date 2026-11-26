/* Hive extras (v6.5): bee-path application timeline · Bee Pouch (documents + essay library) · smart daily plan ·
 * deadline heatmap · monthly report card · wall of wins · WhatsApp capture help · iPhone (Scriptable) widget.
 * Everything here works without a script update: documents live on the phone (Android: app storage through the
 * bridge; iPhone/web: IndexedDB), essays and plan ticks live in localStorage. */
(() => {
let H = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isOpp = r => r && r.Category !== 'Event' && r.Category !== 'Other' && r.Status !== 'New' && r.Status !== 'Suggested';
const bee = (mood, size) => window.bisiSvg ? bisiSvg(mood, size, true) : '🐝';
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ================= 1. Bee path: Bisi flies flower to flower, the nectar pot is Submitted ================= */
const STAGES = [
  ['Found', 'You saved it'], ['Read up', 'Requirements read'], ['Gather', 'Half the steps done'],
  ['Polish', 'Everything ticked'], ['Submit', 'Nectar pot full!']];
function stageOf(r){
  const l = H.reqs(r), done = l.filter(x => x.done).length, f = l.length ? done / l.length : 0;
  const drafts = !!(r['Essay doc'] || r['CV doc']);
  if (H.applied(r)) return 4;
  if ((l.length && f === 1) || (!l.length && r['Essay doc'] && r['CV doc'])) return 3;
  if ((l.length && f >= 0.5) || (!l.length && drafts)) return 2;
  if (r.Status === 'Preparing' || done > 0 || r.Eligibility || drafts) return 1;
  return 0;
}
const PETALS = ['--sun', '--rose', '--plum', '--sky'];
function flower(x, y, on, i){
  const c = on ? css(PETALS[i % 4]) || '#F5B700' : 'none', s = on ? css('--stroke') || '#1E1606' : css('--line') || '#ccc';
  let p = '';
  for (let k = 0; k < 5; k++){ const a = k * 72 * Math.PI / 180; p += `<ellipse cx="${(x + Math.sin(a) * 9).toFixed(1)}" cy="${(y - Math.cos(a) * 9).toFixed(1)}" rx="6.5" ry="8.5" transform="rotate(${k * 72} ${(x + Math.sin(a) * 9).toFixed(1)} ${(y - Math.cos(a) * 9).toFixed(1)})" fill="${c}" stroke="${s}" stroke-width="2"/>`; }
  return `<path d="M${x} ${y + 10} q-4 16 2 26" fill="none" stroke="${on ? css('--accent') || '#2F6B3A' : s}" stroke-width="2.4" stroke-linecap="round"/>${p}<circle cx="${x}" cy="${y}" r="6" fill="${on ? '#FFD23F' : css('--card') || '#fff'}" stroke="${s}" stroke-width="2"/>`;
}
function path(r){
  if (!isOpp(r)) return '';
  const st = stageOf(r), l = H.reqs(r), done = l.filter(x => x.done).length;
  const P = [[34, 78], [100, 46], [166, 82], [232, 46], [300, 70]];
  const d = `M${P[0][0]} ${P[0][1]} ` + P.slice(1).map((p, i) => { const q = P[i]; const mx = (q[0] + p[0]) / 2; return `C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`; }).join(' ');
  const pct = st / 4 * 100, fill = st === 4 ? 1 : st / 4 * 0.75 + (l.length ? done / l.length * 0.1 : 0);
  const potTop = 52, potH = 38, lvl = potTop + potH * (1 - fill);
  const out = r.Outcome && ['Accepted', 'Shortlisted', 'Interview'].indexOf(r.Outcome) >= 0;
  const u = H.urgency(r), mood = st === 4 ? (out ? 'party' : 'happy') : u && u.tone === 'rose' ? 'worried' : 'happy';
  const bx = st === 4 ? 300 : (P[st][0] + P[st + 1][0]) / 2, by = st === 4 ? 30 : Math.min(P[st][1], P[st + 1][1]) - 16;
  const next = st < 4 ? STAGES[st + 1] : null;
  const tip = st === 4 ? (out ? `${r.Outcome}! The pot overflowed. 🏆` : r.Outcome === 'Rejected' ? 'Pot filled. Not this time, but the honey counts. Brave try. 💛' : 'Pot full: submitted! Now we wait (and check email).')
    : st === 3 ? 'Every step ticked. One last flight: submit it and fill the pot!'
    : `Next flower: <b>${next[0]}</b> (${next[1].toLowerCase()})${l.length ? ` · ${done}/${l.length} steps ticked` : ''}.`;
  return `<div class="bp" aria-label="Application path: stage ${st + 1} of 5, ${STAGES[st][0]}">
    <div class="bp-stage">
      <svg viewBox="0 0 340 150" width="100%" aria-hidden="true">
        <path d="${d}" fill="none" stroke="${css('--line')}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${css('--sun')}" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100"/>
        ${P.slice(0, 4).map((p, i) => flower(p[0], p[1], i <= st, i)).join('')}
        <g class="bp-pot">
          <clipPath id="bp-clip"><path d="M283 ${potTop} h34 q8 18 0 ${potH} h-34 q-8 -18 0 -${potH}z"/></clipPath>
          <rect x="270" y="${lvl.toFixed(1)}" width="60" height="${potH + 4}" fill="#F5B700" clip-path="url(#bp-clip)" class="bp-honey"/>
          <path d="M283 ${potTop} h34 q8 18 0 ${potH} h-34 q-8 -18 0 -${potH}z" fill="none" stroke="${css('--stroke')}" stroke-width="2.4"/>
          <rect x="280" y="${potTop - 9}" width="40" height="9" rx="3" fill="${css('--card')}" stroke="${css('--stroke')}" stroke-width="2.4"/>
          ${st === 4 ? `<path d="M290 ${potTop} q4 8 0 12 q-4 -6 0 -12z" fill="#F5B700" stroke="${css('--stroke')}" stroke-width="1.6"/>` : ''}
          <text x="300" y="${potTop + potH - 8}" text-anchor="middle" font-size="11" font-family="Patrick Hand, cursive" fill="${css('--ink')}">${Math.round(fill * 100)}%</text>
        </g>
        ${P.map((p, i) => `<text x="${p[0]}" y="${i === 4 ? 112 : p[1] + 50 > 140 ? 140 : p[1] + 50}" text-anchor="middle" font-size="12" font-family="Patrick Hand, cursive" fill="${i <= st ? css('--ink') : css('--muted')}" font-weight="${i === st ? 700 : 400}">${STAGES[i][0]}</text>`).join('')}
        ${r.Captured ? `<text x="34" y="20" text-anchor="middle" font-size="10" font-family="Patrick Hand, cursive" fill="${css('--muted')}">${esc(H.fmt(String(r.Captured).slice(0, 10)))}</text>` : ''}
        ${st === 4 && H.appliedDate(r) ? `<text x="300" y="128" text-anchor="middle" font-size="10" font-family="Patrick Hand, cursive" fill="${css('--muted')}">${esc(H.fmt(H.appliedDate(r)))}</text>` : r.Deadline ? `<text x="300" y="128" text-anchor="middle" font-size="10" font-family="Patrick Hand, cursive" fill="${css(u && u.tone === 'rose' ? '--rose' : '--muted')}">due ${esc(H.fmt(r.Deadline))}</text>` : ''}
      </svg>
      <div class="bp-bee" style="left:${(bx / 340 * 100).toFixed(1)}%;top:${(by / 150 * 100).toFixed(1)}%">${bee(mood, 40)}</div>
    </div>
    <div class="note bp-tip">${tip}</div>
  </div>`;
}

/* ================= 2. Bee Pouch: documents ================= */
const CATS = [['ids', '🪪', 'IDs & passport'], ['results', '📜', 'Results & transcripts'], ['certs', '🏅', 'Certificates'],
  ['cv', '📄', 'CV & cover letters'], ['letters', '✉️', 'Letters & references'], ['photos', '📸', 'Photos'], ['other', '🗂️', 'Other']];
const catOf = k => CATS.find(c => c[0] === k) || CATS[6];
function guessCat(name, mime){
  const n = name.toLowerCase();
  if (/passport photo|headshot|selfie|profile pic/.test(n)) return 'photos';
  if (/passport|nin\b|national id|id card|idcard|voter|licen[cs]e|birth/.test(n)) return 'ids';
  if (/transcript|result|waec|neco|jamb|utme|gce|cgpa|statement of result|grade/.test(n)) return 'results';
  if (/cert|award|diploma|badge|completion/.test(n)) return 'certs';
  if (/\bcv\b|resume|résumé|cover/.test(n)) return 'cv';
  if (/letter|recommend|reference|referee|admission|offer|attestation/.test(n)) return 'letters';
  if (/^image\//.test(mime || '')) return 'photos';
  return 'other';
}
const meta = { all(){ return LS.get('ft-pouch', []); }, save(l){ LS.set('ft-pouch', l); } };
/* blob store: Android app storage through the bridge, otherwise IndexedDB */
const native = () => window.Android && Android.pouchPut && !Android.web;
let dbp = null;
function db(){
  if (!dbp) dbp = new Promise((res, rej) => { const q = indexedDB.open('ft-pouch', 1); q.onupgradeneeded = () => q.result.createObjectStore('f'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  return dbp;
}
const idb = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('f', mode), s = t.objectStore('f'); const q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
const toB64 = blob => new Promise(res => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.readAsDataURL(blob); });
const fromB64 = (b64, mime) => { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); };
async function putBlob(id, file){
  if (native()) return Android.pouchPut(id, await toB64(file));
  await idb('readwrite', s => s.put(file, id)); return true;
}
async function getBlob(id, mime){
  if (native()){ const b = Android.pouchGet(id); return b ? fromB64(b, mime) : null; }
  return idb('readonly', s => s.get(id));
}
async function delBlob(id){ if (native()) Android.pouchDel(id); else await idb('readwrite', s => s.delete(id)); }

async function addFiles(files){
  const list = meta.all(); let n = 0, big = 0;
  for (const f of files){
    if (f.size > 20e6){ big++; continue; }
    const id = 'd' + uid(), name = f.name || ('Photo ' + new Date().toLocaleDateString('en-GB'));
    try {
      if (!(await putBlob(id, f))) throw new Error('save');
      list.unshift({ id, name, mime: f.type || 'application/octet-stream', size: f.size, cat: guessCat(name, f.type), added: H.iso(new Date()), note: '' });
      n++;
    } catch(e){ H.toast('Couldn\'t save ' + name + ' (phone storage full?)'); }
  }
  meta.save(list);
  if (n) H.toast(`Saved ${n} to your Bee Pouch 👝${big ? ` · ${big} too big (max 20 MB)` : ''}`);
  else if (big) H.toast('That file is over 20 MB. Try a smaller copy.');
  renderPouch();
}
const sizeTxt = b => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
const ext = n => (/\.([a-z0-9]{2,5})$/i.exec(n || '') || [, 'file'])[1].toUpperCase();
const thumbs = {};
async function thumb(d){
  if (!/^image\//.test(d.mime)) return;
  if (!thumbs[d.id]){ const b = await getBlob(d.id, d.mime); if (!b) return; thumbs[d.id] = URL.createObjectURL(b); }
  document.querySelectorAll(`[data-thumb="${d.id}"]`).forEach(el => { el.style.backgroundImage = `url(${thumbs[d.id]})`; el.textContent = ''; });
}
async function openDoc(d, share){
  if (native()){ Android.pouchOpen(d.id, d.name, d.mime, !!share); return; }
  const b = await getBlob(d.id, d.mime); if (!b){ H.toast('File not found on this device.'); return; }
  const file = new File([b], d.name, { type: d.mime });
  if (share && navigator.canShare && navigator.canShare({ files: [file] })){ navigator.share({ files: [file], title: d.name }).catch(() => {}); return; }
  const url = URL.createObjectURL(file);
  if (share){ const a = document.createElement('a'); a.href = url; a.download = d.name; a.click(); H.toast('Downloaded ' + d.name); return; }
  window.open(url, '_blank');
}
function docSheet(id){
  const d = meta.all().find(x => x.id === id); if (!d) return;
  H.openSheet(`<div class="sheet-head"><h3>${esc(d.name)}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body">
      <div class="pc-big" data-thumb="${d.id}">${/^image\//.test(d.mime) ? '' : `<span>${esc(ext(d.name))}</span>`}</div>
      <div class="note">${esc(catOf(d.cat)[1] + ' ' + catOf(d.cat)[2])} · ${sizeTxt(d.size)} · added ${esc(H.fmt(d.added))}</div>
      <div class="row"><button class="btn primary" data-pouch="open">Open</button><button class="btn" data-pouch="share">Send / attach</button></div>
      <label class="note" for="pc-name">Name</label><input id="pc-name" value="${esc(d.name)}">
      <label class="note" for="pc-cat">Folder</label>
      <select id="pc-cat">${CATS.map(c => `<option value="${c[0]}" ${c[0] === d.cat ? 'selected' : ''}>${c[1]} ${c[2]}</option>`).join('')}</select>
      <label class="note" for="pc-note">Note (e.g. expires March 2028, certified copy)</label><input id="pc-note" value="${esc(d.note || '')}">
      <div class="row"><button class="btn primary" data-pouch="save">Save changes</button><button class="btn ghost" data-pouch="del" style="margin-left:auto;color:var(--rose)">Delete</button></div>
    </div>`);
  thumb(d);
  const sh = document.getElementById('sheet');
  sh.onclick = async e => {
    const b = e.target.closest('[data-pouch]'); if (!b) return;
    const k = b.dataset.pouch;
    if (k === 'open' || k === 'share'){ openDoc(d, k === 'share'); return; }
    const list = meta.all(), i = list.findIndex(x => x.id === id); if (i < 0) return;
    if (k === 'save'){ Object.assign(list[i], { name: sh.querySelector('#pc-name').value.trim() || d.name, cat: sh.querySelector('#pc-cat').value, note: sh.querySelector('#pc-note').value.trim() }); meta.save(list); H.closeSheet(); H.toast('Saved 🐝'); renderPouch(); }
    if (k === 'del'){ const gone = list.splice(i, 1)[0]; meta.save(list); H.closeSheet(); renderPouch();
      let undone = false; H.toast('Deleted ' + gone.name, () => { undone = true; const l = meta.all(); l.splice(i, 0, gone); meta.save(l); renderPouch(); });
      setTimeout(() => { if (!undone) delBlob(gone.id); }, 5500); }
  };
}

/* ================= 3. Essay library ================= */
const essays = { all(){ return LS.get('ft-essays', []); }, save(l){ return LS.set('ft-essays', l); } };
const words = t => (String(t || '').trim().match(/\S+/g) || []).length;
const STOP = new Set('a an the and or of to in for on with your you why what how do are is be about this that it as at by from describe tell us explain words word maximum max essay statement personal short answer question please'.split(' '));
const keys = t => new Set(String(t || '').toLowerCase().match(/[a-z]{4,}/g)?.filter(w => !STOP.has(w)) || []);
function saveEssay(e){
  const l = essays.all(), now = H.iso(new Date());
  if (e.id){ const i = l.findIndex(x => x.id === e.id); if (i >= 0){ l[i] = Object.assign(l[i], e, { updated: now }); essays.save(l); return l[i]; } }
  const n = Object.assign({ id: 'e' + uid(), title: '', prompt: '', text: '', for: '', added: now, updated: now }, e);
  if (!n.title) n.title = (n.prompt || n.text).split(/[.?!\n]/)[0].slice(0, 60) || 'Untitled essay';
  l.unshift(n); if (!essays.save(l)) H.toast('Phone storage is full; couldn\'t save.'); return n;
}
function essaySheet(id, preset){
  const e = id ? essays.all().find(x => x.id === id) : Object.assign({ title: '', prompt: '', text: '', for: '' }, preset || {});
  if (!e) return;
  const opps = H.rows().filter(isOpp).map(r => r.Title).filter(Boolean);
  H.openSheet(`<div class="sheet-head"><h3>${id ? 'Essay' : 'New essay'}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body">
      <label class="note" for="es-title">Title</label><input id="es-title" value="${esc(e.title)}" placeholder="e.g. Why I want to study robotics">
      <label class="note" for="es-prompt">The question it answers</label><textarea id="es-prompt" rows="2" placeholder="e.g. Describe a challenge you overcame (500 words)">${esc(e.prompt)}</textarea>
      <label class="note" for="es-for">Written for</label><input id="es-for" list="es-opps" value="${esc(e.for)}" placeholder="Which application?"><datalist id="es-opps">${opps.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      <label class="note" for="es-text">Essay <span id="es-wc">${words(e.text)} words</span></label><textarea id="es-text" rows="12" class="es-text" placeholder="Paste or write it here">${esc(e.text)}</textarea>
      <div class="row"><button class="btn primary" data-es="save">Save</button><button class="btn" data-es="copy">Copy</button>${id ? '<button class="btn ghost" data-es="del" style="margin-left:auto;color:var(--rose)">Delete</button>' : ''}</div>
    </div>`);
  const sh = document.getElementById('sheet'), ta = sh.querySelector('#es-text');
  ta.oninput = () => { sh.querySelector('#es-wc').textContent = words(ta.value) + ' words'; };
  sh.onclick = e2 => {
    const b = e2.target.closest('[data-es]'); if (!b) return;
    const v = k => sh.querySelector('#es-' + k).value.trim();
    if (b.dataset.es === 'copy'){ copy(ta.value, 'Copied. Paste it into the application. ✍️'); return; }
    if (b.dataset.es === 'save'){ if (!v('text')){ H.toast('Write or paste the essay first.'); return; }
      saveEssay({ id: id || undefined, title: v('title'), prompt: v('prompt'), for: v('for'), text: ta.value }); H.closeSheet(); H.toast('Saved to your essay library 📚'); renderPouch(); }
    if (b.dataset.es === 'del'){ const l = essays.all(), i = l.findIndex(x => x.id === id), gone = l.splice(i, 1)[0]; essays.save(l); H.closeSheet(); renderPouch();
      H.toast('Deleted ' + gone.title, () => { const l2 = essays.all(); l2.splice(i, 0, gone); essays.save(l2); renderPouch(); }); }
  };
}
function copy(text, msg){
  if (window.Android && Android.copy && !Android.web){ Android.copy(text); H.toast(msg); }
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => H.toast(msg), () => H.toast('Couldn\'t copy.'));
}
/* "you've written something like this before" for an opportunity's writing requirements */
function similar(r){
  const want = H.reqs(r).filter(x => /essay|statement|motivation|why|describe|explain|question|cover letter|words/i.test(x.text));
  if (!want.length) return [];
  const k = keys(want.map(x => x.text).join(' ') + ' ' + (r.Type || ''));
  return essays.all().filter(e => e.for !== r.Title).map(e => { const ek = keys(e.prompt + ' ' + e.title); let s = 0; ek.forEach(w => { if (k.has(w)) s++; }); return { e, s }; })
    .filter(x => x.s >= 1).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.e);
}
function hint(r){
  if (!isOpp(r)) return '';
  const mine = essays.all().filter(e => e.for === r.Title), sim = similar(r);
  if (!mine.length && !sim.length) return '';
  return `<div class="es-hint">📚 ${mine.length ? `In your library for this: ${mine.map(e => `<button class="linkish" data-essay="${e.id}">${esc(e.title)}</button>`).join(', ')}.` : ''}
    ${sim.length ? ` You've written something similar before: ${sim.map(e => `<button class="linkish" data-essay="${e.id}">${esc(e.title)}</button> (${words(e.text)} words)`).join(', ')}. Reuse it!` : ''}</div>`;
}

/* ================= Pouch pane ================= */
let host = null, ptab = 'docs', pq = '';
function mountPouch(el){ host = el; renderPouch(); }
function renderPouch(){
  if (!host || host.hidden) return;
  const docs = meta.all(), es = essays.all(), q = pq.toLowerCase();
  const m = s => !q || String(s || '').toLowerCase().includes(q);
  const ai = H.rows().filter(r => r['Essay doc'] || r['CV doc']);
  host.innerHTML = `<section>
    <div class="pc-hero">${bee('happy', 64)}<div><h2>Bee Pouch</h2><small>Your documents and essays, one tap away. Kept on this phone.</small></div></div>
    <div class="seg pc-tabs"><button data-ptab="docs" aria-pressed="${ptab === 'docs'}">📁 Documents (${docs.length})</button><button data-ptab="essays" aria-pressed="${ptab === 'essays'}">📚 Essays (${es.length + ai.filter(r => r['Essay doc']).length})</button></div>
    <input class="search" id="pc-q" type="search" placeholder="${ptab === 'docs' ? 'Search: passport, transcript, WAEC…' : 'Search your essays: leadership, robotics…'}" value="${esc(pq)}" aria-label="Search the pouch">
    ${ptab === 'docs' ? `
      <div class="row" style="margin-bottom:12px"><label class="btn primary" for="pc-file">＋ Add documents</label><input id="pc-file" type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.txt"></div>
      ${docs.length ? CATS.map(c => { const l = docs.filter(d => d.cat === c[0] && (m(d.name) || m(d.note) || m(c[2]))); return l.length ? `<div class="month">${c[1]} ${c[2]}</div>
        <div class="pc-grid">${l.map(d => `<button class="pc-doc" data-doc="${d.id}"><span class="pc-th" data-thumb="${d.id}">${/^image\//.test(d.mime) ? '' : esc(ext(d.name))}</span><b>${esc(d.name)}</b><small>${esc(d.note || sizeTxt(d.size))}</small></button>`).join('')}</div>` : ''; }).join('')
        || '<div class="empty">Nothing matches that search.</div>'
      : `<div class="empty">Put your passport, transcript, WAEC result, certificates, passport photo and CV here once, and never hunt for them again. 🐝<br><br>Tip: name them clearly (e.g. "WAEC result 2021") and I'll sort them into folders.</div>`}`
    : `
      <div class="row" style="margin-bottom:12px"><button class="btn primary" data-es-new>＋ New essay</button></div>
      ${es.filter(e => m(e.title) || m(e.prompt) || m(e.text) || m(e.for)).map(e => `<button class="card pc-es" data-essay="${e.id}"><b>${esc(e.title)}</b>
        <small>${esc([e.for, words(e.text) + ' words', H.fmt(e.updated)].filter(Boolean).join(' · '))}</small>
        <span>${esc(String(e.prompt || e.text).slice(0, 120))}${String(e.prompt || e.text).length > 120 ? '…' : ''}</span></button>`).join('')}
      ${ai.filter(r => m(r.Title) || m(r.Organisation)).length ? `<div class="month">✨ AI drafts in your Google Drive</div><div class="list">${ai.filter(r => m(r.Title) || m(r.Organisation)).map(r => `<div class="item"><div class="main"><div class="t">${esc(r.Title)}</div><div class="m">${esc(r.Organisation || '')}</div></div>
        ${r['Essay doc'] ? `<button class="btn small" data-url="${esc(r['Essay doc'])}">Essays</button>` : ''}${r['CV doc'] ? `<button class="btn small ghost" data-url="${esc(r['CV doc'])}">CV</button>` : ''}</div>`).join('')}</div>` : ''}
      ${!es.length ? `<div class="empty">Every essay you write (or paste into "Review my draft") can live here, so next time a form asks "Tell us about a challenge", you already have one. ✍️</div>` : ''}`}
  </section>`;
  docs.forEach(thumb);
  const qi = host.querySelector('#pc-q');
  qi.oninput = () => { pq = qi.value; const at = qi.selectionStart; renderPouch(); const n = host.querySelector('#pc-q'); n.focus(); n.setSelectionRange(at, at); };
  const fi = host.querySelector('#pc-file'); if (fi) fi.onchange = () => { addFiles([...fi.files]); fi.value = ''; };
}

/* ================= 4. Smart daily plan ================= */
const MIN_PER_WORKDAY = 75;   // a "work day" in effort() ≈ one focused 75-minute session for a student
function planTasks(rows){
  const out = [], t = H.today();
  rows.filter(r => H.active(r) && r.Category !== 'Event').forEach(r => {
    const d = H.days(r.Deadline), e = H.effort(r), sb = r.Deadline ? H.startBy(r, e) : null;
    const slack = d === null ? 99 : d - e.need;
    if (d !== null && d < 0) return;
    if (!(d !== null && d <= 14) && !(slack <= 10) && r.Status !== 'Preparing') return;
    const l = H.reqs(r);
    const steps = l.map((x, i) => ({ x, i, k: H.reqDays(x.text) })).filter(s => !s.x.done && (s.k.work > 0 || s.k.lead > 0));
    const score = d === null ? 50 : Math.min(d, slack + 2);
    if (!l.length){ out.push({ key: r.ID + ':read', r, text: 'Read the requirements and tick what you need', min: 15, score }); return; }
    // waiting-on-people steps first (ask today, wait later), then the next piece of work
    const lead = steps.filter(s => s.k.lead >= 5).slice(0, 1), work = steps.filter(s => s.k.lead < 5).slice(0, 1);
    lead.forEach(s => out.push({ key: r.ID + ':' + s.i, r, i: s.i, text: (/reference|recommend/i.test(s.x.text) ? 'Ask for it today: ' : 'Request it today: ') + s.x.text, min: 15, score: score - 1 }));
    work.forEach(s => out.push({ key: r.ID + ':' + s.i, r, i: s.i, text: (s.k.kind === 'writing' && s.k.work > 1 ? 'First draft: ' : '') + s.x.text, min: Math.min(90, Math.max(10, Math.round(s.k.work * MIN_PER_WORKDAY / (s.k.work > 1.2 ? 2 : 1) / 5) * 5)), score }));
    if (!steps.length && l.length) out.push({ key: r.ID + ':submit', r, text: 'Everything is ticked: submit it! 🍯', min: 20, score: score - 2 });
  });
  rows.filter(r => r.Status === 'Submitted' && H.days(r['Remind on']) !== null && H.days(r['Remind on']) <= 0)
    .forEach(r => out.push({ key: r.ID + ':check', r, text: 'Check your email for a response', min: 5, score: 30 }));
  out.sort((a, b) => a.score - b.score);
  const budget = [0, 6].indexOf(t.getDay()) >= 0 ? 180 : 120, pick = []; let used = 0;
  for (const x of out){ if (pick.length >= 4) break; if (used + x.min > budget && pick.length) continue; pick.push(x); used += x.min; }
  return pick;
}
function plan(rows){
  const tasks = planTasks(rows); if (!tasks.length) return '';
  const st = LS.get('ft-plan', {}), today = H.iso(H.today()), done = st.d === today ? st.done || [] : [];
  const left = tasks.filter(x => done.indexOf(x.key) < 0), mins = left.reduce((s, x) => s + x.min, 0);
  const hm = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : m + ' min';
  return `<section class="plan"><div class="sh"><h2>Today's plan</h2><small>${left.length ? '~' + hm(mins) + ' left' : 'all done! 🍯'}</small></div>
    <div class="card">${tasks.map(x => { const ok = done.indexOf(x.key) >= 0; return `<div class="pl-row ${ok ? 'done' : ''}">
      <input type="checkbox" data-plan="${esc(x.key)}" ${ok ? 'checked' : ''} aria-label="${esc(x.text)}">
      <div class="main" data-open="${esc(x.r.ID)}"><div class="t">${esc(x.text)}</div><div class="m">${esc(x.r.Title)}</div></div><span class="chip">${hm(x.min)}</span></div>`; }).join('')}
    <div class="note pl-foot">${left.length ? 'Small bites, big honey. Ticking a step here ticks it on the application too.' : 'You did today\'s plan. Rest is part of the plan too. 💛'}</div></div></section>`;
}
async function tickPlan(key, on){
  const st = LS.get('ft-plan', {}), today = H.iso(H.today());
  const done = st.d === today ? st.done || [] : [];
  const i = done.indexOf(key); if (on && i < 0) done.push(key); if (!on && i >= 0) done.splice(i, 1);
  LS.set('ft-plan', { d: today, done });
  const [id, part] = key.split(':'), r = H.rows().find(x => x.ID === id);
  if (r && /^\d+$/.test(part)){
    const l = H.reqs(r); if (l[+part]){ l[+part].done = on; r.Requirements = H.reqString(l); H.call({ action: 'update', id, fields: { Requirements: r.Requirements } }); }
  }
  if (on) H.toast(done.length === 1 ? 'First one down! 🐝' : 'Ticked. Nectar +1 🍯');
  H.render();
}

/* ================= 5. Deadline heatmap (next 12 weeks) ================= */
function heat(rows){
  const t = H.today(), start = new Date(t); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const N = 84, cells = Array.from({ length: N }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return { d, k: H.iso(d), load: 0, due: [], work: [], ev: [] }; });
  const at = k => cells.find(c => c.k === k);
  rows.filter(r => H.active(r)).forEach(r => {
    if (!r.Deadline) return;
    if (r.Category === 'Event'){ const c = at(r.Deadline); if (c){ c.ev.push(r); c.load += 1; } return; }
    const e = H.effort(r), dd = H.parse(r.Deadline), sb = H.startBy(r, e) || dd;
    const c = at(r.Deadline); if (c){ c.due.push(r); c.load += 3; }
    for (let d = new Date(Math.max(sb, t)); d < dd; d.setDate(d.getDate() + 1)){ const w = at(H.iso(d)); if (w){ w.work.push(r); w.load += 1; } }
  });
  const max = Math.max(1, ...cells.map(c => c.load));
  const lvl = c => !c.load ? 0 : Math.min(4, Math.ceil(c.load / max * 4));
  // busiest week
  let best = null; for (let w = 0; w < 12; w++){ const wk = cells.slice(w * 7, w * 7 + 7), s = wk.reduce((a, c) => a + c.load, 0), dues = wk.reduce((a, c) => a + c.due.length, 0); if (!best || s > best.s) best = { w, s, dues, wk }; }
  const months = []; for (let w = 0; w < 12; w++){ const d = cells[w * 7].d; const lab = d.toLocaleDateString('en-GB', { month: 'short' }); months.push(w === 0 || d.getDate() <= 7 ? lab : ''); }
  return `<div class="card chart hm"><h4>Busy-ness heatmap · next 12 weeks</h4>
    <div class="hm-wrap"><div class="hm-days"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span></div>
    <div><div class="hm-months">${months.map(m => `<span>${m}</span>`).join('')}</div>
    <div class="hm-grid">${cells.map(c => `<button class="hm-c l${lvl(c)} ${c.k === H.iso(t) ? 'now' : ''} ${c.d < t ? 'past' : ''}" data-heat="${c.k}" aria-label="${c.d.toDateString()}: ${c.due.length} due, ${c.work.length} in progress">${c.ev.length ? '<i></i>' : ''}</button>`).join('')}</div></div></div>
    <div class="hm-legend"><span>Free</span>${[0, 1, 2, 3, 4].map(i => `<b class="hm-c l${i}"></b>`).join('')}<span>Packed</span><span class="hm-ev"><i></i> event</span></div>
    <div class="note" id="hm-day">${best && best.s ? `Busiest: week of <b>${esc(best.wk[0].d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</b>${best.dues ? ` (${best.dues} deadline${best.dues > 1 ? 's' : ''})` : ''}. Darker = more work overlapping, counting how long each application takes. Tap a day.` : 'Nothing scheduled yet: a calm 12 weeks. 🌼'}</div></div>`;
}
function heatDay(k){
  const rows = H.rows().filter(r => H.active(r) && r.Deadline);
  const due = rows.filter(r => r.Deadline === k), work = rows.filter(r => r.Category !== 'Event' && r.Deadline > k && (H.startBy(r) ? H.iso(H.startBy(r)) <= k : false));
  const el = document.getElementById('hm-day'); if (!el) return;
  const d = H.parse(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  el.innerHTML = `<b>${esc(d)}</b>: ` + (due.length || work.length ? [due.length ? 'due: ' + due.map(r => `<button class="linkish" data-open="${esc(r.ID)}">${esc(r.Title)}</button>`).join(', ') : '', work.length ? 'working on: ' + work.map(r => `<button class="linkish" data-open="${esc(r.ID)}">${esc(r.Title)}</button>`).join(', ') : ''].filter(Boolean).join(' · ') : 'free day 🌼');
}

/* ================= 6. Monthly report card ================= */
let rcOff = null;
function report(rows){
  const t = H.today(); if (rcOff === null) rcOff = t.getDate() <= 3 ? -1 : 0;
  const m0 = new Date(t.getFullYear(), t.getMonth() + rcOff, 1), key = H.iso(m0).slice(0, 7);
  const inM = s => String(s || '').slice(0, 7) === key;
  const saved = rows.filter(r => inM(r.Captured) && r.Category !== 'Tip').length;
  const applied = rows.filter(r => H.applied(r) && inM(H.appliedDate(r))).length;
  const decided = rows.filter(r => ['Accepted', 'Shortlisted', 'Interview', 'Rejected'].indexOf(r.Outcome) >= 0 && inM(r.Updated));
  const wins = decided.filter(r => r.Outcome !== 'Rejected');
  const missed = rows.filter(r => r.Category !== 'Event' && inM(r.Deadline) && H.days(r.Deadline) < 0 && (r.Outcome === 'Missed the deadline' || H.active(r))).length;
  const evs = rows.filter(r => r.Category === 'Event' && inM(r.Deadline));
  const went = evs.filter(r => r.Outcome === 'Attended').length;
  const g = (n, steps) => steps.findIndex(s => n >= s);
  const L = ['A', 'B', 'C', 'D', 'E'];
  const subj = [
    ['Applying', applied, `${applied} submitted`, L[g(applied, [4, 3, 2, 1, 0])]],
    ['Follow-through', applied + missed ? applied / (applied + missed) : null, missed ? `${missed} deadline${missed > 1 ? 's' : ''} slipped` : 'no missed deadlines', applied + missed ? L[g(applied / (applied + missed), [0.9, 0.75, 0.5, 0.01, 0])] : '–'],
    ['Exploring', saved, `${saved} saved`, L[g(saved, [10, 6, 3, 1, 0])]],
    ['Showing up', evs.length ? went : null, evs.length ? `${went} of ${evs.length} events` : 'no events', evs.length ? L[g(went / evs.length, [0.8, 0.6, 0.4, 0.01, 0])] : '–'],
    ['Results', wins.length, wins.length ? `${wins.length} win${wins.length > 1 ? 's' : ''} 🏆` : decided.length ? `heard back from ${decided.length}` : 'still waiting', wins.length ? 'A+' : decided.length ? 'B' : '–']];
  const graded = subj.map(s => s[3]).filter(x => x !== '–').map(x => x === 'A+' ? 0 : L.indexOf(x));
  const avg = graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : null;
  const overall = avg === null ? '–' : avg < 0.5 ? 'A' : avg < 1.5 ? 'B' : avg < 2.5 ? 'C' : avg < 3.5 ? 'D' : 'E';
  const name = m0.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const comment = overall === '–' ? 'A quiet month on paper. Save a few things and I\'ll have plenty to grade next time. 🐝'
    : overall === 'A' ? `Honestly? Top of the hive. ${applied} application${applied === 1 ? '' : 's'}${wins.length ? ' AND a win' : ''}. I\'m framing this one. 🍯`
    : overall === 'B' ? `Solid work. ${missed ? 'Watch those slipped deadlines: start the long ones earlier.' : 'Push one more application next month and that\'s an A.'}`
    : overall === 'C' ? `Lots of saving, less applying. Pick your top 2 for next month and actually send them. I believe in you (I'll also nag you).`
    : `Rough month, and that's okay. School happens. Next month: one application, start to finish. Just one. 💛`;
  return `<div class="card chart rc"><div class="calhead"><h4>Report card</h4><span class="row"><button class="btn small" data-rc="-1" aria-label="Previous month">‹</button><button class="btn small" data-rc="1" aria-label="Next month" ${rcOff >= 0 ? 'disabled' : ''}>›</button></span></div>
    <div class="rc-paper"><div class="rc-top"><div><b>${esc(name)}</b><small>Hive School of Follow-Through</small></div><div class="rc-grade g-${overall.replace('+', 'p')}">${overall}</div></div>
      <table class="rc-t">${subj.map(s => `<tr><td>${s[0]}</td><td>${esc(s[2])}</td><td class="g-${s[3].replace('+', 'p')}">${s[3]}</td></tr>`).join('')}</table>
      <div class="rc-cm"><span>${bee(overall === 'A' ? 'party' : overall === 'D' || overall === 'E' ? 'worried' : 'happy', 44)}</span><p><b>Bisi's comment:</b> ${esc(comment)}</p></div></div>
    <div class="row"><button class="btn small" data-rc="share">Share my report</button></div></div>`;
}
function reportText(){
  const el = document.querySelector('.rc-paper'); if (!el) return '';
  const rows = [...el.querySelectorAll('.rc-t tr')].map(tr => [...tr.children].map(td => td.textContent).join(' · '));
  return `🐝 My ${el.querySelector('.rc-top b').textContent} report card: ${el.querySelector('.rc-grade').textContent}\n${rows.join('\n')}\n${el.querySelector('.rc-cm p').textContent}`;
}

/* ================= 7. Wall of wins ================= */
function wall(rows){
  const wins = rows.filter(r => ['Accepted', 'Shortlisted', 'Interview'].indexOf(r.Outcome) >= 0).sort((a, b) => String(b.Updated || '').localeCompare(String(a.Updated || '')));
  const brave = rows.filter(r => r.Outcome === 'Rejected' || r.Outcome === 'No response').length;
  const ICON = { Accepted: '🏆', Shortlisted: '⭐', Interview: '🎤' };
  return `<section class="wall"><div class="sh"><h2>Wall of wins</h2><small>${wins.length} framed</small></div>
    <div class="wall-grid">${wins.length ? wins.map((r, i) => `<button class="frame f${i % 3}" data-open="${esc(r.ID)}"><span class="fr-ico">${ICON[r.Outcome]}</span><b>${esc(r.Title)}</b><small>${esc([r.Outcome, r.Organisation].filter(Boolean).join(' · '))}</small>${r.Updated ? `<i>${esc(H.fmt(String(r.Updated).slice(0, 10)))}</i>` : ''}</button>`).join('')
      : `<div class="frame empty-frame"><span class="fr-ico">🖼️</span><b>Your first win goes here</b><small>Accepted, shortlisted or invited to interview: I'll frame it.</small></div>`}</div>
    ${brave ? `<div class="card brave"><b>${brave}</b><span>brave ${brave === 1 ? 'try' : 'tries'}. Every "no" is pollen for the next "yes". The people who win are the ones who keep applying. 💛</span></div>` : ''}
  </section>`;
}

/* ================= 8. WhatsApp capture + 9. iPhone widget (help cards in Me) ================= */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function meCards(){
  const web = !window.Android || Android.web;
  const wa = `<section><div class="sh"><h2>Save from WhatsApp</h2><small>groups, channels, statuses</small></div>
    <div class="card wa">${web && isIOS ? `
      <ol><li><b>A message with a link or details:</b> long-press it → <b>More…</b> → tap the <b>Share</b> icon (bottom right) → <b>Save to Bisi</b>.</li>
      <li><b>A flyer or status image:</b> open it → <b>Share</b> → <b>Save to Bisi</b>, or screenshot it and use <b>Upload screenshots</b> in Tracker.</li>
      <li>No "Save to Bisi"? Set up the shortcut in Settings → iPhone guide.</li></ol>` : `
      <ol><li><b>A message with a link or details:</b> long-press it → tap <b>⋮</b> → <b>Share</b> → <b>Follow-Through</b>.</li>
      <li><b>A flyer, poster or status:</b> open it → <b>⋮</b> → <b>Share</b> → <b>Follow-Through</b>. Several images? Select them all and share together: I stitch them into one.</li>
      <li><b>Lots of messages?</b> Select them all, Share, and I'll split out each opportunity.</li></ol>`}
      <div class="note">Bisi reads the text, finds the deadline and requirements, and files it. (A WhatsApp bot would cost money; this is free and private.)</div></div></section>`;
  const widget = web ? `<section><div class="sh"><h2>Home-screen widget</h2><small>iPhone · free Scriptable app</small></div>
    <div class="card wa"><ol>
      <li>Install <b>Scriptable</b> from the App Store (free).</li>
      <li>Tap <b>Copy widget script</b> below.</li>
      <li>In Scriptable: <b>＋</b> → paste → name it <b>Bisi</b>.</li>
      <li>Home screen: long-press → <b>＋</b> → <b>Scriptable</b> → pick a size → tap the widget while jiggling → Script: <b>Bisi</b>.</li></ol>
      <div class="row"><button class="btn primary" data-hive="widget">Copy widget script</button></div>
      <div class="note">It shows what's due next and your counts, refreshes every half hour, and opens the app when tapped. The script holds your private link: don't post it anywhere.</div></div></section>` : '';
  return wa + widget;
}
function widgetScript(){
  const url = (window.Android && Android.webAppUrl && Android.webAppUrl()) || '';
  if (!url){ H.toast('Connect your sheet in Settings first.'); return ''; }
  const app = location.origin + location.pathname.replace(/[^/]*$/, '');
  const goth = document.documentElement.dataset.skin === 'grunge';
  return `// Bisi · Follow-Through widget (Scriptable). Your private link is below: don't share this script.
const URL = ${JSON.stringify(url)};
const APP = ${JSON.stringify(app)};
const C = ${goth ? `{ bg1: "#0C0B0B", bg2: "#2A0E10", ink: "#EDEAE6", muted: "#A39C99", hot: "#E0393E", emoji: "🪲", name: "Bisi" }` : `{ bg1: "#FFD23F", bg2: "#FFF3CC", ink: "#1E1606", muted: "#6E5A2C", hot: "#D9533B", emoji: "🐝", name: "Bisi" }`};
const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), "bisi-cache.json");
let data = null;
try { data = await new Request(URL + "?action=dashboard").loadJSON(); if (data && data.ok) fm.writeString(cache, JSON.stringify(data)); else data = null; } catch (e) {}
if (!data && fm.fileExists(cache)) data = JSON.parse(fm.readString(cache));
const today = new Date(); today.setHours(0, 0, 0, 0);
const days = s => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(s || ""); return m ? Math.round((new Date(+m[1], +m[2] - 1, +m[3]) - today) / 864e5) : null; };
const rows = ((data && data.rows) || []).filter(r => r.Outcome !== "Deleted");
const act = rows.filter(r => (r.Status === "Saved" || r.Status === "Preparing") && days(r.Deadline) !== null && days(r.Deadline) >= 0)
  .sort((a, b) => days(a.Deadline) - days(b.Deadline));
const week = act.filter(r => days(r.Deadline) <= 7).length;
const fam = config.widgetFamily || "medium";
const w = new ListWidget();
const g = new LinearGradient(); g.colors = [new Color(C.bg1), new Color(C.bg2)]; g.locations = [0, 1]; w.backgroundGradient = g;
w.setPadding(12, 14, 12, 14); w.url = APP; w.refreshAfterDate = new Date(Date.now() + 30 * 60e3);
const head = w.addStack(); head.centerAlignContent();
const t = head.addText(C.emoji + " " + C.name); t.font = Font.boldRoundedSystemFont(14); t.textColor = new Color(C.ink);
head.addSpacer();
const c = head.addText(week ? week + " due this week" : "all calm"); c.font = Font.mediumSystemFont(11); c.textColor = new Color(week ? C.hot : C.muted);
w.addSpacer(6);
if (!data) { const e = w.addText("Can't reach your sheet. Open Follow-Through once."); e.font = Font.systemFont(12); e.textColor = new Color(C.muted); }
else if (!act.length) { const e = w.addText("Nothing due. Go find something to apply for! 🌼"); e.font = Font.systemFont(13); e.textColor = new Color(C.ink); }
else for (const r of act.slice(0, fam === "small" ? 2 : fam === "large" ? 7 : 3)) {
  const d = days(r.Deadline), s = w.addStack(); s.centerAlignContent();
  const n = s.addText(r.Title || "Untitled"); n.font = Font.mediumSystemFont(fam === "small" ? 12 : 13); n.textColor = new Color(C.ink); n.lineLimit = 1;
  s.addSpacer(6);
  const x = s.addText(d === 0 ? "today" : d === 1 ? "1 day" : d + " days"); x.font = Font.boldSystemFont(12); x.textColor = new Color(d <= 3 ? C.hot : C.muted);
  w.addSpacer(3);
}
w.addSpacer();
const f = w.addText(rows.filter(r => r.Status === "Submitted").length + " submitted · " + act.length + " in progress"); f.font = Font.systemFont(10); f.textColor = new Color(C.muted);
if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium();
Script.complete();
`;
}

/* ================= wiring ================= */
document.addEventListener('click', e => {
  const t = e.target;
  const pt = t.closest('[data-ptab]'); if (pt){ ptab = pt.dataset.ptab; pq = ''; renderPouch(); return; }
  const dc = t.closest('[data-doc]'); if (dc){ docSheet(dc.dataset.doc); return; }
  const es = t.closest('[data-essay]'); if (es){ e.stopPropagation(); essaySheet(es.dataset.essay); return; }
  if (t.closest('[data-es-new]')){ essaySheet(null); return; }
  const hm = t.closest('[data-heat]'); if (hm){ heatDay(hm.dataset.heat); return; }
  const rc = t.closest('[data-rc]'); if (rc){
    if (rc.dataset.rc === 'share'){ const txt = reportText(); if (window.Android && Android.share && !Android.web) Android.share(txt, ''); else if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else copy(txt, 'Copied your report card.'); return; }
    rcOff = Math.min(0, rcOff + +rc.dataset.rc); H.render(); return; }
  const hv = t.closest('[data-hive]'); if (hv){
    if (hv.dataset.hive === 'widget'){ const s = widgetScript(); if (s) copy(s, 'Copied! Now paste it into a new Scriptable script. 📲'); }
    if (hv.dataset.hive === 'save-draft'){
      const r = H.current(), ta = document.getElementById('rv-draft'); if (!ta || !ta.value.trim()){ H.toast('Paste your draft first.'); return; }
      const q = r ? (H.reqs(r).find(x => /essay|statement|why|describe|question|words/i.test(x.text)) || {}).text || '' : '';
      saveEssay({ text: ta.value, for: r ? r.Title : '', prompt: q }); H.toast('Saved to your essay library 📚');
    }
    return;
  }
}, true);
document.addEventListener('change', e => {
  const p = e.target.closest('[data-plan]'); if (p){ e.stopPropagation(); tickPlan(p.dataset.plan, p.checked); }
}, true);

const STYLE = `
.bp{margin:2px 0 4px}.bp-stage{position:relative}.bp-stage svg{display:block;overflow:visible}
.bp-bee{position:absolute;width:40px;height:40px;transform:translate(-50%,-50%);animation:bp-bob 2.4s ease-in-out infinite;pointer-events:none}
.bp-bee svg{width:40px;height:40px}
@keyframes bp-bob{0%,100%{margin-top:0}50%{margin-top:-6px}}
.bp-honey{transition:y .8s ease}.bp-tip{text-align:center;margin-top:-4px}
.es-hint{background:var(--sun-soft);border:2px dashed var(--line);border-radius:14px;padding:10px 12px;font-size:14px}
.linkish{background:none;border:0;padding:0;color:var(--accent);font:inherit;text-decoration:underline;cursor:pointer}
.pc-hero{display:flex;gap:12px;align-items:center;margin-bottom:12px}.pc-hero h2{margin:0}.pc-hero small{color:var(--muted)}
.pc-hero svg{width:64px;height:64px;flex:none}.pc-tabs{margin-bottom:10px}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;margin-bottom:8px}
.pc-doc{display:flex;flex-direction:column;gap:4px;text-align:left;background:var(--card);border:2px solid var(--stroke);border-radius:14px;padding:8px;box-shadow:2px 2px 0 var(--sh);color:var(--ink);font:inherit;cursor:pointer;min-width:0}
.pc-doc b{font-size:13px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.pc-doc small{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc-th,.pc-big{display:grid;place-items:center;aspect-ratio:4/3;border-radius:10px;background:var(--sunk) center/cover no-repeat;font-weight:800;color:var(--muted);font-size:13px;letter-spacing:.06em}
.pc-big{aspect-ratio:auto;min-height:120px;max-height:46vh;height:220px;background-size:contain}
.pc-es{display:flex;flex-direction:column;gap:3px;text-align:left;width:100%;font:inherit;color:var(--ink);margin-bottom:10px;cursor:pointer}
.pc-es small{color:var(--muted)}.pc-es span{font-size:14px;color:var(--muted)}
.es-text{min-height:240px;line-height:1.5}
.pl-row{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:2px dashed var(--line)}.pl-row:last-of-type{border-bottom:0}
.pl-row input{width:22px;height:22px;flex:none;accent-color:var(--accent)}.pl-row .main{flex:1;min-width:0;cursor:pointer}
.pl-row .t{font-weight:700;line-height:1.25}.pl-row .m{font-size:13px;color:var(--muted)}
.pl-row.done .t{text-decoration:line-through;opacity:.55}.pl-foot{margin-top:6px}
.hm-wrap{display:flex;gap:4px;overflow:hidden}.hm-wrap>div:last-child{flex:1;min-width:0}
.hm-days{display:grid;grid-template-rows:14px repeat(7,1fr);gap:3px;font-size:10px;color:var(--muted);width:12px}
.hm-months{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;font-size:10px;color:var(--muted);height:14px}
.hm-grid{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;grid-template-columns:repeat(12,1fr);gap:3px}
.hm-c{aspect-ratio:1;border-radius:4px;border:0;padding:0;position:relative;background:var(--sunk);cursor:pointer}
.hm-c.l1{background:color-mix(in srgb,var(--sun) 30%,var(--sunk))}.hm-c.l2{background:color-mix(in srgb,var(--sun) 55%,var(--sunk))}
.hm-c.l3{background:color-mix(in srgb,var(--sun) 80%,var(--sunk))}.hm-c.l4{background:var(--rose)}
.hm-c.now{outline:2px solid var(--ink);outline-offset:1px}.hm-c.past{opacity:.35}
.hm-c i,.hm-ev i{position:absolute;right:2px;top:2px;width:5px;height:5px;border-radius:50%;background:var(--plum)}
.hm-legend{display:flex;gap:4px;align-items:center;font-size:11px;color:var(--muted);margin:8px 0 4px}.hm-legend b{width:12px;height:12px;display:inline-block}
.hm-ev{position:relative;padding-left:10px;margin-left:8px}.hm-ev i{left:0;top:4px}
.rc-paper{background:repeating-linear-gradient(var(--card) 0 27px,var(--line) 27px 28px);border:2px solid var(--stroke);border-radius:12px;padding:12px 14px;margin:6px 0 10px;box-shadow:3px 3px 0 var(--sh)}
.rc-top{display:flex;justify-content:space-between;align-items:center}.rc-top b{display:block;font-size:18px}.rc-top small{color:var(--muted)}
.rc-grade{font-family:'Patrick Hand',cursive;font-size:44px;line-height:1;width:64px;height:64px;display:grid;place-items:center;border:3px solid var(--rose);color:var(--rose);border-radius:50%;transform:rotate(-8deg)}
.rc-t{width:100%;border-collapse:collapse;margin:8px 0;font-size:14px}.rc-t td{padding:4px 2px;height:28px}.rc-t td:nth-child(2){color:var(--muted)}
.rc-t td:last-child{font-family:'Patrick Hand',cursive;font-size:22px;text-align:right;color:var(--rose);width:40px}
.rc-cm{display:flex;gap:8px;align-items:flex-start}.rc-cm span svg{width:44px;height:44px}.rc-cm p{margin:0;font-size:14px}
.wall-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:12px}
.frame{display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;padding:14px 10px 12px;background:var(--card);border:6px double #C8962E;border-radius:6px;box-shadow:3px 4px 0 var(--sh);font:inherit;color:var(--ink);cursor:pointer;position:relative}
.frame.f0{transform:rotate(-2deg)}.frame.f1{transform:rotate(1.5deg)}.frame.f2{transform:rotate(-.5deg)}
.frame::before{content:'';position:absolute;top:-10px;left:50%;width:44px;height:16px;margin-left:-22px;background:var(--tape);transform:rotate(-3deg)}
.fr-ico{font-size:32px}.frame b{line-height:1.2}.frame small{color:var(--muted);font-size:12px}.frame i{font-size:11px;color:var(--muted)}
.empty-frame{border-style:dashed;border-color:var(--line);cursor:default;grid-column:1/-1}
.brave{display:flex;gap:12px;align-items:center}.brave b{font-size:32px;font-family:'Patrick Hand',cursive;color:var(--rose)}
.wa ol{margin:0 0 8px;padding-left:20px}.wa li{margin-bottom:6px}
`;
function init(h){
  H = h;
  const s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);
}
const safe = f => (...a) => { if (!H) return ''; try { return f(...a); } catch(e){ console.error('FTHive', e); return ''; } };
window.FTHive = { init, path: safe(path), hint: safe(hint), plan: safe(plan), heat: safe(heat), report: safe(report), wall: safe(wall),
  meCards: safe(meCards), mountPouch: safe(mountPouch), renderPouch: safe(renderPouch), saveEssay, widgetScript, _planTasks: planTasks, _guessCat: guessCat };
})();
