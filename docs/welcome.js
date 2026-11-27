/* First-run welcome: Bisi buzzes out of the hive, shows you around, helps you set up, then asks for your profile.
 * Also: the profile form (Me tab) and the carousel combiner (several screenshots of one post → one image).
 * Needs: bisi.js loaded first; the dashboard passes its helpers in FTWelcome.init(). */
(() => {
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : v; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} },
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let H = {};   // dashboard helpers: call, toast, onDone
const isWeb = () => !!(window.Android && Android.web);
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const connected = () => !!(window.Android && Android.webAppUrl && Android.webAppUrl());

/* ---------------- profile ---------------- */
const profile = () => { try { return JSON.parse(LS.get('ft-profile', '{}')) || {}; } catch(e){ return {}; } };
const MARK = 'Profile (from the app)';
function profileMarkdown(p){
  let age = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.dob || '')){ const d = new Date(p.dob + 'T12:00:00'), n = new Date(); age = n.getFullYear() - d.getFullYear() - ((n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) ? 1 : 0); }
  const L = [];
  if (p.name || p.nickname) L.push('Name: ' + (p.name || p.nickname) + (p.nickname && p.name ? ' (goes by ' + p.nickname + ')' : ''));
  if (age !== '') L.push('Age: ' + age + ' (born ' + p.dob + ')');
  if (p.gender) L.push('Gender: ' + p.gender);
  if (p.country || p.city) L.push('Lives in: ' + [p.city, p.country].filter(Boolean).join(', '));
  if (p.school) L.push('School: ' + p.school);
  if (p.course) L.push('Course: ' + p.course);
  if (p.level) L.push('Level/year: ' + p.level + (p.gradYear ? ', graduating ' + p.gradYear : '')); else if (p.gradYear) L.push('Graduating: ' + p.gradYear);
  if (p.cgpa) L.push('CGPA: ' + p.cgpa);
  if (p.interests) L.push('Interests: ' + p.interests);
  if (p.goals) L.push('Looking for: ' + p.goals);
  if (p.email) L.push('Email: ' + p.email);
  return '## ' + MARK + '\n' + L.map(x => '- ' + x).join('\n');
}
/* Scripts before version 9 have no profile store, so the profile goes into the "About me" doc the AI already reads:
 * added at the end the first time; on later edits the doc is rewritten with your own text kept and the profile replaced. */
async function profileIntoAboutMe(p){
  const cur = await H.call({ action:'readDoc', key:'about-me' });
  const text = cur.ok ? String(cur.text || '') : '';
  const section = profileMarkdown(p);
  if (!cur.ok && cur.error && cur.error !== 'no_doc') return cur;
  const i = text.indexOf(MARK);
  if (!text.trim()) return H.call({ action:'doc', key:'about-me', title:'About me', body:'# About me\n' + section, mode:'replace' });
  if (i < 0) return H.call({ action:'doc', key:'about-me', body:'\n' + section, mode:'append' });
  const before = text.slice(0, i).replace(/\s+$/, '');
  const keep = before.split('\n').map(l => l.trim() ? l : '').join('\n');
  return H.call({ action:'doc', key:'about-me', body: keep + '\n\n' + section, mode:'replace' });
}
async function saveProfile(p){
  LS.set('ft-profile', JSON.stringify(p));
  if (!connected() || !H.call) return { ok:true, local:true };
  const j = await H.call({ action:'profile', profile:p });
  if (j.ok) return j;
  if (j.error === 'unknown_action'){ const d = await profileIntoAboutMe(p); return d.ok ? { ok:true, viaDoc:true } : d; }
  return j;
}
/* restore the profile from the script (e.g. a new phone or the web version) */
async function syncProfile(){
  if (profile().nickname || !connected() || !H.call) return;
  const j = await H.call({ action:'getProfile' });
  if (j.ok && j.profile && Object.keys(j.profile).length) LS.set('ft-profile', JSON.stringify(j.profile));
}

/* ---------------- styles ---------------- */
const css = document.createElement('style');
css.textContent = `
.onb{position:fixed;inset:0;z-index:80;overflow:auto;background:#FFE7A0;color:#1E1606;font-family:var(--f-b);display:flex;flex-direction:column;align-items:center;padding:calc(18px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom))}
.onb-hc{position:fixed;inset:0;pointer-events:none;opacity:.32;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97'%3E%3Cpath d='M28 0l28 16v32L28 64 0 48V16zM28 64v33' fill='none' stroke='%23C98A0B' stroke-width='1.5'/%3E%3C/svg%3E")}
.onb-in{position:relative;width:min(420px,100%);margin:auto;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}
.onb h1{font-family:var(--f-d);font-size:2.3rem;line-height:1.05;margin:0}
.onb h2{font-family:var(--f-d);font-size:1.8rem;line-height:1.1;margin:0}
.onb p{margin:0;line-height:1.45;font-size:1.02rem}
.onb .btn{font-size:1.15rem}
.onb-skip{position:fixed;top:calc(12px + env(safe-area-inset-top));right:14px;z-index:2;background:none;border:0;font:inherit;font-weight:700;color:#6E5A2C;padding:8px;cursor:pointer}
.onb-stage{position:relative;width:260px;height:250px;cursor:pointer;border:0;background:none;padding:0}
.onb-stage .hive{position:absolute;left:30px;top:20px;width:200px;transition:transform .3s}
.onb-stage:not(.out) .hive{animation:onbWiggle 2.4s ease-in-out infinite}
@keyframes onbWiggle{0%,80%,100%{transform:rotate(0)}84%{transform:rotate(-4deg)}88%{transform:rotate(4deg)}92%{transform:rotate(-2deg)}}
.onb-stage .bee{position:absolute;left:80px;top:120px;width:100px;opacity:0;transform:scale(.2);transition:transform .9s cubic-bezier(.2,1.5,.4,1),opacity .3s,left .9s,top .9s}
.onb-stage.out .bee{opacity:1;transform:scale(1.25);left:150px;top:-10px}
.onb-stage.out .hive{transform:scale(.92) translateX(-18px)}
.onb-tap{font-family:var(--f-d);font-size:1.45rem;animation:onbBob 1.6s ease-in-out infinite}
@keyframes onbBob{50%{transform:translateY(-6px)}}
.onb-say{background:#FFFDF4;border:2.5px solid #1E1606;border-radius:22px 18px 24px 16px;box-shadow:4px 5px 0 #1E1606;padding:16px 16px 14px;position:relative;animation:onbUp .5s cubic-bezier(.2,1.4,.4,1)}
.onb-say::before{content:"";position:absolute;top:-14px;right:70px;border:12px solid transparent;border-bottom-color:#1E1606;border-top:0}
@keyframes onbUp{from{transform:translateY(30px);opacity:0}}
.onb-slide{display:flex;flex-direction:column;align-items:center;gap:10px;animation:onbUp .4s ease}
.onb-pic{width:150px;height:150px;display:grid;place-items:center;background:#FFFDF4;border:3px solid #1E1606;border-radius:50% 46% 52% 44%;box-shadow:4px 5px 0 #1E1606}
.onb-list{text-align:left;margin:4px 0 0;padding:0;list-style:none;width:100%}
.onb-list li{display:flex;gap:10px;margin:8px 0;line-height:1.35}
.onb-list b{font-weight:800}
.onb-dots{display:flex;gap:7px;justify-content:center}.onb-dots i{width:10px;height:10px;border-radius:50%;border:2px solid #1E1606;background:#FFFDF4}.onb-dots i.on{background:#1E1606}
.onb-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;width:100%}
.onb-form{width:100%;text-align:left;display:flex;flex-direction:column;gap:10px;background:#FFFDF4;border:2.5px solid #1E1606;border-radius:22px 18px 24px 16px;box-shadow:4px 5px 0 #1E1606;padding:16px}
.onb-form label{font-weight:800;font-size:.92rem;display:flex;flex-direction:column;gap:4px}
.onb-form small{font-weight:600;color:#6E5A2C}
.onb-form input,.onb-form select,.onb-form textarea{border:2.5px solid #1E1606;border-radius:12px 10px 13px 9px;padding:10px 11px;font:inherit;font-weight:600;background:#fff;color:#1E1606;width:100%;box-sizing:border-box}
.onb-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.onb-chips{display:flex;flex-wrap:wrap;gap:6px}
.onb-chips button{border:2px solid #1E1606;border-radius:999px;padding:5px 11px;background:#fff;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer;color:#1E1606}
.onb-chips button[aria-pressed="true"]{background:#F5B700}
.onb-note{font-size:.85rem;color:#6E5A2C}
.onb-ok{width:100%;padding:12px}
.onb-check{font-size:3rem;line-height:1}
`;
document.head.appendChild(css);

/* ---------------- the journey ---------------- */
const STEPS = ['welcome', 'tour', 'setup', 'profile', 'done'];
let root = null, tourIdx = 0, editOnly = false;
function shell(html, skip){
  if (!root){ root = document.createElement('div'); root.className = 'onb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); document.body.appendChild(root); root.addEventListener('click', onClick); }
  root.innerHTML = '<div class="onb-hc"></div>' + (skip ? `<button class="onb-skip" data-onb="${skip}">${skip === 'close' ? 'Close' : 'Skip'}</button>` : '') + `<div class="onb-in">${html}</div>`;
  root.scrollTop = 0;
}
function close(){ if (root){ root.remove(); root = null; } }
function step(name){
  LS.set('ft-onb', name);
  if (name === 'welcome') return welcome();
  if (name === 'tour'){ tourIdx = 0; return tour(); }
  if (name === 'setup') return setup();
  if (name === 'profile') return profileForm(false);
  if (name === 'done') return done();
}
const bee = (mood, size) => window.bisiSvg ? bisiSvg(mood, size || 110, true) : '🐝';

function welcome(){
  shell(`<h1>Welcome to the hive</h1>
    <button class="onb-stage" id="onb-stage" aria-label="Knock on the hive">
      <span class="hive">${window.hiveSvg ? hiveSvg(200) : ''}</span><span class="bee">${bee('party', 100)}</span></button>
    <div class="onb-tap" id="onb-tap">Knock knock… tap the hive</div>
    <div id="onb-hello"></div>`, 'setup');
}
function knock(){
  const st = $('#onb-stage'); if (!st || st.classList.contains('out')) return;
  st.classList.add('out'); $('#onb-tap').remove();
  const p = profile();
  setTimeout(() => {
    const h = $('#onb-hello'); if (!h) return;
    h.innerHTML = `<div class="onb-say"><p style="font-family:var(--f-d);font-size:1.45rem;line-height:1.2">Bzz! ${p.nickname ? 'Hi ' + esc(p.nickname) + '!' : 'Oh, hi!'} I’m <b>Bisi</b>, your new study buddy and full-time nag.</p>
      <p style="margin-top:8px">I’ll catch every scholarship, internship and deadline you scroll past, sort them out, and bug you until you apply. Lovingly. Mostly.</p></div>
      <div class="onb-row" style="margin-top:14px"><button class="btn primary onb-ok" data-onb="tour">Show me around 🐝</button></div>`;
  }, 650);
}
const SLIDES = () => [
  { mood:'happy', icon: isWeb() ? '📸' : '🫧', title:'Catch everything',
    items: isWeb()
      ? [['📸','<b>Upload screenshots</b> of posts and flyers (several slides of one post become one)'], ['🔗','<b>Paste a link</b> or save by voice'], isIOS ? ['📲','<b>Share sheet & Back Tap</b> with an iPhone shortcut (Settings shows how)'] : ['💻','Works on your laptop too']]
      : [['🫧','<b>Tap my bubble</b> on any screen: I save the text, link and a screenshot'], ['🎤','<b>Hold the bubble</b> and talk: reminders, notes or opportunities'], ['↗️','<b>Share</b> from any app, or upload screenshots']] },
  { mood:'party', icon:'⚡', title:'I sort it in seconds',
    items:[['📅','Deadlines, requirements and what it offers, filled in for you'], ['✅','“Am I eligible?” checks against your profile'], ['✍️','Essay drafts, essay reviews, a tailored CV and interview prep']] },
  { mood:'sassy', icon:'⏰', title:'I nag. Lovingly.',
    items:[['🍯','Your <b>nectar streak</b>: act every day or watch it spill'], ['📬','Reminders before deadlines, plus morning emails'], isWeb() ? ['📅','Notes can go straight into your calendar'] : ['🏠','Home-screen widgets and Scroll guard when you doomscroll']] },
  { mood:'happy', icon:'🎮', title:'And a few extras',
    items:[['📝','Notes, checklists and reminders'], ['🎮','Brain break games that actually teach you things'], ['💌','Invite friends: everyone gets their own private hive']] },
];
function tour(){
  const S = SLIDES(), s = S[tourIdx];
  shell(`<div class="onb-slide">
      <div class="onb-pic">${bee(s.mood, 120)}</div>
      <h2>${s.icon} ${s.title}</h2>
      <ul class="onb-list">${s.items.map(([i, t]) => `<li><span aria-hidden="true">${i}</span><span>${t}</span></li>`).join('')}</ul>
    </div>
    <div class="onb-dots">${S.map((_, i) => `<i class="${i === tourIdx ? 'on' : ''}"></i>`).join('')}</div>
    <div class="onb-row">${tourIdx ? '<button class="btn" data-onb="back">Back</button>' : ''}<button class="btn primary" data-onb="next">${tourIdx === S.length - 1 ? 'Let’s set up →' : 'Next →'}</button></div>`, 'setup');
}
function setup(){
  if (connected()){
    shell(`<div class="onb-pic">${bee('party', 120)}</div><h2>Your tracker is connected ✓</h2>
      <p>Everything you save lands in your own Google Sheet. Only you can see it.</p>
      <div class="onb-row"><button class="btn primary onb-ok" data-onb="profile">Next: about you →</button></div>`);
    return;
  }
  if (window.FTLocal){
    shell(`<div class="onb-pic">${bee('happy', 120)}</div><h2>Let’s build your hive</h2>
      <p>No setup needed. Start now and everything you save stays on this phone.</p>${FTLocal.setupChoice()}`);
    return;
  }
  shell(`<div class="onb-pic">${bee('happy', 120)}</div><h2>Let’s build your hive</h2>
    <p>Your opportunities live in <b>your own</b> Google Sheet, run by a small script in your Google account. It takes about 10 minutes, once, and I’ll walk you through it.</p>
    <div class="onb-row"><button class="btn primary onb-ok" data-onb="connect">Set up my tracker</button></div>
    <div class="onb-row"><button class="btn" data-onb="recheck">I’ve done it ✓</button><button class="btn ghost" data-onb="profile">Later</button></div>
    <p class="onb-note">You can always do this from ⚙ Settings.</p>`);
}
const INTERESTS = ['AI & machine learning', 'Robotics', 'Software', 'Hardware & IoT', 'Data science', 'Design', 'Business', 'Health', 'Climate', 'Law & policy', 'Media & arts', 'Leadership & community'];
const GOALS = ['Scholarships', 'Internships', 'Fellowships', 'Competitions & hackathons', 'Conferences & events', 'Research', 'Jobs', 'Grants'];
function chips(list, chosen, name){
  const set = new Set(String(chosen || '').split(/\s*,\s*/).filter(Boolean));
  return `<div class="onb-chips" data-chips="${name}">${list.map(x => `<button type="button" aria-pressed="${set.has(x)}">${esc(x)}</button>`).join('')}</div>`;
}
function profileForm(edit){
  editOnly = !!edit;
  const p = profile();
  const lv = ['Secondary school', '100 level', '200 level', '300 level', '400 level', '500 level', 'Final year', 'Graduate', 'Master’s', 'PhD', 'Working'];
  shell(`<div class="onb-pic" style="width:110px;height:110px">${bee('happy', 90)}</div>
    <h2>${edit ? 'Your profile' : 'Tell me about you'}</h2>
    <p>I use this to check if you’re eligible for things you save, and to make your essays and CV sound like you. It stays in your own Google account.</p>
    <form class="onb-form" id="onb-form">
      <label>What should Bisi call you? <input name="nickname" required maxlength="30" value="${esc(p.nickname)}" placeholder="e.g. Aliyah" autocomplete="nickname"></label>
      <label>Full name <input name="name" maxlength="80" value="${esc(p.name)}" autocomplete="name"></label>
      <div class="onb-two">
        <label>Date of birth <input name="dob" type="date" value="${esc(p.dob)}"><small>Many awards have age limits</small></label>
        <label>Gender <select name="gender">${['', 'Woman', 'Man', 'Non-binary', 'Prefer not to say'].map(g => `<option ${p.gender === g ? 'selected' : ''} value="${g}">${g || 'Choose…'}</option>`).join('')}</select><small>Optional. Some are for women</small></label>
      </div>
      <label>Email <input name="email" type="email" maxlength="120" value="${esc(p.email)}" autocomplete="email"><small>Optional, for application forms</small></label>
      <div class="onb-two">
        <label>Country <input name="country" maxlength="60" value="${esc(p.country)}" placeholder="Nigeria" autocomplete="country-name"></label>
        <label>City <input name="city" maxlength="60" value="${esc(p.city)}" placeholder="Lagos" autocomplete="address-level2"></label>
      </div>
      <label>School <input name="school" maxlength="120" value="${esc(p.school)}" placeholder="e.g. LASUSTECH"></label>
      <label>Course <input name="course" maxlength="120" value="${esc(p.course)}" placeholder="e.g. Mechatronics Engineering"></label>
      <div class="onb-two">
        <label>Level <select name="level">${[''].concat(lv).map(l => `<option ${p.level === l ? 'selected' : ''} value="${esc(l)}">${esc(l) || 'Choose…'}</option>`).join('')}</select></label>
        <label>Graduating <input name="gradYear" inputmode="numeric" maxlength="4" value="${esc(p.gradYear)}" placeholder="2028"></label>
      </div>
      <label>CGPA <input name="cgpa" maxlength="20" value="${esc(p.cgpa)}" placeholder="e.g. 4.24 / 5.00"><small>Optional. Helps with “minimum CGPA” rules</small></label>
      <label>What are you into?</label>${chips(INTERESTS, p.interests, 'interests')}
      <label>What are you looking for?</label>${chips(GOALS, p.goals, 'goals')}
      <button class="btn primary onb-ok" type="submit">${edit ? 'Save' : 'Save & finish 🐝'}</button>
    </form>`, edit ? 'close' : 'done');
  $('#onb-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target), out = {};
    for (const [k, v] of f.entries()) if (String(v).trim()) out[k] = String(v).trim();
    root.querySelectorAll('[data-chips]').forEach(c => { const on = [...c.querySelectorAll('[aria-pressed="true"]')].map(b => b.textContent); if (on.length) out[c.dataset.chips] = on.join(', '); });
    if (!out.nickname){ e.target.nickname.focus(); return; }
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Saving…';
    const j = await saveProfile(out);
    if (!j.ok && H.toast) H.toast('Saved on your phone. It’ll reach your tracker next time you’re online.');
    if (editOnly){ close(); if (H.toast && j.ok && !j.oldScript) H.toast('Profile saved ✓'); if (H.onDone) H.onDone(); }
    else step('done');
  });
}
function done(){
  const p = profile();
  LS.set('ft-onb', 'done');
  shell(`<div class="onb-pic">${bee('party', 120)}</div>
    <h1>${p.nickname ? 'Nice to meet you, ' + esc(p.nickname) + '!' : 'You’re all set!'}</h1>
    <p>Your hive is ready. Save the next opportunity you see and watch me work. And I <i>will</i> remind you. 🐝</p>
    <div class="onb-row"><button class="btn primary onb-ok" data-onb="finish">Into the hive →</button></div>`);
}
function onClick(e){
  if (e.target.closest('#onb-stage')) return knock();
  const c = e.target.closest('[data-chips] button'); if (c){ c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); return; }
  const a = e.target.closest('[data-onb]'); if (!a) return;
  const v = a.dataset.onb;
  if (v === 'next'){ if (tourIdx < SLIDES().length - 1){ tourIdx++; tour(); } else step('setup'); return; }
  if (v === 'back'){ tourIdx = Math.max(0, tourIdx - 1); tour(); return; }
  if (v === 'connect'){ if (window.Android && Android.openSettings) Android.openSettings(); return; }
  if (v === 'recheck'){ if (connected()) step('profile'); else if (H.toast) H.toast('Not connected yet. Paste your script link in Settings first.'); return; }
  if (v === 'close'){ close(); return; }
  if (v === 'finish'){ close(); if (H.onDone) H.onDone(); return; }
  step(v);
}
const $ = s => root ? root.querySelector(s) : document.querySelector(s);

/* ---------------- carousel combiner: several images of ONE post → one tall image ---------------- */
function loadImg(file){
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('bad image')); }; i.src = u; });
}
async function combine(files){
  const imgs = [];
  for (const f of files.slice(0, 8)) { try { imgs.push(await loadImg(f)); } catch(e){} }
  if (!imgs.length) throw new Error('no images');
  const cols = imgs.length === 1 ? 1 : 2, cellW = cols === 1 ? 1400 : 760, gap = 16;
  const scaled = imgs.map(i => ({ i, h: Math.round(i.height * cellW / i.width) }));
  const rows = []; for (let k = 0; k < scaled.length; k += cols) rows.push(scaled.slice(k, k + cols));
  const rowH = rows.map(r => Math.max(...r.map(x => x.h)));
  let W = cols * cellW + (cols + 1) * gap, H = rowH.reduce((a, b) => a + b, 0) + (rows.length + 1) * gap;
  const k = Math.min(1, 4800 / H); // keep it a sensible size for the AI
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext('2d'); g.scale(k, k); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  g.font = 'bold 34px sans-serif'; g.textBaseline = 'top';
  let y = gap, n = 0;
  rows.forEach((r, ri) => {
    r.forEach((x, ci) => {
      const X = gap + ci * (cellW + gap);
      g.drawImage(x.i, X, y, cellW, x.h);
      n++; g.fillStyle = '#1E1606'; g.fillRect(X, y, 64, 50); g.fillStyle = '#FFC629'; g.fillText(String(n), X + 18, y + 8);
    });
    y += rowH[ri] + gap;
  });
  return { b64: c.toDataURL('image/jpeg', 0.75).split(',')[1], count: imgs.length };
}
/* asks "one post or separate?" — resolves 'one' | 'many' | null */
function askOnePost(n){
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'onb'; d.style.background = 'rgba(30,22,6,.5)'; d.style.justifyContent = 'flex-end';
    d.innerHTML = `<div class="onb-in" style="margin:auto auto 0"><div class="onb-form" style="text-align:center;align-items:center">
      <div style="width:80px">${bee('happy', 80)}</div>
      <h2>${n} images. Same post?</h2>
      <p>If they’re slides of one carousel or one flyer, I’ll read them together as <b>one</b> opportunity.</p>
      <button class="btn primary onb-ok" data-a="one">One post (combine them)</button>
      <button class="btn onb-ok" data-a="many">Separate posts</button>
      <button class="btn ghost" data-a="x">Cancel</button></div></div>`;
    d.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b && e.target !== d) return; d.remove(); res(!b ? null : b.dataset.a === 'x' ? null : b.dataset.a); });
    document.body.appendChild(d);
  });
}

window.FTWelcome = {
  init(helpers){ H = helpers || {}; },
  start(force){ const s = LS.get('ft-onb', ''); if (!force && s === 'done') return false; step(force ? 'welcome' : (STEPS.includes(s) ? s : 'welcome')); return true; },
  resume(){ if (root && LS.get('ft-onb', '') === 'setup') setup(); },   // back from Settings
  editProfile(){ profileForm(true); },
  profile, syncProfile, combine, askOnePost,
  isOpen(){ return !!root; },
  close, step,
};
})();
