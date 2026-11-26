/* Event follow-ups: Going? · Registered? (+ ticket) · day-before prep card · networking cheat sheet ·
 * "Did you go?" · recap (people, learnings, opportunities → captures) · people-you-met follow-ups · rating ·
 * event stats · next-year reminder. State lives on the phone (ft-ev); key outcomes are also written to the
 * event's row in the sheet (Status/Outcome/Notes) so they survive and the scout can learn from ratings. */
(() => {
const LS = {
  get(){ try { return JSON.parse(localStorage.getItem('ft-ev') || '{}'); } catch(e){ return {}; } },
  set(v){ try { localStorage.setItem('ft-ev', JSON.stringify(v)); } catch(e){} }
};
let H = null;   // dashboard helpers
const st = id => (LS.get()[id] || {});
const put = (id, patch) => { const all = LS.get(); all[id] = Object.assign(all[id] || {}, patch); LS.set(all); return all[id]; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const isEvent = r => r && r.Category === 'Event';
const isOnline = r => /\b(online|virtual|zoom|google meet|meet\.google|teams|webinar|livestream|youtube|x spaces|twitter spaces)\b/i.test([r.Notes, r.Title, r.Link, r['Screen text']].join(' '));
function venue(r){
  const n = String(r.Notes || '');
  const m = /(?:venue|location|where|address)\s*[:\-]\s*([^\n·;]+)/i.exec(n) || /\bat\s+([A-Z][^\n·;,.]{4,60}(?:,\s*[A-Z][^\n·;.]{2,30})?)/.exec(n);
  return m ? m[1].trim() : '';
}
function timeOf(r){ const m = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i.exec(String(r.Notes || '')) || /\b(\d{1,2}:\d{2})\b/.exec(String(r.Notes || '')); return m ? m[1] : ''; }
const mapUrl = r => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((venue(r) || r.Title) + ' Lagos');
const islandish = s => /\b(island|lekki|v\.?i\.?|victoria|ikoyi|ajah|oniru|eko)\b/i.test(s || '');

/* ---------- my intro + conversation starters (from the profile, no AI needed) ---------- */
function cheat(r){
  const p = window.FTWelcome ? FTWelcome.profile() : {};
  const me = p.nickname || p.name || 'I';
  const bits = [p.level, p.course].filter(Boolean).join(' ');
  const intro = `Hi, I'm ${me}${bits ? ', a ' + bits + ' student' : ''}${p.school ? ' at ' + p.school : ''}${p.interests ? '. I’m into ' + p.interests.split(',').slice(0, 2).join(' and ').toLowerCase() : ''}.`;
  const t = r.Title || 'this event';
  const starters = [`What brought you to ${t}?`, 'What are you working on right now?', p.interests ? `Do you know any good ${p.interests.split(',')[0].trim().toLowerCase()} communities or programmes in Lagos?` : 'Any communities or programmes you’d recommend for students?', 'What’s one thing you wish you knew when you were a student?'];
  return { intro, starters };
}

/* ---------- panel inside the event's detail sheet ---------- */
function panel(r){
  if (!isEvent(r)) return '';
  const s = st(r.ID), d = H.days(r.Deadline), past = d !== null && d < 0, soon = d !== null && d >= 0 && d <= 1;
  const rsvp = s.rsvp || '';
  const ch = cheat(r);
  return `<div class="ev card">
    ${!past ? `<div class="ev-h">Are you going?</div>
      <div class="ev-opts">${['Going', 'Maybe', 'Not going'].map(k => `<button data-ev="rsvp" data-v="${k}" data-id="${esc(r.ID)}" aria-pressed="${rsvp === k}">${k}</button>`).join('')}</div>
      ${rsvp !== 'Not going' ? `<div class="ev-h">Registered?</div>
        <div class="ev-opts"><button data-ev="reg" data-v="yes" data-id="${esc(r.ID)}" aria-pressed="${!!s.reg}">Yes ✓</button><button data-ev="reg" data-v="no" data-id="${esc(r.ID)}" aria-pressed="${s.reg === false}">Not yet</button>
        ${r.Link ? `<button data-ev="open" data-url="${esc(r.Link)}">Register page ↗</button>` : ''}</div>
        ${s.reg ? `<label class="note">Ticket or confirmation link <input class="ev-in" data-ev-ticket="${esc(r.ID)}" value="${esc(s.ticket || '')}" placeholder="Paste it so it's one tap away on the day"></label>` : ''}` : ''}` : ''}
    ${!past && rsvp !== 'Not going' ? `<details ${soon ? 'open' : ''}><summary>Prep card</summary>${prep(r, true)}</details>
      <details><summary>Networking cheat sheet</summary><p class="ev-intro">“${esc(ch.intro)}”</p><ol class="ev-list">${ch.starters.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <button class="btn small" data-ev="copyintro" data-id="${esc(r.ID)}">Copy my intro</button></details>` : ''}
    ${past || s.attended ? attendedBlock(r, s) : ''}
  </div>`;
}
function prep(r, inSheet){
  const s = st(r.ID), online = isOnline(r), v = venue(r), t = timeOf(r);
  const bring = s.bring || (online ? ['Charged laptop or phone', 'Earphones', 'Notebook', 'Quiet spot + data'] : ['ID card', 'Charged phone + power bank', 'Notebook & pen', 'A few printed CVs', 'Water + small chops']);
  const leave = !online && t ? (islandish(v + ' ' + r.Title) ? 'Island traffic: leave about 2 hours early.' : 'Lagos traffic: leave about 90 minutes early.') : '';
  return `<div class="ev-prep">
    <div><b>${H.fmt(r.Deadline)}${t ? ' · ' + esc(t) : ''}</b> ${online ? '· online' : v ? '· ' + esc(v) : ''}</div>
    ${leave ? `<div class="note">🚦 ${leave}</div>` : ''}
    <div class="row">${online ? (r.Link ? `<button class="btn small primary" data-ev="open" data-url="${esc(s.ticket || r.Link)}">Join link</button>` : '') : `<button class="btn small primary" data-ev="open" data-url="${esc(mapUrl(r))}">Directions</button>`}${s.ticket ? `<button class="btn small" data-ev="open" data-url="${esc(s.ticket)}">My ticket</button>` : ''}</div>
    <div class="note" style="margin-top:6px">What to bring</div>
    <ul class="ev-list">${bring.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>`;
}
function attendedBlock(r, s){
  if (s.attended === 'Attended') return `<div class="ev-h">You went ✓</div>
    ${s.rating ? `<div class="note">You rated it ${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}</div>` : ''}
    ${(s.people || []).length ? `<div class="note">People you met: ${(s.people || []).map(p => esc(p.name)).join(', ')}</div>` : ''}
    <div class="row"><button class="btn small" data-ev="recap" data-id="${esc(r.ID)}">${s.recap ? 'Edit recap' : 'Write a quick recap'}</button><button class="btn small" data-ev="person" data-id="${esc(r.ID)}">+ Someone I met</button></div>`;
  if (s.attended) return `<div class="note">Marked as ${esc(s.attended.toLowerCase())}.</div>`;
  return `<div class="ev-h">Did you go?</div><div class="ev-opts">${['Attended', 'Missed', 'Cancelled'].map(k => `<button data-ev="went" data-v="${k}" data-id="${esc(r.ID)}">${k}</button>`).join('')}</div>`;
}

/* ---------- Today cards: prep (today/tomorrow), "Are you going?", "Did you go?" ---------- */
function todayCards(rows){
  const out = [];
  const evs = rows.filter(r => isEvent(r) && r.Status !== 'Suggested' && r.Outcome !== 'Deleted');
  for (const r of evs){
    const s = st(r.ID), d = H.days(r.Deadline);
    if (d === null) continue;
    if (d < 0 && d >= -4 && !s.attended && s.rsvp !== 'Not going' && r.Status !== 'Closed')
      out.push([0, `<div class="card ev-card"><b>Did you go to ${esc(r.Title)}?</b><div class="ev-opts">${['Attended', 'Missed', 'Cancelled'].map(k => `<button data-ev="went" data-v="${k}" data-id="${esc(r.ID)}">${k}</button>`).join('')}</div></div>`]);
    else if (d >= 0 && d <= 1 && s.rsvp !== 'Not going' && r.Status !== 'Closed')
      out.push([1, `<div class="card ev-card"><div class="ev-tag">${d === 0 ? 'TODAY' : 'TOMORROW'}</div><b>${esc(r.Title)}</b>${!s.reg ? `<div class="note" style="color:var(--rose)">Not registered yet!</div>` : ''}${prep(r)}<button class="btn small ghost" data-open="${esc(r.ID)}">Details & cheat sheet</button></div>`]);
    else if (d >= 2 && d <= 21 && !s.rsvp && r.Status !== 'Closed')
      out.push([2, `<div class="card ev-card"><b>${esc(r.Title)}</b><div class="note">${H.fmt(r.Deadline)} · are you going?</div><div class="ev-opts">${['Going', 'Maybe', 'Not going'].map(k => `<button data-ev="rsvp" data-v="${k}" data-id="${esc(r.ID)}">${k}</button>`).join('')}</div></div>`]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, 3).map(x => x[1]).join('');
}

/* ---------- actions ---------- */
const noteLine = (r, line) => ((r.Notes || '').trim() ? r.Notes.trim() + '\n' : '') + line;
async function save(r, fields, msg){ Object.assign(r, fields); H.render(); const j = await H.call({ action:'update', id: r.ID, fields }); if (!j.ok) H.toast("Couldn't reach your sheet. Saved on your phone."); else if (msg) H.toast(msg); }
async function rsvp(r, v){
  put(r.ID, { rsvp: v }); H.active();
  if (v === 'Not going'){
    const w = await H.askWhy(r, 'skipping');
    await save(r, { Status:'Closed', Outcome:'Not going', 'Remind on':'', Notes: noteLine(r, `Not going (${H.iso(H.today())})${w ? ': ' + w.reason + (w.note ? ' · ' + w.note : '') : ''}`) }, 'Okay, skipping it. 🐝');
    if (w && H.logWhy) H.logWhy(r, w);
  } else { H.toast(v === 'Going' ? "Yay! I'll remind you the day before. 🐝" : 'Maybe it is. I’ll check again closer to the day.'); H.render(); }
  if (H.current() && H.current().ID === r.ID) H.openItem(r.ID);
}
async function reg(r, yes){
  put(r.ID, { reg: yes }); H.active();
  if (yes) await save(r, { Notes: noteLine(r, `Registered ✓ (${H.iso(H.today())})`) }, 'Registered! Paste your ticket link so it’s handy. 🎟️');
  else { H.toast("Do it today. Spots fill up. I'll keep asking. 🐝"); H.render(); }
  if (H.current() && H.current().ID === r.ID) H.openItem(r.ID);
}
async function went(r, v){
  put(r.ID, { attended: v }); H.active();
  if (v === 'Attended'){
    await save(r, { Status:'Closed', Outcome:'Attended', 'Remind on':'', Notes: noteLine(r, `Attended (${H.iso(H.today())})`) });
    recapSheet(r, true);
  } else {
    const w = v === 'Missed' ? await H.askWhy(r, 'missing') : null;
    await save(r, { Status:'Closed', Outcome: v, 'Remind on':'', Notes: noteLine(r, `${v} (${H.iso(H.today())})${w ? ': ' + w.reason + (w.note ? ' · ' + w.note : '') : ''}`) }, v === 'Missed' ? 'Noted. Next one, we go. 🐝' : 'Cancelled. Noted.');
    if (w && H.logWhy) H.logWhy(r, w);
  }
}
const annual = r => /\b(20\d\d|annual|edition|summit|conference|week|fest|festival|\d+\.0)\b/i.test(r.Title || '');
function recapSheet(r, fresh){
  const s = st(r.ID), rc = s.recap || {};
  H.openSheet(`<div class="sheet-head"><h3>${fresh ? 'How was it? 🐝' : 'Your recap'}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body ev-recap">
      <div class="note"><b>${esc(r.Title)}</b></div>
      <div><div class="ev-h">Rate it</div><div class="ev-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" data-star="${n}" aria-checked="${(s.rating || 0) >= n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div></div>
      <label>Who did you meet? <textarea id="rc-who" rows="2" placeholder="Names, roles…">${esc(rc.who || '')}</textarea></label>
      <label>What did you learn? <textarea id="rc-learn" rows="2" placeholder="One or two things worth remembering">${esc(rc.learn || '')}</textarea></label>
      <label>Any opportunities mentioned? <small>One per line: Bisi adds each to your tracker</small><textarea id="rc-opps" rows="2" placeholder="e.g. Google Africa Developer Scholarship opens in January">${esc(rc.opps || '')}</textarea></label>
      ${annual(r) ? `<label class="ev-check"><input type="checkbox" id="rc-next" ${s.nextYear === false ? '' : 'checked'}> Remind me when next year's edition opens</label>` : ''}
      <button class="btn primary" id="rc-save">Save recap</button>
      <button class="btn small" data-ev="person" data-id="${esc(r.ID)}">+ Add someone I met (for a follow-up)</button>
    </div>`);
  let rating = s.rating || 0;
  document.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { rating = +b.dataset.star; document.querySelectorAll('[data-star]').forEach(x => x.setAttribute('aria-checked', +x.dataset.star <= rating)); });
  document.getElementById('rc-save').onclick = async () => {
    const recap = { who: document.getElementById('rc-who').value.trim(), learn: document.getElementById('rc-learn').value.trim(), opps: document.getElementById('rc-opps').value.trim() };
    const nx = document.getElementById('rc-next'), nextYear = nx ? nx.checked : false;
    put(r.ID, { recap, rating, nextYear });
    H.closeSheet();
    const line = `Recap: ${rating ? 'rated ' + rating + '/5' : 'not rated'}${recap.learn ? ' · learned: ' + recap.learn.replace(/\n/g, '; ') : ''}${recap.who ? ' · met: ' + recap.who.replace(/\n/g, '; ') : ''}`;
    await save(r, { Notes: noteLine(r, line) }, 'Recap saved. 🐝');
    const opps = recap.opps.split('\n').map(x => x.trim()).filter(Boolean);
    for (const o of opps){ const m = /https?:\/\/\S+/.exec(o); await H.call({ action:'capture', app:'Event recap: ' + (r.Title || ''), url: m ? m[0] : '', screenText: 'Mentioned at ' + (r.Title || 'an event') + ': ' + o, note: o }); }
    if (opps.length){ H.toast(`Added ${opps.length} opportunit${opps.length === 1 ? 'y' : 'ies'} to your tracker. Sorting…`); H.load(); }
    if (nextYear && annual(r)) nextYearNote(r);
  };
}
function nextYearNote(r){
  if (!(window.Android && Android.notesSave)) return;
  const dl = H.parse(r.Deadline) || H.today(); const at = new Date(dl); at.setFullYear(at.getFullYear() + 1); at.setDate(at.getDate() - 45); at.setHours(10, 0, 0, 0);
  if (at < new Date()) return;
  Android.notesSave(JSON.stringify({ text: `Next ${(r.Title || 'event').replace(/\b20\d\d\b/, '').trim()} is coming up\nIt was on ${H.fmt(r.Deadline)} last year. Watch for registration!`, items: [], color: 'sky', pinned: false, remindAt: at.getTime(), done: false }));
}
function personSheet(r){
  H.openSheet(`<div class="sheet-head"><h3>Someone you met</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body ev-recap">
      <label>Name <input class="ev-in" id="pp-name" placeholder="e.g. Tunde Adeyemi"></label>
      <label>Role / company <input class="ev-in" id="pp-role" placeholder="e.g. ML engineer at Paystack"></label>
      <label>LinkedIn or contact <input class="ev-in" id="pp-link" placeholder="Profile link, email or @handle"></label>
      <label>What you talked about <input class="ev-in" id="pp-topic" placeholder="e.g. robotics internships"></label>
      <button class="btn primary" id="pp-save">Save & remind me to follow up</button>
    </div>`);
  document.getElementById('pp-save').onclick = () => {
    const p = { name: document.getElementById('pp-name').value.trim(), role: document.getElementById('pp-role').value.trim(), link: document.getElementById('pp-link').value.trim(), topic: document.getElementById('pp-topic').value.trim() };
    if (!p.name) return H.toast('Add their name first.');
    const s = st(r.ID); put(r.ID, { people: (s.people || []).concat(p) });
    const me = window.FTWelcome ? (FTWelcome.profile().nickname || '') : '';
    const msg = `Hi ${p.name.split(' ')[0]}, it was great meeting you at ${r.Title}${p.topic ? ' and talking about ' + p.topic : ''}! I'm ${me || '[your name]'}${me ? '' : ''}. I'd love to stay in touch${p.topic ? ' and hear more about ' + p.topic : ''}.`;
    if (window.Android && Android.notesSave){
      const at = new Date(); at.setDate(at.getDate() + 1); at.setHours(18, 0, 0, 0);
      Android.notesSave(JSON.stringify({ text: `Message ${p.name}${p.role ? ' (' + p.role + ')' : ''}\nMet at ${r.Title}.${p.link ? '\n' + p.link : ''}\n\nDraft:\n${msg}`, items: [], color: 'mint', pinned: false, remindAt: at.getTime(), done: false }));
    }
    save(r, { Notes: noteLine(r, `Met: ${p.name}${p.role ? ' (' + p.role + ')' : ''}${p.link ? ' · ' + p.link : ''}`) }, `Saved. I'll remind you tomorrow evening to message ${p.name.split(' ')[0]}, with a draft. 🐝`);
    H.closeSheet();
  };
}

/* ---------- History: events stats ---------- */
function stats(rows){
  const all = LS.get(), evs = rows.filter(isEvent);
  const attended = evs.filter(r => r.Outcome === 'Attended' || (all[r.ID] || {}).attended === 'Attended');
  const people = Object.values(all).reduce((a, s) => a + ((s && s.people) || []).length, 0);
  const rated = Object.values(all).filter(s => s && s.rating), avg = rated.length ? (rated.reduce((a, s) => a + s.rating, 0) / rated.length).toFixed(1) : '';
  if (!evs.length) return '';
  return `<section><div class="sh"><h2>Events</h2><small>${evs.length} saved</small></div>
    <div class="card ev-stats"><div><b>${attended.length}</b><small>attended</small></div><div><b>${people}</b><small>people met</small></div><div><b>${avg || '–'}</b><small>avg rating</small></div></div></section>`;
}
function counts(rows){ const all = LS.get(); return { attended: rows.filter(r => isEvent(r) && (r.Outcome === 'Attended' || (all[r.ID] || {}).attended === 'Attended')).length, people: Object.values(all).reduce((a, s) => a + ((s && s.people) || []).length, 0) }; }

function onClick(e){
  const b = e.target.closest('[data-ev]'); if (!b || !H) return;
  const kind = b.dataset.ev, r = b.dataset.id ? (H.rows().find(x => x.ID === b.dataset.id)) : null;
  if (kind === 'open') return H.open(b.dataset.url);
  if (!r) return;
  if (kind === 'rsvp') return rsvp(r, b.dataset.v);
  if (kind === 'reg') return reg(r, b.dataset.v === 'yes');
  if (kind === 'went') return went(r, b.dataset.v);
  if (kind === 'recap') return recapSheet(r, false);
  if (kind === 'person') return personSheet(r);
  if (kind === 'copyintro'){ const t = cheat(r).intro; if (window.Android && Android.copy) Android.copy(t); else if (navigator.clipboard) navigator.clipboard.writeText(t); H.toast('Intro copied.'); }
}
document.addEventListener('click', onClick);
document.addEventListener('change', e => { const t = e.target.closest('[data-ev-ticket]'); if (t){ put(t.dataset.evTicket, { ticket: t.value.trim() }); H.toast('Ticket link saved. 🎟️'); } });

window.FTEvents = { init(h){ H = h; }, panel, todayCards, stats, counts, state: st };
})();
