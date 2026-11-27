/* Kit (v6.10): Quick copy (my details + ready-made answers) · places (Lagos / Nigeria / online / abroad) ·
 * share an opportunity as an image card · Sunday reset (top 3 for the week) · "What worked" insights · tick haptics.
 * Everything lives on the phone (localStorage); no script update needed. */
(() => {
let H = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } }
};
const profile = () => window.FTWelcome ? FTWelcome.profile() : {};
const words = t => (String(t || '').trim().match(/\S+/g) || []).length;
function copy(text, msg){
  if (!text) return;
  if (window.Android && Android.copy && !Android.web){ Android.copy(text); H.toast(msg || 'Copied ✓'); }
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => H.toast(msg || 'Copied ✓'), () => H.toast('Couldn\'t copy.'));
  buzz(12);
}

/* ================= 12. haptics ================= */
function buzz(ms){
  try { if (window.Android && Android.buzz && !Android.web) Android.buzz(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch(e){}
}
document.addEventListener('change', e => { const t = e.target; if (t.matches && t.matches('[data-req],[data-plan]') && t.checked) buzz(18); }, true);
document.addEventListener('click', e => {
  const s = e.target.closest && e.target.closest('[data-status="Submitted"],[data-outcome="Accepted"],[data-outcome="Shortlisted"],[data-outcome="Interview"]');
  if (s) buzz(s.dataset.status ? 40 : 70);
}, true);

/* ================= 1 + 2. Quick copy: my details + ready-made answers ================= */
const DETAIL_KEYS = [['name', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['school', 'School'], ['course', 'Course'], ['level', 'Level'],
  ['matric', 'Matric number'], ['linkedin', 'LinkedIn'], ['github', 'GitHub / portfolio'], ['address', 'Address'], ['state', 'State of origin'], ['dob', 'Date of birth']];
const ANSWERS = [['bio50', 'Short bio (50 words)', 50], ['bio100', 'Bio (100 words)', 100], ['bio200', 'Bio (200 words)', 200],
  ['why', 'Why my field', 150], ['goals', 'Career goals', 150], ['challenge', 'A challenge I overcame', 250], ['leader', 'Leadership example', 200], ['community', 'Community impact', 200]];
function details(){
  const p = profile(), d = LS.get('ft-kit-details', {}), out = {};
  DETAIL_KEYS.forEach(([k]) => { out[k] = d[k] != null ? d[k] : (k === 'name' ? (p.name || p.nickname || '') : p[k] || ''); });
  return out;
}
const answers = () => LS.get('ft-kit-answers', {});
function starter(k){
  const p = profile(), me = p.name || p.nickname || 'I', first = (p.nickname || p.name || '').split(' ')[0];
  const who = [p.level, p.course].filter(Boolean).join(' ') + (p.course ? ' student' : 'student') + (p.school ? ' at ' + p.school : '');
  const intr = p.interests ? p.interests.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3).join(', ') : '';
  if (k === 'bio50') return `${me} is a ${who}${intr ? ' interested in ' + intr : ''}. [ADD: one achievement, e.g. a project or award]. ${first || 'She'} is looking for opportunities to [ADD: what you want to learn or build].`;
  if (k === 'bio100') return `I'm ${me}, a ${who}.${intr ? ' I\'m drawn to ' + intr + '.' : ''} [ADD: your proudest project and what it did, with a number if you can]. [ADD: a skill or tool you're good at]. Outside class, I [ADD: club, volunteering or side project]. Next, I want to [ADD: your goal], and this opportunity would help me [ADD: how].`;
  return '';
}
function kitHtml(q){
  q = (q || '').toLowerCase();
  const d = details(), a = answers();
  const dl = DETAIL_KEYS.filter(([k, l]) => !q || l.toLowerCase().includes(q) || String(d[k]).toLowerCase().includes(q));
  const al = ANSWERS.filter(([k, l]) => !q || l.toLowerCase().includes(q) || String(a[k] || '').toLowerCase().includes(q));
  return `<div class="kit">
    <div class="sh"><h2>My details</h2><small>tap to copy · stays on this phone</small></div>
    <div class="kit-chips">${dl.map(([k, l]) => `<button class="kit-chip ${d[k] ? '' : 'empty'}" data-kc="${k}"><small>${l}</small><b>${esc(d[k] || '+ add')}</b></button>`).join('')}</div>
    <div class="row"><button class="btn small" data-kedit="details">Edit my details</button></div>
    <div class="sh" style="margin-top:18px"><h2>Ready-made answers</h2><small>for the questions every form asks</small></div>
    ${al.map(([k, l, max]) => { const t = a[k] || ''; return `<div class="card kit-ans">
      <div class="kit-ah"><b>${l}</b><span class="chip ${t && words(t) > max ? 'c-rose' : ''}">${t ? words(t) + '/' + max + ' words' : 'empty'}</span></div>
      ${t ? `<p>${esc(t.length > 220 ? t.slice(0, 220) + '…' : t)}</p>` : '<p class="note">Write it once, paste it everywhere.</p>'}
      <div class="row">${t ? `<button class="btn small primary" data-ka="${k}">Copy</button>` : ''}<button class="btn small ${t ? 'ghost' : ''}" data-kae="${k}">${t ? 'Edit' : 'Write it'}</button></div></div>`; }).join('')}
  </div>`;
}
function editDetails(){
  const d = details();
  H.openSheet(`<div class="sheet-head"><h3>My details</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body"><div class="note">Only on this phone. Never sent anywhere.</div>
    ${DETAIL_KEYS.map(([k, l]) => `<label class="note" for="kd-${k}">${l}</label><input id="kd-${k}" value="${esc(d[k])}" ${k === 'email' ? 'type="email"' : k === 'phone' ? 'type="tel"' : ''}>`).join('')}
    <div class="row"><button class="btn primary" data-ksave="details">Save</button></div></div>`);
}
function editAnswer(k){
  const def = ANSWERS.find(x => x[0] === k); if (!def) return;
  const t = answers()[k] || starter(k);
  H.openSheet(`<div class="sheet-head"><h3>${def[1]}</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body">${!answers()[k] && t ? '<div class="note">I started it from your profile. Replace every [ADD: …] with the real thing.</div>' : ''}
    <textarea id="ka-text" rows="10" class="es-text">${esc(t)}</textarea>
    <div class="note" id="ka-wc">${words(t)} / ${def[2]} words</div>
    <div class="row"><button class="btn primary" data-ksave="${k}">Save</button><button class="btn" data-kcopyta>Copy</button></div></div>`);
  const ta = document.getElementById('ka-text'), wc = document.getElementById('ka-wc');
  ta.oninput = () => { const n = words(ta.value); wc.textContent = `${n} / ${def[2]} words`; wc.style.color = n > def[2] ? 'var(--rose)' : ''; };
}
function quickCopySheet(){
  H.openSheet(`<div class="sheet-head"><h3>Quick copy</h3><button class="btn small ghost" data-close>Close</button></div><div class="sheet-body">${kitHtml()}</div>`);
}

/* ================= 7. places ================= */
const PLACES = [['all', 'All places'], ['lagos', '📍 Lagos'], ['nigeria', '🇳🇬 Nigeria'], ['online', '💻 Online'], ['abroad', '✈️ Abroad']];
const LAGOS = /\b(lagos|ikeja|lekki|yaba|ikorodu|ajah|surulere|victoria island|ikoyi|epe|badagry|oshodi|festac|maryland|gbagada|ojo|lasu|lasustech|unilag)\b/i;
const NIGERIA = /\b(nigeria|nigerian|abuja|ibadan|kano|port harcourt|enugu|kaduna|benin city|ilorin|abeokuta|owerri|jos|calabar|uyo|ogun|oyo|osun|ondo|ekiti|kwara|naija)\b/i;
const ONLINE = /\b(virtual|remote(ly)?|zoom|webinar|google meet|livestream|work from anywhere|held online|takes place online|fully online|100% online|online (event|programme|program|course|bootcamp|session|workshop|class|conference|hackathon|competition|internship|fellowship|summit|meetup))\b/i;
const ABROAD = /\b(usa|u\.s\.|united states|uk|u\.k\.|united kingdom|london|canada|germany|france|japan|tokyo|china|korea|india|europe|european|switzerland|geneva|cern|netherlands|sweden|norway|finland|denmark|italy|spain|australia|singapore|dubai|uae|qatar|saudi|south africa|kenya|ghana|rwanda|egypt|morocco|turkey|ireland|scotland|belgium|austria|poland|taiwan|hong kong|abroad|overseas|international)\b/i;
function placeOf(r){
  const set = LS.get('ft-place', {})[r.ID]; if (set) return set;
  const txt = [r.Title, r.Organisation, r.Notes, r['What it offers'], r.Requirements].join(' ');
  if (ONLINE.test(txt) && !LAGOS.test(txt)) return 'online';
  if (LAGOS.test(txt)) return 'lagos';
  if (ABROAD.test(txt)) return 'abroad';
  if (NIGERIA.test(txt)) return 'nigeria';
  return '';
}
let place = LS.get('ft-place-filter', 'all');
const filterPlace = list => place === 'all' ? list : list.filter(r => placeOf(r) === place);
function placeChips(list){
  const n = k => k === 'all' ? list.length : list.filter(r => placeOf(r) === k).length;
  return PLACES.map(([k, l]) => `<button data-kplace="${k}" aria-pressed="${place === k}">${l}${k === 'all' ? '' : ' · ' + n(k)}</button>`).join('');
}
function placeTag(r){
  const p = placeOf(r), L = Object.fromEntries(PLACES);
  return `<div class="row kit-place"><span class="note">Where:</span>${PLACES.slice(1).map(([k, l]) => `<button class="chip ${p === k ? 'c-ok' : ''}" data-kpset="${k}" aria-pressed="${p === k}">${l}</button>`).join('')}${!LS.get('ft-place', {})[r.ID] && p ? '<span class="note">(guessed)</span>' : ''}</div>`;
}

/* ================= 9. share an opportunity as an image card ================= */
function wrap(g, text, x, y, maxW, lh, maxLines){
  const ws = String(text || '').split(/\s+/); let line = '', n = 0;
  for (let i = 0; i < ws.length; i++){
    const t = line ? line + ' ' + ws[i] : ws[i];
    if (g.measureText(t).width > maxW && line){ if (++n >= maxLines){ g.fillText(line.replace(/[,.;:]?$/, '…'), x, y); return y + lh; } g.fillText(line, x, y); y += lh; line = ws[i]; }
    else line = t;
  }
  if (line){ g.fillText(line, x, y); y += lh; }
  return y;
}
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
async function cardBlob(r){
  const W = 1080, Hh = 1350, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  const goth = document.documentElement.dataset.skin === 'grunge';
  const C = goth ? { bg: '#0C0B0B', card: '#141212', ink: '#EDEAE6', mute: '#A39C99', hot: '#E0393E', hl: '#2A0E10' } : { bg: '#FFC629', card: '#FFFDF4', ink: '#1E1606', mute: '#6E5A2C', hot: '#D9533B', hl: '#FFE7A0' };
  try { await document.fonts.load('80px "Patrick Hand"'); } catch(e){}
  g.fillStyle = C.bg; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = goth ? 'rgba(224,57,62,.18)' : 'rgba(30,22,6,.10)'; g.lineWidth = 3;
  for (let y = 0; y < Hh + 60; y += 104) for (let x = (y / 104) % 2 ? 0 : 60; x < W + 60; x += 120){ g.beginPath(); for (let k = 0; k < 6; k++){ const a = Math.PI / 3 * k + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](x + 58 * Math.cos(a), y + 58 * Math.sin(a)); } g.closePath(); g.stroke(); }
  g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 8;
  g.beginPath(); g.roundRect(70, 170, W - 140, Hh - 330, 48); g.fill(); g.stroke();
  const face = window.bisiSvg ? await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bisiSvg('happy', 220, false))) : null;
  if (face) g.drawImage(face, W - 300, 40, 220, 220);
  g.fillStyle = C.ink; g.font = '700 54px "Patrick Hand", cursive'; g.textBaseline = 'alphabetic';
  g.fillText(goth ? 'Found an opportunity 🪲' : 'Found an opportunity for you 🐝', 80, 120);
  let y = 290; const pad = 130, mw = W - pad * 2;
  g.fillStyle = C.hot; g.font = '800 34px Nunito, sans-serif';
  g.fillText([r.Type || r.Category || 'Opportunity', placeOf(r) ? Object.fromEntries(PLACES)[placeOf(r)].replace(/^\S+\s/, '') : ''].filter(Boolean).join('  ·  ').toUpperCase(), pad, y); y += 80;
  g.fillStyle = C.ink; g.font = '400 88px "Patrick Hand", cursive'; y = wrap(g, r.Title || 'Opportunity', pad, y, mw, 92, 3);
  if (r.Organisation){ g.fillStyle = C.mute; g.font = '700 40px Nunito, sans-serif'; y = wrap(g, r.Organisation, pad, y + 6, mw, 52, 2); }
  y += 30;
  if (r.Deadline){ const dd = H.days(r.Deadline); g.fillStyle = C.hl; g.beginPath(); g.roundRect(pad - 10, y - 58, mw + 20, 92, 24); g.fill();
    g.fillStyle = C.ink; g.font = '800 46px Nunito, sans-serif'; g.fillText(`⏰ ${r.Category === 'Event' ? 'On' : 'Deadline'}: ${H.parse(r.Deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pad + 10, y);
    if (dd !== null && dd >= 0){ g.fillStyle = C.hot; g.font = '800 34px Nunito, sans-serif'; const t = dd === 0 ? 'today!' : dd === 1 ? 'tomorrow!' : dd + ' days left'; g.fillText(t, W - pad - g.measureText(t).width, y); }
    y += 100; }
  if (r['What it offers']){ g.fillStyle = C.ink; g.font = '600 40px Nunito, sans-serif'; y = wrap(g, r['What it offers'], pad, y, mw, 56, 5); y += 20; }
  const req = H.reqs(r).map(x => x.text).filter(t => t.length < 70).slice(0, 4);
  if (req.length && y < Hh - 380){ g.fillStyle = C.mute; g.font = '800 32px Nunito, sans-serif'; g.fillText('YOU\'LL NEED', pad, y); y += 52; g.fillStyle = C.ink; g.font = '600 36px Nunito, sans-serif';
    for (const t of req){ if (y > Hh - 300) break; y = wrap(g, '• ' + t, pad, y, mw, 48, 1); } }
  if (r.Link){ let host = ''; try { host = new URL(r.Link).hostname.replace(/^www\./, ''); } catch(e){}
    if (host){ g.fillStyle = C.ink; g.font = '800 38px Nunito, sans-serif'; g.fillText('🔗 ' + host, pad, Hh - 210); } }
  g.fillStyle = C.ink; g.font = '400 44px "Patrick Hand", cursive'; g.fillText('Tracked with Follow-Through', 80, Hh - 70);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
async function shareCard(r){
  if (!r) return;
  H.toast('Making your card… 🎨');
  const blob = await cardBlob(r); if (!blob){ H.toast('Couldn\'t make the card.'); return; }
  const text = `${r.Title}${r.Deadline ? ' · deadline ' + H.fmt(r.Deadline) : ''}${r.Link ? '\n' + r.Link : ''}`;
  if (window.Android && Android.shareImage && !Android.web){ const b64 = await new Promise(res => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.readAsDataURL(blob); }); Android.shareImage(b64, text); return; }
  const file = new File([blob], (r.Title || 'opportunity').replace(/[^\w ]+/g, '').slice(0, 40).trim() + '.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })){ try { await navigator.share({ files: [file], text }); } catch(e){} return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); H.toast('Card saved. Send it with the link: ' + (r.Link || ''));
}

/* ================= 10. Sunday reset ================= */
const monday = d => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
function weekKey(){ const t = H.today(), m = monday(t); if (t.getDay() === 0) m.setDate(m.getDate() + 7); return H.iso(m); }
const weekState = () => { const w = LS.get('ft-week', {}); return w.wk === weekKey() ? w : null; };
const isPick = id => { const w = weekState(); return !!(w && (w.picks || []).indexOf(id) >= 0); };
function resetCard(rows){
  const t = H.today(), day = t.getDay(), w = weekState();
  if (w && w.picks && w.picks.length){
    const ps = w.picks.map(id => rows.find(r => r.ID === id)).filter(Boolean);
    if (!ps.length) return '';
    const done = r => H.applied(r) || r.Status === 'Closed';
    return `<section class="kit-week"><div class="sh"><h2>This week's top ${ps.length}</h2><small>${ps.filter(done).length}/${ps.length} done</small></div>
      <div class="card">${ps.map(r => `<div class="item" data-open="${esc(r.ID)}"><span class="dot d-${done(r) ? 'ok' : 'sun'}"></span><div class="main"><div class="t" style="${done(r) ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(r.Title)}</div><div class="m">${r.Deadline ? 'due ' + esc(H.fmt(r.Deadline)) : ''}</div></div></div>`).join('')}
      <div class="row"><button class="btn small ghost" data-kreset>Change picks</button></div></div></section>`;
  }
  if (day !== 0 && day !== 1 && day !== 6) return '';
  if (w && w.skipped) return '';
  return `<button class="card g-entry kit-reset" data-kreset><span class="g-ico">🧺</span><span><b>${day === 1 ? 'Monday' : 'Sunday'} reset · 2 minutes</b><small>Look back at your week, then pick your top 3 for the next one.</small></span><span aria-hidden="true">→</span></button>`;
}
function resetSheet(){
  const rows = H.rows(), t = H.today(), wkAgo = new Date(t); wkAgo.setDate(wkAgo.getDate() - 7);
  const inWeek = s => { const d = H.parse(String(s || '').slice(0, 10)); return d && d > wkAgo && d <= t; };
  const saved = rows.filter(r => inWeek(r.Captured)).length, sub = rows.filter(r => H.applied(r) && inWeek(H.appliedDate(r))).length;
  const missed = rows.filter(r => H.active(r) && r.Deadline && inWeek(r.Deadline) && H.days(r.Deadline) < 0).length;
  const rank = x => { const d = H.days(x.r.Deadline); return x.u && x.u.why !== 'Reminder' ? x.u.score : 30 + (d === null ? 900 : d); };
  const cands = rows.filter(r => H.active(r) && !(H.days(r.Deadline) < 0)).map(r => ({ r, u: H.urgency(r) })).sort((a, b) => rank(a) - rank(b)).slice(0, 10);
  const w = weekState(), pre = w && w.picks ? w.picks : cands.slice(0, 3).map(x => x.r.ID);
  H.openSheet(`<div class="sheet-head"><h3>Weekly reset</h3><button class="btn small ghost" data-close>Close</button></div>
    <div class="sheet-body">
      <div class="note"><b>Last 7 days:</b> ${saved} saved · ${sub} submitted${missed ? ` · ${missed} deadline${missed > 1 ? 's' : ''} slipped` : ''}. ${sub ? 'Proud of you. 🍯' : saved ? 'Lots of saving. This week, let\'s send something.' : 'Quiet week. Fresh start now.'}</div>
      <div><b>Pick up to 3 to focus on this week</b><div class="note">They go to the top of Today's plan.</div></div>
      ${cands.length ? cands.map(({ r, u }) => `<label class="chk"><input type="checkbox" data-kpick="${esc(r.ID)}" ${pre.indexOf(r.ID) >= 0 ? 'checked' : ''}><span><b>${esc(r.Title)}</b><br><small class="note">${esc([u && u.why, r.Deadline && 'due ' + H.fmt(r.Deadline)].filter(Boolean).join(' · '))}</small></span></label>`).join('') : '<div class="empty">Nothing in progress. Save something this week!</div>'}
      <div class="row"><button class="btn primary" data-ksave="week">Set my week</button><button class="btn ghost" data-kskip>Skip this week</button></div>
    </div>`);
}

/* ================= 11. What worked ================= */
function insights(rows){
  const GOOD = ['Accepted', 'Shortlisted', 'Interview'], BAD = ['Rejected', 'No response'];
  const win = rows.filter(r => GOOD.indexOf(r.Outcome) >= 0), lose = rows.filter(r => BAD.indexOf(r.Outcome) >= 0), n = win.length + lose.length;
  const head = `<section><div class="sh"><h2>What worked</h2><small>${n} result${n === 1 ? '' : 's'} so far</small></div><div class="card kit-ins">`;
  if (n < 3 || !win.length) return head + `<p>${n < 3 ? `I need at least 3 results (yes or no) to spot patterns; you have ${n}.` : 'No wins to compare yet. They\'re coming.'} When there's enough, I'll compare your wins and your no's: how early you applied, whether you used essay drafts, the eligibility check, the type of opportunity and how big the application was.</p></div></section>`;
  const pct = (list, f) => list.length ? Math.round(list.filter(f).length / list.length * 100) : 0;
  const early = r => { const a = H.parse(r['Applied on']), d = H.parse(r.Deadline); return a && d ? Math.round((d - a) / 864e5) : null; };
  const avg = list => { const v = list.map(early).filter(x => x !== null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; };
  const out = [];
  const ew = avg(win), el = avg(lose);
  if (ew !== null && el !== null && Math.abs(ew - el) >= 2) out.push(ew > el ? `You submitted your wins <b>${ew} days</b> before the deadline on average, vs ${el} days for the no's. Applying early pays off for you.` : `Your wins went in later (${ew} days early vs ${el}). Last-minute you still delivers, but don't push it.`);
  const es = [pct(win, r => r['Essay doc']), pct(lose, r => r['Essay doc'])];
  if (Math.abs(es[0] - es[1]) >= 25) out.push(es[0] > es[1] ? `${es[0]}% of your wins used Bisi's essay drafts (vs ${es[1]}% of the no's). Keep using them as a starting point.` : `Your wins mostly came from your own writing (${100 - es[0]}% without drafts). Trust your voice.`);
  const el2 = [pct(win, r => /^Strong/.test(r.Eligibility || '')), pct(lose, r => /^Strong/.test(r.Eligibility || ''))];
  if (el2[0] - el2[1] >= 25) out.push(`When the eligibility check said <b>Strong</b>, you won ${el2[0]}% of the time vs ${el2[1]}% otherwise. Prioritise strong matches.`);
  const types = {}; [...win, ...lose].forEach(r => { const t = r.Type || 'Other'; types[t] = types[t] || [0, 0]; types[t][GOOD.indexOf(r.Outcome) >= 0 ? 0 : 1]++; });
  const best = Object.entries(types).filter(([, v]) => v[0] + v[1] >= 2).sort((a, b) => b[1][0] / (b[1][0] + b[1][1]) - a[1][0] / (a[1][0] + a[1][1]))[0];
  if (best && best[1][0]) out.push(`Your best hit rate is with <b>${esc(best[0].toLowerCase())}s</b>: ${best[1][0]} of ${best[1][0] + best[1][1]}.`);
  const big = list => list.length ? Math.round(list.reduce((s, r) => s + H.reqs(r).length, 0) / list.length) : 0;
  if (big(win) - big(lose) >= 2) out.push(`Your wins had more steps (${big(win)} vs ${big(lose)}). Long applications scare people off, so fewer people apply. Keep going for them.`);
  if (!out.length) out.push(`No clear pattern yet between your ${win.length} win${win.length > 1 ? 's' : ''} and ${lose.length} no${lose.length > 1 ? "'s" : ''}. Keep logging results and I'll keep looking.`);
  return head + `<ul>${out.slice(0, 4).map(s => `<li>${s}</li>`).join('')}</ul><div class="note">Based on ${win.length} win${win.length === 1 ? '' : 's'} and ${lose.length} no${lose.length === 1 ? '' : "'s"}. Small numbers, so treat these as hints.</div></div></section>`;
}

/* ================= wiring ================= */
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest || !H) return;
  const kc = t.closest('[data-kc]'); if (kc){ const v = details()[kc.dataset.kc]; if (v) copy(v, 'Copied ' + DETAIL_KEYS.find(x => x[0] === kc.dataset.kc)[1].toLowerCase() + ' ✓'); else editDetails(); return; }
  if (t.closest('[data-kedit]')){ editDetails(); return; }
  const ka = t.closest('[data-ka]'); if (ka){ copy(answers()[ka.dataset.ka], 'Copied. Paste it in the form ✓'); return; }
  const kae = t.closest('[data-kae]'); if (kae){ editAnswer(kae.dataset.kae); return; }
  if (t.closest('[data-kcopyta]')){ const ta = document.getElementById('ka-text'); if (ta) copy(ta.value, 'Copied ✓'); return; }
  const ks = t.closest('[data-ksave]'); if (ks){ const k = ks.dataset.ksave;
    if (k === 'details'){ const d = {}; DETAIL_KEYS.forEach(([x]) => { const el = document.getElementById('kd-' + x); if (el) d[x] = el.value.trim(); }); LS.set('ft-kit-details', d); H.closeSheet(); H.toast('Saved on this phone 🐝'); H.render(); return; }
    if (k === 'week'){ const picks = [...document.querySelectorAll('[data-kpick]:checked')].map(x => x.dataset.kpick).slice(0, 3); LS.set('ft-week', { wk: weekKey(), picks, at: H.iso(H.today()) }); H.closeSheet(); buzz(40); H.toast(picks.length ? 'Your week is set. One step at a time. 🐝' : 'Saved.'); H.render(); return; }
    const ta = document.getElementById('ka-text'); const a = answers(); a[k] = ta ? ta.value.trim() : ''; LS.set('ft-kit-answers', a); H.closeSheet(); H.toast('Saved ✓'); H.render(); return; }
  const kp = t.closest('[data-kpick]'); if (kp){ const n = document.querySelectorAll('[data-kpick]:checked').length; if (n > 3){ kp.checked = false; H.toast('Just 3. Focus is a superpower. 🐝'); } return; }
  if (t.closest('[data-kskip]')){ LS.set('ft-week', { wk: weekKey(), skipped: true }); H.closeSheet(); H.render(); return; }
  if (t.closest('[data-kreset]')){ resetSheet(); return; }
  const pl = t.closest('[data-kplace]'); if (pl){ place = pl.dataset.kplace; LS.set('ft-place-filter', place); H.render(); return; }
  const ps = t.closest('[data-kpset]'); if (ps){ const r = H.current(); if (!r) return; const m = LS.get('ft-place', {}); m[r.ID] = ps.dataset.kpset; LS.set('ft-place', m); H.render(); H.openItem(r.ID); return; }
  const kk = t.closest('[data-kit]'); if (kk){ if (kk.dataset.kit === 'copy') quickCopySheet(); if (kk.dataset.kit === 'share') shareCard(H.current()); return; }
}, true);

const STYLE = `
.kit-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:10px}
.kit-chip{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:8px 10px;border:2px solid var(--stroke);border-radius:12px;background:var(--card);box-shadow:2px 2px 0 var(--sh);font:inherit;color:var(--ink);cursor:pointer;min-width:0}
.kit-chip small{font-size:11px;color:var(--muted)}.kit-chip b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.kit-chip.empty{border-style:dashed;box-shadow:none}.kit-chip.empty b{color:var(--muted);font-weight:600}
.kit-ans{margin-bottom:10px}.kit-ah{display:flex;justify-content:space-between;align-items:center;gap:8px}.kit-ans p{margin:6px 0;font-size:14px;white-space:pre-wrap}
.kit-place{gap:6px;align-items:center}.kit-place .chip{cursor:pointer;font:inherit;font-size:13px}
.kit-ins ul{margin:0 0 8px;padding-left:20px}.kit-ins li{margin-bottom:6px}
.kit-reset{margin-bottom:14px}
`;
function init(h){ H = h; const s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s); }
const safe = f => (...a) => { if (!H) return ''; try { return f(...a); } catch(e){ console.error('FTKit', e); return ''; } };
window.FTKit = { init, buzz, kitHtml: safe(kitHtml), placeChips: safe(placeChips), filterPlace: l => { try { return H ? filterPlace(l) : l; } catch(e){ return l; } },
  placeTag: safe(placeTag), resetCard: safe(resetCard), insights: safe(insights), isPick: id => { try { return H ? isPick(id) : false; } catch(e){ return false; } }, placeOf };
})();
