/* Follow-Through on the web (iPhone, iPad, laptop).
 * The dashboard was written for the Android app, which provides `window.Android`. This file provides the
 * same functions in the browser: it talks to your own Google Apps Script web app with fetch(), keeps notes,
 * streak and look in this browser, queues changes while offline, and adds a setup and settings screen. */
(function () {
  'use strict';
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  };
  var URL_KEY = 'ftw-url', QUEUE_KEY = 'ftw-queue', NOTES_KEY = 'ft-notes';
  var OFFLINE_OK = { update: 1, tipUpdate: 1, delete: 1, capture: 1 };
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

  function webUrl() { return LS.get(URL_KEY, ''); }
  function validUrl(u) { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysUntil(iso) {
    if (!iso) return null;
    var p = iso.split('-'), a = new Date(); a.setHours(0, 0, 0, 0);
    return Math.round((new Date(+p[0], p[1] - 1, +p[2]) - a) / 864e5);
  }

  /* ---------- talking to the script ---------- */
  function post(body, timeout) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeout || 330000) : 0;
    // text/plain keeps it a "simple" request (no CORS preflight); the script reads the body as JSON.
    return fetch(webUrl(), { method: 'POST', body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, redirect: 'follow' })
      .then(function (r) { clearTimeout(t); return r.text(); });
  }
  function queue() { return LS.json(QUEUE_KEY, []); }
  var flushing = null;
  function flush() {
    if (flushing) return flushing;
    var q = queue();
    if (!q.length || !webUrl()) return Promise.resolve();
    flushing = (function next() {
      var q2 = queue(); if (!q2.length) return Promise.resolve();
      return post(q2[0], 30000).then(function (txt) {
        var ok = false; try { ok = JSON.parse(txt).ok; } catch (e) {}
        if (!ok) throw new Error('not ok');
        var q3 = queue(); q3.shift(); LS.set(QUEUE_KEY, JSON.stringify(q3));
        return next();
      });
    })().catch(function () {}).then(function () { flushing = null; });
    return flushing;
  }
  window.addEventListener('online', function () { flush(); });

  /* ---------- notes' "remind me at 6pm tomorrow" (same rules as the Android app) ---------- */
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function parseWhen(text) {
    var s = ' ' + String(text || '').toLowerCase().replace(/\./g, '') + ' ';
    var now = new Date(), c = new Date(now); c.setSeconds(0, 0);
    var found = false, hasTime = false, m;
    if ((m = /in (an?|\d+) (minute|min|hour|hr|day)s?/.exec(s))) {
      var n = m[1].charAt(0) === 'a' ? 1 : +m[1], u = m[2];
      if (u.charAt(0) === 'm') c.setMinutes(c.getMinutes() + n); else if (u.charAt(0) === 'h') c.setHours(c.getHours() + n); else c.setDate(c.getDate() + n);
      return c.getTime();
    }
    if (s.indexOf(' tomorrow ') >= 0) { c.setDate(c.getDate() + 1); found = true; }
    else if (s.indexOf(' today ') >= 0) found = true;
    else for (var d = 0; d < 7; d++) if (s.indexOf(' ' + DAYS[d] + ' ') >= 0) { var diff = d - c.getDay(); if (diff <= 0) diff += 7; c.setDate(c.getDate() + diff); found = true; break; }
    var re = /(?:at |by )?(\d{1,2})(?::(\d{2}))? ?(am|pm|o'?clock)?/g, t;
    while ((t = re.exec(s))) {
      var ap = t[3], explicit = ap || t[2] || /^(at|by)/.test(t[0]);
      if (!explicit) continue;
      var h = +t[1], mi = t[2] ? +t[2] : 0;
      if (h > 23 || mi > 59) continue;
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (!ap && h >= 1 && h <= 7) h += 12;
      c.setHours(h, mi); hasTime = found = true; break;
    }
    if (!hasTime) {
      var parts = [[' tonight ', 20], [' evening ', 18], [' afternoon ', 14], [' morning ', 9]];
      for (var i = 0; i < parts.length; i++) if (s.indexOf(parts[i][0]) >= 0) { c.setHours(parts[i][1], 0); hasTime = found = true; break; }
    }
    if (!found) return 0;
    if (!hasTime) c.setHours(9, 0);
    if (c < now) c.setDate(c.getDate() + 1);
    return c.getTime();
  }

  /* ---------- calendar file, so the phone itself rings for a note's reminder ---------- */
  function icsFor(note) {
    var pad = function (x) { return ('0' + x).slice(-2); };
    var f = function (ms) { var d = new Date(ms); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z'; };
    var title = String(note.text || 'Reminder').split('\n')[0].slice(0, 80).replace(/[,;\\]/g, ' ');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Follow-Through//EN', 'BEGIN:VEVENT', 'UID:' + note.id + '@follow-through',
      'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(note.remindAt), 'DTEND:' + f(note.remindAt + 15 * 60000), 'SUMMARY:🐝 ' + title,
      'DESCRIPTION:From your Follow-Through notes', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + title, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function download(name, mime, content) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  /* ---------- small pop-up screens (setup, settings, voice) ---------- */
  var css = document.createElement('style');
  css.textContent = '.ftw-scrim{position:fixed;inset:0;background:rgba(30,22,6,.45);z-index:60;display:flex;align-items:flex-end;justify-content:center}' +
    '.ftw-card{background:var(--card,#FFFDF4);color:var(--ink,#1E1606);border:2.5px solid var(--stroke,#1E1606);border-bottom:0;border-radius:28px 24px 0 0;width:100%;max-width:640px;max-height:92vh;overflow:auto;padding:18px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -6px 0 rgba(0,0,0,.08)}' +
    '.ftw-card h3{font-family:var(--f-d,cursive);font-size:1.6rem;margin:0 0 6px}.ftw-card p,.ftw-card li{line-height:1.45}.ftw-card ol{padding-left:22px;margin:8px 0}.ftw-card li{margin:6px 0}' +
    '.ftw-card input{width:100%;box-sizing:border-box;border:2.5px solid var(--stroke,#1E1606);border-radius:14px;padding:11px 12px;font:inherit;background:var(--card,#fff);color:inherit}' +
    '.ftw-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.ftw-msg{font-size:.92rem;min-height:1.2em;margin:6px 0}.ftw-msg.ok{color:var(--ok,#2C7A4B)}.ftw-msg.no{color:var(--rose,#D9533B)}' +
    '.ftw-sec{border-top:2px dashed var(--line,#E8D08A);margin-top:16px;padding-top:12px}.ftw-sec h4{font-family:var(--f-d,cursive);font-size:1.25rem;margin:0 0 4px}' +
    '.ftw-small{font-size:.85rem;color:var(--muted,#6E5A2C)}.ftw-card code{background:var(--sun-soft,#FFF0C0);padding:1px 5px;border-radius:6px;font-size:.85em;word-break:break-all}' +
    '.ftw-card details{margin:8px 0}.ftw-card summary{cursor:pointer;font-weight:700}';
  document.head.appendChild(css);

  function modal(html, onReady) {
    close();
    var s = document.createElement('div'); s.className = 'ftw-scrim'; s.id = 'ftw';
    s.innerHTML = '<div class="ftw-card" role="dialog" aria-modal="true">' + html + '</div>';
    s.addEventListener('click', function (e) { if (e.target === s || e.target.closest('[data-ftw-close]')) close(); });
    document.body.appendChild(s);
    if (onReady) onReady(s);
    return s;
  }
  function close() { var m = document.getElementById('ftw'); if (m) m.remove(); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function btn(label, attrs, primary) { return '<button class="btn' + (primary ? ' primary' : '') + '" ' + (attrs || '') + '>' + label + '</button>'; }
  function toast(m) { var t = document.getElementById('toast'); if (!t) return alert(m); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3200); }

  function settings(first) {
    var url = webUrl();
    var installTip = isIOS && !standalone
      ? '<div class="ftw-sec"><h4>📲 Put it on your Home Screen</h4><p>In Safari tap <b>Share</b> <span aria-hidden="true">⬆️</span> → <b>Add to Home Screen</b>. Then open Follow-Through from your Home Screen and connect it there (the Home Screen app keeps its own settings).</p></div>' : '';
    modal('<h3>' + (first ? 'Welcome to Follow-Through 🐝' : 'Settings') + '</h3>' +
      (first ? '<p>Your opportunities live in <b>your own</b> Google Sheet, run by a small script in <b>your</b> Google account. Nobody else can see them. Setup takes about 10 minutes, once.</p>' : '') +
      installTip +
      '<div class="ftw-sec"><h4>1. Your tracker script</h4>' +
      '<details' + (url ? '' : ' open') + '><summary>How to make one (first time)</summary><ol>' +
      '<li>Tap <b>Copy the script</b> below.</li>' +
      '<li>Open <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> (on iPhone, tap <b>aA</b> → <b>Request Desktop Website</b> if it looks squashed) and make a <b>New project</b>.</li>' +
      '<li>Delete the sample code, paste, and tap <b>Save</b> 💾.</li>' +
      '<li>Choose <b>authorize</b> in the function menu → <b>Run</b> → allow everything (Google says it is unverified: <b>Advanced → Go to … → Allow</b>; it is your own script).</li>' +
      '<li><b>Deploy → New deployment</b> → ⚙ <b>Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. Deploy and copy the <b>Web app URL</b> (ends in <code>/exec</code>).</li>' +
      '<li>Paste it below. Keep it private: it is the key to your tracker.</li></ol>' +
      '<div class="ftw-row">' + btn('Copy the script', 'data-ftw="copycode"') + '</div></details>' +
      '<input id="ftw-url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(url) + '">' +
      '<div class="ftw-row">' + btn('Save &amp; test', 'data-ftw="save"', true) + '</div><div class="ftw-msg" id="ftw-msg"></div></div>' +
      '<div class="ftw-sec"><h4>2. Instant sorting &amp; AI help (free)</h4><p class="ftw-small">Get a free Gemini key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> and paste it here. It is stored only in your own script.</p>' +
      '<input id="ftw-key" type="password" autocomplete="off" placeholder="Gemini API key">' +
      '<div class="ftw-row">' + btn('Save key', 'data-ftw="key"') + '</div><div class="ftw-msg" id="ftw-kmsg"></div></div>' +
      (isIOS ? '<div class="ftw-sec"><h4>3. Save from any app (iPhone)</h4>' +
        '<details><summary>“Share → Save to Follow-Through”</summary><ol>' +
        '<li>Open <b>Shortcuts</b> → <b>+</b>. Name it <b>Save to Follow-Through</b>.</li>' +
        '<li>Tap ⓘ → turn on <b>Show in Share Sheet</b>.</li>' +
        '<li>Add <b>Get Contents of URL</b>. URL: your Web app URL. Tap ▸: Method <b>POST</b>, Request Body <b>JSON</b>, add fields: <code>action</code> = <code>capture</code>, <code>app</code> = <code>iPhone share</code>, <code>url</code> = <b>Shortcut Input</b>, <code>screenText</code> = <b>Shortcut Input</b>.</li>' +
        '<li>Add <b>Show Notification</b>: “Saved to Follow-Through 🐝”.</li>' +
        '<li>Now in Safari, Instagram, X… tap <b>Share</b> → <b>Save to Follow-Through</b>.</li></ol></details>' +
        '<details><summary>Double-tap the back of the phone to save a screenshot</summary><ol>' +
        '<li>New shortcut <b>Bisi screenshot</b>: add <b>Take Screenshot</b>, then <b>Base64 Encode</b> (tap ▸, Line Breaks: <b>None</b>).</li>' +
        '<li>Add <b>Get Contents of URL</b>: your Web app URL, POST, JSON: <code>action</code> = <code>capture</code>, <code>app</code> = <code>Screenshot</code>, <code>imageBase64</code> = <b>Base64 Encoded</b>.</li>' +
        '<li>Add <b>Show Notification</b>: “Saved 🐝”.</li>' +
        '<li>Settings → Accessibility → Touch → <b>Back Tap</b> → <b>Double Tap</b> → <b>Bisi screenshot</b>.</li></ol>' +
        '<p class="ftw-small">Gemini reads the screenshot and fills in the details.</p></details></div>' : '') +
      '<div class="ftw-sec"><h4>Reminders</h4><p class="ftw-small">Your script emails you every morning, before deadlines and when you ignore things. For notes, tap <b>Add to Calendar</b> after saving one with a time so your phone rings.</p></div>' +
      '<div class="ftw-row" style="justify-content:flex-end">' + btn(first && !url ? 'Look around first' : 'Done', 'data-ftw-close') + '</div>',
    function (root) {
      root.addEventListener('click', function (e) {
        var a = e.target.closest('[data-ftw]'); if (!a) return;
        var act = a.getAttribute('data-ftw');
        if (act === 'copycode') {
          a.textContent = 'Copying…';
          fetch('Code.gs', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (code) {
            return navigator.clipboard.writeText(code).then(function () { a.textContent = 'Copied ✓ Now paste it in Apps Script'; });
          }).catch(function () { a.textContent = 'Couldn’t copy. Open the script file instead'; window.open('Code.gs', '_blank'); });
        }
        if (act === 'save') {
          var u = root.querySelector('#ftw-url').value.trim().replace(/\?.*$/, ''), msg = root.querySelector('#ftw-msg');
          if (!validUrl(u)) { msg.className = 'ftw-msg no'; msg.textContent = 'That doesn’t look right. It should start with https://script.google.com/macros/s/ and end with /exec'; return; }
          msg.className = 'ftw-msg'; msg.textContent = 'Testing…';
          fetch(u + '?action=ping').then(function (r) { return r.json(); }).then(function (j) {
            if (!j.ok) throw new Error(j.error || 'error');
            LS.set(URL_KEY, u); msg.className = 'ftw-msg ok';
            msg.textContent = 'Connected to “' + j.sheet + '” ✓' + (+j.schema < 8 ? ' (your script is old: paste the new one and deploy a new version)' : '');
            setTimeout(function () { close(); if (window.__onResume) window.__onResume(); }, 900);
          }).catch(function () {
            msg.className = 'ftw-msg no';
            msg.textContent = 'Couldn’t reach it. Check you copied the whole link, that “Who has access” is Anyone, and that you ran authorize.';
          });
        }
        if (act === 'key') {
          var k = root.querySelector('#ftw-key').value.trim(), km = root.querySelector('#ftw-kmsg');
          if (!webUrl()) { km.className = 'ftw-msg no'; km.textContent = 'Connect your tracker first (step 1).'; return; }
          km.className = 'ftw-msg'; km.textContent = 'Checking the key…';
          post({ action: 'setKey', key: k }, 60000).then(function (t) { return JSON.parse(t); }).then(function (j) {
            km.className = 'ftw-msg ' + (j.ok ? 'ok' : 'no'); km.textContent = j.ok ? 'Key saved ✓ New saves are sorted in seconds.' : (j.error || 'Didn’t work.');
          }).catch(function () { km.className = 'ftw-msg no'; km.textContent = 'Couldn’t reach your tracker.'; });
        }
      });
    });
  }

  /* voice: the browser's speech recognition where it exists, otherwise type it */
  function voice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return choose(prompt('Tell Bisi what to save (e.g. “Call mum at 6pm”):') || '');
    var r = new SR(); r.lang = navigator.language || 'en-GB'; r.interimResults = true;
    var said = '';
    modal('<h3>Listening… 🎤</h3><p id="ftw-said" class="ftw-small">Say it like “Submit the form tomorrow at 9am”.</p><div class="ftw-row">' + btn('Stop', 'data-ftw-stop') + btn('Cancel', 'data-ftw-close') + '</div>',
      function (root) { root.querySelector('[data-ftw-stop]').onclick = function () { r.stop(); }; });
    r.onresult = function (e) { said = Array.prototype.map.call(e.results, function (x) { return x[0].transcript; }).join(' '); var p = document.getElementById('ftw-said'); if (p) p.textContent = '“' + said + '”'; };
    r.onerror = function () { close(); choose(prompt('Voice didn’t work here. Type it instead:') || ''); said = ''; };
    r.onend = function () { if (said.trim()) choose(said.trim()); else if (document.getElementById('ftw')) close(); };
    try { r.start(); } catch (e) { close(); choose(prompt('Tell Bisi what to save:') || ''); }
  }
  function choose(text) {
    text = String(text || '').trim(); if (!text) { close(); return; }
    var when = parseWhen(text);
    var label = when ? new Date(when).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    modal('<h3>Save this as…</h3><p>“' + esc(text) + '”' + (when ? '<br>⏰ ' + esc(label) : '') + '</p><div class="ftw-row">' +
      (when ? btn('⏰ Reminder', 'data-c="rem"', true) : '') + btn('📝 Note', 'data-c="note"', !when) + btn('🎯 Opportunity', 'data-c="opp"') + btn('Cancel', 'data-ftw-close') + '</div>',
      function (root) {
        root.addEventListener('click', function (e) {
          var c = e.target.closest('[data-c]'); if (!c) return;
          var k = c.getAttribute('data-c');
          if (k === 'opp') {
            close(); toast('Saving…');
            window.Android.request(JSON.stringify({ action: 'capture', app: 'Voice note', screenText: 'Spoken note: ' + text, note: text }), '__voice');
            return;
          }
          var n = { text: text.charAt(0).toUpperCase() + text.slice(1), items: [], color: k === 'rem' ? 'honey' : 'mint', pinned: false, remindAt: k === 'rem' ? when : 0, done: false, voice: true };
          var saved = JSON.parse(api.notesSave(JSON.stringify(n)));
          close();
          if (window.__openNote && document.getElementById('p-notes')) { var nq = document.querySelector('.tabbar [data-go="notes"]'); if (nq) nq.click(); }
          if (k === 'rem') calendarOffer(saved); else toast('Saved to your notes. 📝');
        });
      });
  }
  function calendarOffer(n) {
    if (!n || !n.remindAt || n.remindAt < Date.now()) return;
    var label = new Date(n.remindAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    modal('<h3>Saved ⏰</h3><p>Want your phone to ring at <b>' + esc(label) + '</b>? Add it to your calendar (a web app can’t ring by itself).</p><div class="ftw-row">' +
      btn('📅 Add to Calendar', 'data-cal', true) + btn('No thanks', 'data-ftw-close') + '</div>',
      function (root) { root.querySelector('[data-cal]').onclick = function () { download('reminder.ics', 'text/calendar', icsFor(n)); close(); }; });
  }

  /* ---------- the stand-in for the Android app ---------- */
  var lastNotes = {};
  var api = {
    web: true,
    request: function (json, id) {
      var req = {}; try { req = JSON.parse(json); } catch (e) {}
      var reply = function (obj) {
        if (id === '__voice') { toast(obj.ok ? (obj.queued ? 'Saved on your phone; it’ll send when you’re online.' : 'Saved to your tracker 🐝') : 'Couldn’t save that.'); if (obj.ok && window.__onResume) window.__onResume(); return; }
        if (window.__fromApp) window.__fromApp(id, typeof obj === 'string' ? obj : JSON.stringify(obj));
      };
      if (!webUrl()) return reply({ ok: false, error: 'not_connected' });
      var go = function () {
        post(req).then(function (txt) {
          var j; try { j = JSON.parse(txt); } catch (e) { j = { ok: false, error: 'bad_response' }; }
          if (req.action === 'dashboard' && j.ok) { LS.set('ftw-dash-ok', String(Date.now())); }
          reply(j);
        }).catch(function () {
          if (OFFLINE_OK[req.action]) { var q = queue(); q.push(req); LS.set(QUEUE_KEY, JSON.stringify(q)); reply({ ok: true, queued: true }); }
          else reply({ ok: false, error: 'network' });
        });
      };
      if (req.action === 'dashboard' && queue().length) flush().then(go); else go();
    },
    queued: function () { return queue().length; },
    openUrl: function (u) { if (/^https?:\/\//.test(u)) window.open(u, '_blank', 'noopener'); },
    saveDashboard: function () {},
    markActive: function () {
      var t = today(), last = LS.get('ftw-active', '');
      if (t === last) return;
      var s = daysUntil(last) === -1 ? (+LS.get('ftw-streak', '0') + 1) : 1;
      LS.set('ftw-active', t); LS.set('ftw-streak', String(s));
    },
    streak: function () { var d = daysUntil(LS.get('ftw-active', '')); return (d === 0 || d === -1) ? +LS.get('ftw-streak', '0') : 0; },
    lostStreak: function () { var d = daysUntil(LS.get('ftw-active', '')), s = +LS.get('ftw-streak', '0'); return (d !== null && d < -1 && d >= -3 && s >= 2) ? s : 0; },
    getSkin: function () { return LS.get('ft-skin', 'hive'); },
    setSkin: function (s) { LS.set('ft-skin', s === 'garden' ? 'garden' : 'hive'); },
    getMode: function () { return LS.get('ft-mode', ''); },
    setMode: function (m) { LS.set('ft-mode', m); },
    webAppUrl: function () { return webUrl(); },
    copy: function (text) { if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {}); },
    notesGet: function () { return JSON.stringify(LS.json(NOTES_KEY, [])); },
    notesSave: function (json) {
      var n = JSON.parse(json), list = LS.json(NOTES_KEY, []), now = Date.now();
      if (!n.id) { n.id = 'n' + now.toString(36) + Math.floor(Math.random() * 999); n.created = now; }
      n.updated = now;
      var i = list.findIndex(function (x) { return x.id === n.id; });
      var before = i >= 0 ? list[i].remindAt : 0;
      if (i >= 0) list[i] = n; else list.push(n);
      LS.set(NOTES_KEY, JSON.stringify(list));
      // a new or changed reminder time: offer to put it in the phone's calendar
      if (n.remindAt && n.remindAt !== before && n.remindAt > now && !n.voice) setTimeout(function () { calendarOffer(n); }, 500);
      return JSON.stringify(n);
    },
    notesDelete: function (id) { LS.set(NOTES_KEY, JSON.stringify(LS.json(NOTES_KEY, []).filter(function (x) { return x.id !== id; }))); },
    notesParse: function (text) { return parseWhen(text); },
    voice: voice,
    pasteLink: function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { var u = prompt('Paste the link:'); if (u && window.__clip) window.__clip(u.trim()); return; }
      navigator.clipboard.readText().then(function (t) {
        var m = /https?:\/\/\S+/.exec(t || '');
        if (m && window.__clip) window.__clip(m[0]); else toast('Copy a link first, then tap Paste a link.');
      }).catch(function () { var u = prompt('Paste the link:'); if (u && window.__clip) window.__clip(u.trim()); });
    },
    saveFile: function (name, mime, content) { download(name, mime, content); toast('Downloaded ' + name); },
    printHtml: function (html) {
      var w = window.open('', '_blank');
      if (!w) { download('follow-through.html', 'text/html', html); return; }
      w.document.write(html); w.document.close(); setTimeout(function () { w.print(); }, 400);
    },
    openSettings: function () { settings(false); }
  };
  window.Android = api;

  /* app came back to the front: refresh, like the Android app's onResume */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { flush(); if (window.__onResume) window.__onResume(); }
  });
  /* first visit: the welcome / setup screen */
  window.addEventListener('load', function () {
    document.documentElement.setAttribute('data-platform', 'web');
    if (!webUrl() && !LS.get('ftw-welcomed', '')) { LS.set('ftw-welcomed', '1'); settings(true); }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();
