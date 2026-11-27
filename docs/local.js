/* Instant start (v6.11): Follow-Through without a Google Sheet. When the app isn't connected to a sheet, every
 * request the dashboard makes is answered here, on the phone: opportunities, tips and AI documents are kept in
 * localStorage, screenshots in app storage (Android) or IndexedDB (web). AI (sorting, essays, CV, eligibility,
 * review, interview prep) calls Gemini directly with the person's own free key, stored only on the phone.
 * Also: the guided Google-sheet wizard (optional upgrade: backup, emails, Google Docs) and backup files. */
(() => {
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LSx = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } }
};
const isAndroid = () => !!(window.Android && !Android.web);
const connected = () => !!(window.Android && Android.webAppUrl && Android.webAppUrl());
const active = () => !connected();
const SITE = 'https://ibidun-aliyah.github.io/Ibidun-Aliyah/';
let UI = null;   // dashboard helpers for the wizard (toast, openSheet, closeSheet, load)

/* ---------------- storage ---------------- */
const DB_KEY = 'ftl-db';
const db = () => { const d = LSx.get(DB_KEY, null) || {}; d.rows = d.rows || []; d.tips = d.tips || []; d.docs = d.docs || {}; return d; };
function save(d){ if (!LSx.set(DB_KEY, d)) throw new Error('Your phone storage is full. Delete a few old things or back up and clear.'); }
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = () => { const d = new Date(); return isoDay(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const today = () => isoDay(new Date());
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDay(new Date(y, m - 1, d + n)); };
const daysBetween = (a, b) => { const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
const newId = () => 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

let idbp = null;
const idb = () => idbp || (idbp = new Promise((res, rej) => { const q = indexedDB.open('ftl-img', 1); q.onupgradeneeded = () => q.result.createObjectStore('i'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
const idbDo = (mode, fn) => idb().then(d => new Promise((res, rej) => { const t = d.transaction('i', mode), q = fn(t.objectStore('i')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
async function imgPut(id, b64){ try { if (isAndroid() && Android.pouchPut) Android.pouchPut('shot-' + id, b64); else await idbDo('readwrite', s => s.put(b64, id)); return true; } catch(e){ return false; } }
async function imgGet(id){ try { return isAndroid() && Android.pouchGet ? Android.pouchGet('shot-' + id) : await idbDo('readonly', s => s.get(id)); } catch(e){ return ''; } }
async function imgDel(id){ try { if (isAndroid() && Android.pouchDel) Android.pouchDel('shot-' + id); else await idbDo('readwrite', s => s.delete(id)); } catch(e){} }

/* ---------------- HTTP (Gemini) ---------------- */
const pending = {}; let seq = 0;
window.__ftlHttp = (id, status, text) => { const p = pending[id]; if (p){ delete pending[id]; p({ status, text }); } };
async function post(url, body){
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, text: await r.text() };
  } catch(e){
    if (isAndroid() && Android.httpPost) return new Promise(res => { const id = 'h' + (++seq); pending[id] = res; Android.httpPost(url, JSON.stringify(body), id); });
    throw new Error('network');
  }
}
async function getJson(url){
  try { const r = await fetch(url); return { status: r.status, text: await r.text() }; }
  catch(e){ if (isAndroid() && Android.httpPost) return new Promise(res => { const id = 'h' + (++seq); pending[id] = res; Android.httpPost(url, '', id); }); throw new Error('network'); }
}

/* ---------------- Gemini ---------------- */
const G = 'https://generativelanguage.googleapis.com/v1beta/';
const key = () => LSx.get('ftl-key', '');
async function listModels(k){
  const r = await getJson(G + 'models?pageSize=200&key=' + encodeURIComponent(k));
  if (r.status !== 200) return [];
  const list = (JSON.parse(r.text).models || []).filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0)
    .map(m => m.name.replace(/^models\//, '')).filter(n => /flash/.test(n) && !/image|tts|audio|live|embed|vision|thinking|exp|8b/.test(n));
  const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const score = n => ver(n) * 10 - (/lite/.test(n) ? 50 : 0) - (/preview/.test(n) ? 1 : 0) + (/latest/.test(n) ? .5 : 0);
  const s = list.sort((a, b) => score(b) - score(a));
  return s.filter(n => !/lite/.test(n)).slice(0, 3).concat(s.filter(n => /lite/.test(n)).slice(0, 2));
}
async function models(){
  const k = key(); if (!k) throw new Error('no_key');
  let m = LSx.get('ftl-models', null);
  if (!m || !m.list.length || Date.now() - m.at > 3 * 864e5){ const list = await listModels(k); if (list.length){ m = { list, at: Date.now() }; LSx.set('ftl-models', m); } }
  if (!m || !m.list.length) throw new Error('Your Gemini key didn\'t work. Check it in Settings.');
  return { k, list: m.list };
}
function thinking(model){ const v = parseFloat((model.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0'); if (!v) return null; return v < 3 ? { thinkingBudget: 0 } : { thinkingLevel: 'low' }; }
async function gemini(parts, opts){
  opts = opts || {}; const m = await models(), tried = [];
  const order = opts.fast ? m.list.filter(x => /lite/.test(x)).concat(m.list.filter(x => !/lite/.test(x))) : m.list;
  const noSearch = Date.now() < LSx.get('ftl-nosearch', 0);
  for (const model of order){
    for (const search of opts.search && !noSearch ? [true, false] : [false]){
      const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: opts.temperature || .4, maxOutputTokens: opts.maxTokens || 8192 } };
      if (search) body.tools = [{ google_search: {} }]; else if (opts.json) body.generationConfig.responseMimeType = 'application/json';
      if (opts.fast && !LSx.get('ftl-nothink-' + model, 0)){ const t = thinking(model); if (t) body.generationConfig.thinkingConfig = t; }
      let r; try { r = await post(G + 'models/' + model + ':generateContent?key=' + encodeURIComponent(m.k), body); } catch(e){ throw new Error('you\'re offline. AI needs internet'); }
      if (r.status === 200){ const j = JSON.parse(r.text); const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(x => x.text || '').join('').trim();
        if (text) return { text, model, searched: search }; tried.push(model + ': empty'); break; }
      const msg = ((JSON.parse(r.text || '{}').error || {}).message || r.text || '').slice(0, 140);
      if (r.status === 400 && body.generationConfig.thinkingConfig && /think/i.test(r.text)){ LSx.set('ftl-nothink-' + model, 1); tried.push(model + ': retry'); continue; }
      tried.push(model + ' ' + r.status + ' ' + msg);
      if (search){ if ([400, 403, 429].indexOf(r.status) >= 0) LSx.set('ftl-nosearch', Date.now() + 864e5); continue; }
      break;
    }
  }
  throw new Error(tried.every(t => / 429 /.test(t)) ? 'Gemini\'s free limit is used up for now. It resets daily; try again later.' : 'Gemini failed: ' + tried.slice(-2).join(' | '));
}
function parseJson(t){ try { return JSON.parse(t); } catch(e){} const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f){ try { return JSON.parse(f[1]); } catch(e){} } const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch(e){} } return null; }

/* ---------------- prompts' context ---------------- */
function profileText(){
  const p = window.FTWelcome ? FTWelcome.profile() : LSx.get('ftl-profile', {}); if (!p || !Object.keys(p).length) return '';
  let age = ''; if (/^\d{4}-\d{2}-\d{2}$/.test(p.dob || '')){ const d = new Date(p.dob + 'T12:00:00'), n = new Date(); age = n.getFullYear() - d.getFullYear() - ((n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) ? 1 : 0); }
  const L = [];
  if (p.name || p.nickname) L.push('Name: ' + (p.name || p.nickname)); if (age !== '') L.push('Age: ' + age); if (p.gender) L.push('Gender: ' + p.gender);
  if (p.country || p.city) L.push('Lives in: ' + [p.city, p.country].filter(Boolean).join(', ')); if (p.school) L.push('School: ' + p.school); if (p.course) L.push('Course: ' + p.course);
  if (p.level) L.push('Level/year: ' + p.level + (p.gradYear ? ', graduating ' + p.gradYear : '')); if (p.cgpa) L.push('CGPA: ' + p.cgpa);
  if (p.interests) L.push('Interests: ' + p.interests); if (p.goals) L.push('Looking for: ' + p.goals);
  return 'PROFILE\n' + L.join('\n');
}
const docText = k => (db().docs[k] || {}).body || '';
const aboutMe = () => [profileText(), docText('about-me')].filter(Boolean).join('\n\n');
const NO_INVENT = 'Never invent facts, numbers, dates, grades, awards or experience. Where a real detail is needed, write [ADD: what is needed].';
const ctx = r => `OPPORTUNITY: ${r.Title} — ${r.Organisation || ''} (${r.Type || ''})\nDeadline: ${r.Deadline || 'unknown'}\nLink: ${r.Link || ''}\nWhat it offers: ${r['What it offers'] || ''}\nRequirements:\n${r.Requirements || '(not listed)'}\nNotes: ${r.Notes || ''}`;
const meAndCv = () => 'ABOUT ME:\n' + aboutMe().slice(0, 5000) + '\n\nMY CV:\n' + docText('master-cv').slice(0, 9000);

/* ---------------- duplicates ---------------- */
const normUrl = u => { u = String(u || '').trim().toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); return u.length > 8 ? u : ''; };
const normTitle = t => String(t || '').toLowerCase().replace(/\b(20\d\d|call for applications|apply now|applications? open)\b/g, '').replace(/[^a-z0-9]+/g, '');
function findDup(rows, selfId, title, org, link){
  const nl = normUrl(link), nt = normTitle(title), no = normTitle(org); if (!nl && nt.length < 8) return null;
  return rows.filter(x => x.ID !== selfId && x.Status !== 'New' && x.Category !== 'Other' && !/^(Deleted|Duplicate)/.test(String(x.Outcome || ''))).find(x => {
    if (nl && normUrl(x.Link) === nl) return true; const xt = normTitle(x.Title); if (!xt || xt.length < 8) return false; if (xt === nt) return true;
    return (xt.indexOf(nt) >= 0 || nt.indexOf(xt) >= 0) && Math.min(xt.length, nt.length) >= 12 && (!no || !normTitle(x.Organisation) || normTitle(x.Organisation) === no);
  }) || null;
}

/* ---------------- actions ---------------- */
function addRow(p){
  const d = db(), id = newId(), now = stamp();
  const row = { ID: id, Captured: now, Status: 'New', Title: String(p.title || '').slice(0, 300), Link: String(p.url || '').slice(0, 2000), 'Saved from': String(p.app || '').slice(0, 100),
    'Screen text': String(p.screenText || '').slice(0, 20000), Screenshot: p.imageBase64 ? 'local' : '', Notes: String(p.note || '').slice(0, 2000), Updated: now };
  d.rows.push(row); save(d);
  if (p.imageBase64) imgPut(id, p.imageBase64);
  return id;
}
function ingestNative(){
  if (!isAndroid() || !Android.queueTake) return 0;
  let list = []; try { list = JSON.parse(Android.queueTake() || '[]'); } catch(e){}
  list.forEach(j => { try { const b = typeof j === 'string' ? JSON.parse(j) : j; if (b.action === 'capture') addRow(b); else if (b.action) handleSync(b); } catch(e){} });
  return list.length;
}
function setFields(list, id, fields, stampIt){
  const r = list.find(x => x.ID === id); if (!r) return false;
  Object.keys(fields).forEach(k => { if (k !== 'ID'){ let v = fields[k]; if (Array.isArray(v)) v = v.join('\n'); r[k] = v; } });
  if (stampIt) r.Updated = stamp(); return true;
}
function handleSync(p){
  const d = db();
  switch (p.action){
    case 'update': { const ok = setFields(d.rows, p.id, p.fields || {}, true); save(d); return ok ? { ok: true, id: p.id } : { ok: false, error: 'not_found' }; }
    case 'tipUpdate': { const ok = setFields(d.tips, p.id, p.fields || {}); save(d); return ok ? { ok: true } : { ok: false, error: 'not_found' }; }
    case 'delete': { const r = d.rows.find(x => x.ID === p.id); d.rows = d.rows.filter(x => x.ID !== p.id); d.tips = d.tips.filter(x => x.ID !== p.id); save(d); if (r && r.Screenshot === 'local') imgDel(p.id); return { ok: true }; }
    case 'tip': { const i = d.rows.findIndex(x => x.ID === p.id); if (i < 0) return { ok: false, error: 'not_found' }; const s = d.rows[i], f = p.fields || {};
      d.tips.push({ ID: s.ID, Saved: s.Captured, Topic: f.Topic || '', Title: f.Title || s.Title || '', 'Key points': Array.isArray(f['Key points']) ? f['Key points'].join('\n') : (f['Key points'] || ''), Link: f.Link || s.Link || '', 'Saved from': s['Saved from'] || '', Screenshot: s.Screenshot || '', 'In digest': '' });
      d.rows.splice(i, 1); save(d); return { ok: true }; }
    case 'doc': { d.docs[p.key] = { title: p.title || p.key, body: p.mode === 'append' && d.docs[p.key] ? d.docs[p.key].body + '\n\n' + (p.body || '') : String(p.body || ''), at: stamp() }; save(d); return { ok: true, key: p.key, url: 'local:' + p.key }; }
    case 'readDoc': { const x = d.docs[p.key]; return x ? { ok: true, key: p.key, url: 'local:' + p.key, title: x.title, text: x.body } : { ok: false, error: 'no_doc' }; }
    case 'docs': { const o = {}; Object.keys(d.docs).forEach(k => { o[k] = 'local:' + k; }); return { ok: true, docs: o }; }
    case 'profile': { const pr = {}; Object.keys(p).forEach(k => { if (k !== 'action') pr[k] = p[k]; }); LSx.set('ftl-profile', pr.profile || pr); return { ok: true }; }
    case 'getProfile': return { ok: true, profile: LSx.get('ftl-profile', {}) };
    case 'stats': return { ok: true };
    case 'ping': return { ok: true, sheet: 'this phone', local: true, schema: 'local' };
    case 'emailNow': case 'emailSettings': return { ok: false, error: 'Emails need the Google sheet. Connect it in Me → Setup & backup.' };
    case 'list': return { ok: true, today: today(), rows: d.rows };
    case 'tips': return { ok: true, rows: d.tips };
  }
  return null;
}
function dashboard(){
  const n = ingestNative(), d = db();
  const docs = {}; Object.keys(d.docs).forEach(k => { docs[k] = 'local:' + k; });
  return { ok: true, local: true, today: today(), rows: d.rows.map(r => { const o = Object.assign({}, r); delete o['Screen text']; return o; }), tips: d.tips, docs, ai: { hasKey: !!key(), model: (LSx.get('ftl-models', {}).list || [])[0] || '' }, imported: n };
}
async function shotPart(r){ if (r.Screenshot !== 'local') return null; const b = await imgGet(r.ID); return b ? { inline_data: { mime_type: 'image/jpeg', data: b } } : null; }

async function process(p){
  if (!key()) return { ok: false, error: 'no_key' };
  const d = db(), all = d.rows.filter(r => r.Status === 'New' && (!p.id || r.ID === p.id)).sort((a, b) => String(b.Captured).localeCompare(String(a.Captured)));
  const done = [];
  for (const r of all.slice(0, 1)){ try { done.push(await sortOne(r)); } catch(e){ done.push({ id: r.ID, error: String(e.message || e) }); } }
  return { ok: true, processed: done, left: Math.max(0, all.length - done.length) };
}
async function sortOne(r){
  const t = today();
  const prompt = `Today is ${t}. I saved this from my phone (app: ${r['Saved from'] || 'unknown'}) because it might be useful.
About me:
${aboutMe().slice(0, 2500) || '(no profile yet)'}

Work out what it is and reply with ONLY a JSON object:
{
 "category": "Opportunity" | "Event" | "Tip" | "Other",
 "title": string, "organisation": string,
 "type": one of "Scholarship","Internship","Fellowship","Competition","Hackathon","Conference","Programme","Job","Grant","Event","Other",
 "link": string | null,
 "deadline": "YYYY-MM-DD" | null,            // application/registration deadline. NEVER guess; null if not stated
 "eventDate": "YYYY-MM-DD" | null, "eventTime": string | null, "venue": string | null,
 "requirements": [string],                   // e.g. Essay: "Why this programme?" (300 words), "CV", "2 references"
 "offers": string,                           // 1–2 sentences: what it offers and who can apply
 "eligible": "likely" | "unclear" | "unlikely",
 "notes": string,
 "topic": string,                            // tips only: one of "CV & resume","Interviews","Applications & essays","Career","Tech & skills","Productivity","Other"
 "keyPoints": [string]                       // tips only: 3–6 lines of the actual advice
}
Opportunity = something to apply for. Event = something to attend. Tip = advice or a resource to learn from. Other = not useful.
If the year of a date is missing, use its next occurrence after today.

What I saved:
Link: ${r.Link || 'none'}
Screen text:
${String(r['Screen text'] || '').slice(0, 8000)}`;
  const parts = [{ text: prompt }], shot = await shotPart(r); if (shot) parts.push(shot);
  const ans = await gemini(parts, { search: true, json: true, temperature: .2, fast: true });
  const j = parseJson(ans.text); if (!j || !j.category) throw new Error('could_not_read_answer');
  const cat = String(j.category);
  if (cat === 'Tip'){ handleSync({ action: 'tip', id: r.ID, fields: { Topic: j.topic || 'Other', Title: j.title || 'Saved tip', 'Key points': (j.keyPoints || []).map(x => '• ' + x), Link: j.link || r.Link } }); return { id: r.ID, category: 'Tip', title: j.title }; }
  if (cat === 'Other'){ handleSync({ action: 'update', id: r.ID, fields: { Category: 'Other', Status: 'Closed', Outcome: 'Not an opportunity', Title: j.title || '' } }); return { id: r.ID, category: 'Other' }; }
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const deadline = valid(j.deadline) ? j.deadline : (cat === 'Event' && valid(j.eventDate) ? j.eventDate : '');
  let remind; if (!deadline) remind = addDays(t, 3); else { const left = daysBetween(t, deadline), before = cat === 'Event' ? 2 : 7; remind = left > before ? addDays(deadline, -before) : addDays(t, left > 0 ? 1 : 0); }
  const notes = [cat === 'Event' ? [j.eventDate && 'Date: ' + j.eventDate, j.eventTime && 'Time: ' + j.eventTime, j.venue && 'Where: ' + j.venue].filter(Boolean).join(' · ') : '',
    j.eligible ? 'Eligibility: ' + j.eligible : '', j.notes || '', deadline ? (ans.searched ? 'Sorted instantly (checked online).' : 'Sorted instantly. Deadline not yet confirmed online.') : 'No deadline found yet.'].filter(Boolean).join('\n');
  const dup = findDup(db().rows, r.ID, j.title, j.organisation, j.link || r.Link);
  if (dup){ const fill = {}; if (!dup.Deadline && deadline){ fill.Deadline = deadline; fill['Remind on'] = remind; } if (!dup.Link && (j.link || r.Link)) fill.Link = j.link || r.Link; if (!dup.Requirements && (j.requirements || []).length) fill.Requirements = j.requirements.join('\n');
    if (Object.keys(fill).length) handleSync({ action: 'update', id: dup.ID, fields: fill });
    handleSync({ action: 'update', id: r.ID, fields: { Category: cat, Status: 'Closed', Outcome: 'Duplicate of ' + dup.ID, Title: j.title || '' } });
    return { id: r.ID, category: cat, title: j.title, duplicateOf: dup.ID, duplicateTitle: dup.Title }; }
  handleSync({ action: 'update', id: r.ID, fields: { Category: cat, Status: 'Saved', Title: j.title || 'Untitled', Organisation: j.organisation || '', Type: j.type || (cat === 'Event' ? 'Event' : 'Other'),
    Deadline: deadline, 'Remind on': remind, Link: j.link || r.Link || '', Requirements: (j.requirements || []).join('\n'), 'What it offers': j.offers || '', Notes: notes } });
  return { id: r.ID, category: cat, title: j.title, deadline };
}
const rowOf = id => db().rows.find(r => r.ID === id);
async function writeDoc(field, keyName, title, prompt, temp, id){
  const ans = await gemini([{ text: prompt }], { temperature: temp });
  handleSync({ action: 'doc', key: keyName, title, body: ans.text, mode: 'replace' });
  handleSync({ action: 'update', id, fields: { [field]: 'local:' + keyName } });
  return { ok: true, url: 'local:' + keyName };
}
async function essay(p){ const r = rowOf(p.id); if (!r) return { ok: false, error: 'not_found' };
  return writeDoc('Essay doc', 'essay-' + p.id, 'Essays: ' + r.Title, `Help me write the essays for this application. ${NO_INVENT}
Write in simple markdown (# ## ### headings, - bullets, **bold**). For EACH essay/statement/short-answer question in the requirements
(if none are listed, use the usual personal statement: "Why do you want this, and why are you a good fit?"):
## <the exact question>
Word limit: <n or "not stated">
### Angles
- 3 options, one line each, naming the real story from my profile/CV to use
### Recommended
### First draft
In my voice: plain, specific, first person, within the word limit. Open with a concrete moment. No clichés ("passionate", "ever since I was young", "tapestry", "delve").
### Before you submit
- 3 short checks

Start with: # Essays: <title> and a line with the deadline and link.

${ctx(r)}

${meAndCv()}`, .7, p.id); }
async function tailor(p){ const r = rowOf(p.id); if (!r) return { ok: false, error: 'not_found' };
  const cv = docText('master-cv'); if (cv.replace(/\[[^\]]*\]/g, '').trim().length < 200) return { ok: false, error: 'Add your CV first (Me → My CV → Upload).' };
  return writeDoc('CV doc', 'cv-' + p.id, 'CV for ' + r.Title, `Tailor my CV for this opportunity. ${NO_INVENT}
Use ONLY what is in my CV below. You may reorder, reword, cut, and bring forward what matters most here, and mirror the posting's keywords where they are true for me. One page for internships/programmes, two at most otherwise.
Simple markdown (# name, ## sections, - bullets, **bold**) in this order:
## What I changed and why
- 3–6 bullets
---
<the full tailored CV>
## Consider adding (only if true)

${ctx(r)}

MY CV:
${cv.slice(0, 12000)}`, .3, p.id); }
async function interview(p){ const r = rowOf(p.id); if (!r) return { ok: false, error: 'not_found' };
  return writeDoc('Interview doc', 'interview-' + p.id, 'Interview prep: ' + r.Title, `I've been ${r.Outcome === 'Interview' ? 'invited to interview' : 'shortlisted'} for this opportunity. Prepare me.
Simple markdown (# ## headings, - bullets, **bold**):
# Interview prep: <title>
## What they're probably looking for (3 bullets)
## Likely questions
For 8-10 questions (motivation, technical, teamwork/leadership, one curveball):
### <question>
- **Why they ask:** one line
- **Your answer outline:** 3 bullets using real stories from my CV and profile (never invent; write [ADD: …])
## Questions to ask them (3)
## The day before (5-point checklist)

${ctx(r)}

${meAndCv()}`, .5, p.id); }
async function eligibility(p){ const r = rowOf(p.id); if (!r) return { ok: false, error: 'not_found' };
  const ans = await gemini([{ text: `Judge honestly whether I'm a good candidate for this opportunity before I spend time applying.
Use only facts from my profile; if something important is unknown, say what to check. Reply with ONLY JSON:
{"verdict": "Strong" | "Possible" | "Long shot", "reasons": [2-4 short strings], "gaps": [0-3 short strings], "tip": "one sentence"}

${ctx(r)}

${meAndCv()}` }], { json: true, temperature: .2, fast: true });
  const j = parseJson(ans.text); if (!j || !j.verdict) return { ok: false, error: 'Could not read the answer. Try again.' };
  const summary = j.verdict + ' · ' + (j.reasons || []).join('; ') + ((j.gaps || []).length ? ' · Check: ' + j.gaps.join('; ') : '') + (j.tip ? ' · Tip: ' + j.tip : '');
  handleSync({ action: 'update', id: p.id, fields: { Eligibility: summary } });
  return { ok: true, verdict: j.verdict, reasons: j.reasons || [], gaps: j.gaps || [], tip: j.tip || '', summary };
}
async function review(p){
  const draft = String(p.draft || '').trim(); if (draft.split(/\s+/).length < 20) return { ok: false, error: 'Paste at least a paragraph of your draft.' };
  const r = p.id ? rowOf(p.id) : null, words = draft.split(/\s+/).filter(Boolean).length;
  const ans = await gemini([{ text: `Review my application essay draft like a kind but honest mentor. Plain text with short headings in CAPS, no markdown symbols.
ANSWERS THE QUESTION? yes / partly / no, and why (2 sentences).
TOP 3 FIXES: numbered, each quoting the sentence to change and giving a rewrite.
WHAT WORKS: 1-2 things to keep.
LENGTH: my draft is ${words} words${p.words ? ', limit ' + p.words : ''}; say what to cut or add.
Never invent facts about me.

${p.question ? 'QUESTION: ' + p.question + '\n' : ''}${r ? ctx(r) + '\n' : ''}
MY DRAFT:
${draft.slice(0, 12000)}` }], { temperature: .4 });
  return { ok: true, text: ans.text, words };
}
/* minimal .docx reader: find word/document.xml in the zip and inflate it */
async function docxText(b64){
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dv = new DataView(u.buffer); let eocd = -1; for (let i = u.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if (eocd < 0) return ''; let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true);
  for (let k = 0; k < n; k++){
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    if (name === 'word/document.xml'){
      const lnl = dv.getUint16(off + 26, true), lxl = dv.getUint16(off + 28, true), data = u.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csize);
      let xml = method === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nl + xl + cl;
  }
  return '';
}
async function uploadCv(p){
  if (!p.base64) return { ok: false, error: 'No file received.' };
  const name = String(p.name || 'cv').toLowerCase(), mime = String(p.mime || ''), parts = [];
  if (/\.docx$/.test(name) || mime.indexOf('wordprocessingml') >= 0) parts.push({ text: 'MY CV (from a Word file):\n' + (await docxText(p.base64)).slice(0, 20000) });
  else if (/\.(txt|md)$/.test(name) || mime.indexOf('text/') === 0) parts.push({ text: 'MY CV:\n' + decodeURIComponent(escape(atob(p.base64))).slice(0, 20000) });
  else if (mime === 'application/pdf' || /\.pdf$/.test(name) || mime.indexOf('image/') === 0) parts.push({ inline_data: { mime_type: mime || 'application/pdf', data: p.base64 } });
  else return { ok: false, error: 'Upload a PDF, Word (.docx) or photo of your CV.' };
  if (!key()){ if (parts[0].text){ handleSync({ action: 'doc', key: 'master-cv', title: 'Master CV', body: parts[0].text.replace(/^MY CV[^\n]*\n/, ''), mode: 'replace' }); return { ok: true, url: 'local:master-cv' }; } return { ok: false, error: 'Reading a PDF or photo needs your free Gemini key (Me → Setup & backup). Or upload a Word file.' }; }
  parts.unshift({ text: 'Turn this CV into clean simple markdown: "# Full name", a contact line, then "## " sections with "- " bullets and **bold** for roles and institutions. Keep EVERY fact exactly as written. Output only the markdown.' });
  const ans = await gemini(parts, { temperature: .1, fast: true });
  handleSync({ action: 'doc', key: 'master-cv', title: 'Master CV', body: ans.text, mode: 'replace' });
  return { ok: true, url: 'local:master-cv' };
}
async function cvAdd(p){
  const update = String(p.text || '').trim(); if (!update) return { ok: false, error: 'Describe what you did first.' };
  const cv = docText('master-cv'); if (!cv.trim()) return { ok: false, error: 'Upload your CV first.' };
  const ans = await gemini([{ text: `Here is my CV and something new I've done. Add it in the right section, as a strong, honest CV line in the CV's existing style. Change nothing else. ${NO_INVENT}
Reply in this exact format:
<the full updated CV in simple markdown>
===CHANGES===
- 1–3 bullets describing what you added

NEW: ${update}

MY CV:
${cv.slice(0, 12000)}` }], { temperature: .2, fast: true });
  const sp = ans.text.split('===CHANGES==='); if (sp.length < 2 || sp[0].trim().length < 200) return { ok: false, error: 'Could not update the CV this time. Try again.' };
  handleSync({ action: 'doc', key: 'master-cv', title: 'Master CV', body: sp[0].trim(), mode: 'replace' });
  return { ok: true, url: 'local:master-cv', changes: sp[1].trim() };
}
async function setKey(p){
  const k = String(p.key || '').trim(); if (!k) return { ok: false, error: 'Paste your Gemini API key first.' };
  let list = []; try { list = await listModels(k); } catch(e){ return { ok: false, error: 'You\'re offline. Connect to check the key.' }; }
  if (!list.length) return { ok: false, error: 'That key did not work. Check you copied all of it.' };
  LSx.set('ftl-key', k); LSx.set('ftl-models', { list, at: Date.now() }); return { ok: true, model: list[0] };
}

async function handle(req){
  try {
    if (req.action === 'dashboard') return dashboard();
    if (req.action === 'capture'){ return { ok: true, id: addRow(req) }; }
    const s = handleSync(req); if (s) return s;
    const A = { process, essay, tailor, interview, eligibility, review, uploadCv, cvAdd, setKey };
    if (A[req.action]) return await A[req.action](req);
    return { ok: false, error: 'not available without the Google sheet' };
  } catch(e){ return { ok: false, error: String(e.message || e) === 'no_key' ? 'no_key' : String(e.message || e) }; }
}

/* ---------------- in-app documents (instead of Google Docs) ---------------- */
function md(s){
  const lines = String(s || '').split('\n'); let out = '', list = false;
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[ADD:([^\]]*)\]/g, '<mark>[ADD:$1]</mark>');
  for (const l of lines){
    const h = /^(#{1,3})\s+(.*)/.exec(l), b = /^\s*[-*]\s+(.*)/.exec(l) || /^\s*\d+\.\s+(.*)/.exec(l);
    if (b){ if (!list){ out += '<ul>'; list = true; } out += '<li>' + inline(b[1]) + '</li>'; continue; }
    if (list){ out += '</ul>'; list = false; }
    if (h) out += `<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`;
    else if (/^---+$/.test(l.trim())) out += '<hr>';
    else if (l.trim()) out += '<p>' + inline(l) + '</p>';
  }
  return out + (list ? '</ul>' : '');
}
function showDoc(k){
  const x = db().docs[k]; if (!x || !UI){ UI && UI.toast('That document isn\'t on this phone.'); return; }
  UI.openSheet(`<div class="sheet-head"><h3>${esc(x.title)}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body ftl-doc">${md(x.body)}
    <div class="row"><button class="btn primary" data-ftl="copydoc" data-k="${esc(k)}">Copy all</button><button class="btn" data-ftl="savedoc" data-k="${esc(k)}">Save as file</button></div>
    <div class="note">Kept on this phone. Copy it into Google Docs or Word to edit and submit.</div></div>`);
}

/* ---------------- backup files ---------------- */
function backupJson(){
  const keep = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (/^ft/.test(k) && k !== 'ftl-key' && k !== 'ft-dash') keep[k] = localStorage.getItem(k); }
  return JSON.stringify({ app: 'Follow-Through', v: 1, at: new Date().toISOString(), data: keep });
}
function download(name, text){
  if (isAndroid() && Android.saveFile){ Android.saveFile(name, 'application/json', text); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
}
function restore(text){
  const j = JSON.parse(text); if (!j || j.app !== 'Follow-Through' || !j.data) throw new Error('That isn\'t a Follow-Through backup file.');
  Object.keys(j.data).forEach(k => { try { localStorage.setItem(k, j.data[k]); } catch(e){} });
  return Object.keys(j.data).length;
}

/* ---------------- moving phone data into a newly connected sheet ---------------- */
async function migrate(call){
  const d = db(); let moved = 0;
  for (const r of d.rows){
    const c = await call({ action: 'capture', title: r.Title, url: r.Link, app: r['Saved from'], screenText: r['Screen text'] || '', note: r.Notes || '' });
    if (!c.ok) throw new Error('Stopped after ' + moved + ': ' + (c.error || 'network'));
    const f = {}; ['Status', 'Category', 'Organisation', 'Type', 'Deadline', 'Remind on', 'Requirements', 'What it offers', 'Outcome', 'Applied on', 'Eligibility'].forEach(k => { if (r[k]) f[k] = r[k]; });
    if (Object.keys(f).length) await call({ action: 'update', id: c.id, fields: f });
    moved++;
  }
  for (const k of Object.keys(d.docs)) if (k === 'master-cv' || k === 'about-me') await call({ action: 'doc', key: k, title: d.docs[k].title, body: d.docs[k].body, mode: 'replace' });
  LSx.set('ftl-db-moved', d); localStorage.removeItem(DB_KEY);
  return moved;
}

/* ---------------- the Google-sheet wizard (optional upgrade) ---------------- */
const W_STEPS = 5;
let wStep = 0;
function wizard(step){
  wStep = step ?? wStep;
  const dots = Array.from({ length: W_STEPS }, (_, i) => `<i class="${i <= wStep ? 'on' : ''}"></i>`).join('');
  const S = [
    { t: 'Copy the code', b: `<p>Your sheet is run by a small script in <b>your own</b> Google account. First, copy it.</p><div class="row"><button class="btn primary" data-ftl="copycode">📋 Copy the code</button></div><div class="note" id="ftl-msg"></div>` },
    { t: 'Paste it into Apps Script', b: `<p>Tap below to open Google Apps Script (sign in with your Google account). If it looks squashed, switch your browser to <b>Desktop site</b>.</p><div class="row"><button class="btn primary" data-ftl="openscript">Open Apps Script ↗</button></div><ol><li>Press and hold in the code box → <b>Select all</b>.</li><li>Paste (it replaces the sample).</li><li>Tap the 💾 <b>Save</b> icon.</li></ol>` },
    { t: 'Say yes to Google', b: `<ol><li>In the bar above the code, pick <b>authorize</b> from the list, then tap <b>▶ Run</b>.</li><li><b>Review permissions</b> → choose your account.</li><li>Google warns "<i>hasn't verified this app</i>". That's normal: it's your own script. Tap <b>Advanced</b> → <b>Go to … (unsafe)</b> → <b>Allow</b>.</li></ol><p class="note">Nobody else gets access. The script only touches the tracker sheet it creates for you.</p>` },
    { t: 'Turn it on', b: `<ol><li>Tap <b>Deploy</b> (top right) → <b>New deployment</b>.</li><li>Tap ⚙ next to "Select type" → <b>Web app</b>.</li><li><b>Execute as:</b> Me. <b>Who has access:</b> <b>Anyone</b>.</li><li>Tap <b>Deploy</b>, then <b>Copy</b> the Web app URL (it ends in <code>/exec</code>).</li></ol>` },
    { t: 'Paste your link', b: `<p>Come back here with the link copied.</p><input id="ftl-url" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"><div class="row"><button class="btn" data-ftl="paste">Paste</button><button class="btn primary" data-ftl="connect">Connect</button></div><div class="note" id="ftl-msg"></div>` },
  ];
  const s = S[wStep];
  UI.openSheet(`<div class="sheet-head"><h3>Google sheet · step ${wStep + 1} of ${W_STEPS}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body ftl-wiz"><div class="ftl-dots">${dots}</div><h4>${s.t}</h4>${s.b}
    <div class="row" style="justify-content:space-between;margin-top:8px">${wStep ? '<button class="btn ghost" data-ftl="back">← Back</button>' : '<span></span>'}${wStep < W_STEPS - 1 ? '<button class="btn primary" data-ftl="next">Done, next →</button>' : ''}</div>
    <div class="note">Stuck? Send a screenshot of where you are to whoever invited you. You can keep using the app meanwhile.</div></div>`);
}
async function connectUrl(url){
  const msg = document.getElementById('ftl-msg');
  url = String(url || '').trim().replace(/\?.*$/, '');
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)){ msg.textContent = 'That doesn\'t look right. It should start with https://script.google.com/ and end with /exec.'; return; }
  msg.textContent = 'Testing…';
  const ok = await new Promise(res => {
    if (isAndroid() && Android.connectSheet){ const id = 'cs' + (++seq); pending[id] = r => res(r); Android.connectSheet(url, id); }
    else if (window.__ftwSetUrl) window.__ftwSetUrl(url).then(res);
    else res({ ok: false, text: 'no bridge' });
  });
  if (!ok.ok && !(ok.status === 200)){ msg.textContent = '✕ ' + (ok.text || 'Couldn\'t reach it. Check "Who has access" is Anyone, then try again.'); return; }
  const n = db().rows.length;
  if (n){ msg.textContent = `✓ Connected! Moving your ${n} saved item${n > 1 ? 's' : ''} into your sheet…`;
    try { const moved = await migrate(r => UI.rawCall(r)); msg.textContent = `✓ Connected, and ${moved} item${moved === 1 ? '' : 's'} moved into your sheet.`; } catch(e){ msg.textContent = '✓ Connected. ' + e.message + '. Your phone copy is kept; try again from Me.'; } }
  else msg.textContent = '✓ Connected to your Google sheet!';
  setTimeout(() => { UI.closeSheet(); UI.load(); }, 1600);
}

/* ---------------- Setup & backup card (Me) ---------------- */
function meCard(){
  const n = db().rows.length;
  return `<section><div class="sh"><h2>Setup &amp; backup</h2><small>${connected() ? 'Google sheet connected' : 'everything on this phone'}</small></div>
    <div class="card ftl-me">
      ${connected() ? `<p>✓ Saving to <b>your Google sheet</b>: backups, morning emails and Google Docs are on.</p>`
        : `<p>📱 <b>Instant mode:</b> your ${n} item${n === 1 ? '' : 's'} and notes live on this phone. Back up now and then, or connect a free Google sheet for automatic backup, morning emails and Google Docs.</p>
      <div class="row"><button class="btn primary" data-ftl="wizard">Connect a Google sheet</button></div>
      <label class="note" for="ftl-key">Free AI key (sorting, essays, CV). <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" data-ftl-ext>Get one here ↗</a>: tap <b>Create API key</b>, copy, paste below.</label>
      <div class="row"><input id="ftl-key" placeholder="${key() ? '✓ key saved (paste to replace)' : 'Paste your key'}" autocomplete="off" style="flex:1"><button class="btn" data-ftl="savekey">Save key</button></div>
      <div class="note" id="ftl-keymsg">${key() ? '✓ AI is on.' : 'Without a key, everything works except the AI parts.'}</div>`}
      ${!connected() && window.Android && Android.web && /iPhone|iPad/.test(navigator.userAgent) ? `<details class="ftl-ios"><summary><b>Save from any app on iPhone</b> (3-step shortcut)</summary><ol>
        <li>Open <b>Shortcuts</b> → <b>＋</b> → name it <b>Save to Bisi</b> → tap ⓘ → turn on <b>Show in Share Sheet</b>.</li>
        <li>Add the action <b>URL</b> and type <code>${esc(SITE)}?add=</code>, then tap after <code>add=</code> and choose <b>Shortcut Input</b>.</li>
        <li>Add <b>Open URLs</b>. Done! Now in Safari, Instagram or WhatsApp: <b>Share → Save to Bisi</b>.</li></ol></details>` : ''}
      <div class="row"><button class="btn small" data-ftl="backup">Download a backup</button><label class="btn small" for="ftl-restore">Restore a backup</label><input id="ftl-restore" type="file" accept=".json,application/json" hidden></div>
    </div></section>`;
}
function setupChoice(){   // used by the welcome flow
  return `<div class="ftl-choice">
    <button class="btn primary onb-ok" data-ftl="instant">⚡ Start now</button>
    <p class="onb-note">Works straight away. Everything stays on this phone. You can add a Google sheet later for backup and emails.</p>
    <button class="btn" data-ftl="wizard">Use my Google sheet (10 min)</button>
  </div>`;
}

/* ---------------- clicks ---------------- */
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-ftl]'); if (!b || !UI) return;
  const a = b.dataset.ftl, msg = () => document.getElementById('ftl-msg');
  if (a === 'wizard'){ if (window.FTWelcome && FTWelcome.isOpen()) FTWelcome.close(); wizard(0); return; }
  if (a === 'next'){ wizard(Math.min(W_STEPS - 1, wStep + 1)); return; }
  if (a === 'back'){ wizard(Math.max(0, wStep - 1)); return; }
  if (a === 'copycode'){ try { const r = await getJson(SITE + 'Code.gs'); if (r.status !== 200) throw 0; UI.copy(r.text); msg().textContent = '✓ Copied. Next, paste it into Apps Script.'; } catch(err){ msg().textContent = 'Couldn\'t download the code. Check your internet and try again.'; } return; }
  if (a === 'openscript'){ UI.open('https://script.google.com/home/projects/create'); return; }
  if (a === 'paste'){ let t = ''; try { t = isAndroid() && Android.clipText ? Android.clipText() : await navigator.clipboard.readText(); } catch(err){} const inp = document.getElementById('ftl-url'); if (t && inp) inp.value = t.trim(); else msg().textContent = 'Press and hold in the box → Paste.'; return; }
  if (a === 'connect'){ connectUrl((document.getElementById('ftl-url') || {}).value); return; }
  if (a === 'savekey'){ const k = (document.getElementById('ftl-key') || {}).value, m = document.getElementById('ftl-keymsg'); m.textContent = 'Checking…'; const r = await setKey({ key: k }); m.textContent = r.ok ? '✓ AI is on (' + r.model + ').' : '✕ ' + r.error; if (r.ok) UI.load(); return; }
  if (a === 'backup'){ download('follow-through-backup-' + today() + '.json', backupJson()); UI.toast('Backup saved to your downloads 🐝'); return; }
  if (a === 'copydoc'){ const x = db().docs[b.dataset.k]; if (x) UI.copy(x.body); return; }
  if (a === 'savedoc'){ const x = db().docs[b.dataset.k]; if (x){ if (isAndroid() && Android.saveFile) Android.saveFile(x.title.replace(/[^\w ]+/g, '') + '.md', 'text/markdown', x.body); else { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([x.body], { type: 'text/markdown' })); l.download = x.title + '.md'; l.click(); } } return; }
  if (a === 'instant'){ LSx.set('ftl-chosen', 1); if (window.FTWelcome) FTWelcome.step('profile'); UI.load(); return; }
}, true);
document.addEventListener('change', async e => {
  if (e.target.id !== 'ftl-restore' || !e.target.files[0]) return;
  try { const n = restore(await e.target.files[0].text()); UI.toast(`Restored ${n} parts of your data 🐝`); UI.load(); } catch(err){ UI.toast(err.message); }
  e.target.value = '';
});

const STYLE = `
.ftl-wiz h4{font-family:var(--f-d);font-size:1.4rem;margin:4px 0}.ftl-wiz ol{padding-left:20px;margin:6px 0}.ftl-wiz li{margin-bottom:6px}
.ftl-dots{display:flex;gap:6px}.ftl-dots i{flex:1;height:6px;border-radius:3px;background:var(--line)}.ftl-dots i.on{background:var(--sun)}
.ftl-doc h3,.ftl-doc h4,.ftl-doc h5{margin:12px 0 4px}.ftl-doc ul{padding-left:20px}.ftl-doc mark{background:var(--sun-soft);color:inherit;border-radius:4px}
.ftl-me p{margin:0 0 10px}.ftl-ios{margin:6px 0 10px;font-size:14px}.ftl-ios ol{padding-left:20px}.ftl-ios code{overflow-wrap:anywhere}.ftl-choice{display:flex;flex-direction:column;gap:8px;align-items:stretch;max-width:340px;margin:0 auto}
`;
function takeAddParam(){
  try {
    const u = new URL(location.href), t = u.searchParams.get('add'); if (!t) return;
    u.searchParams.delete('add'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    const link = (t.match(/https?:\/\/\S+/) || [])[0] || '';
    handle({ action: 'capture', app: 'iPhone share', url: link, screenText: t }).then(() => { UI && UI.toast('Saved to Bisi 🐝'); UI && UI.load(); });
  } catch(e){}
}
function init(h){ UI = h; if (active()) setTimeout(takeAddParam, 300); const s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s); }
window.FTLocal = { init, active, handle, showDoc, meCard, setupChoice, wizard, _md: md, _db: db, _docx: docxText };
})();
