// Offline tests for Code.gs: fakes Gmail, Sheets, Claude and WhatsApp, then runs the real code.
// Usage: node app-tracker/apps-script/test/run-tests.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const TZ = 'Africa/Lagos';
let NOW = new Date('2026-11-20T09:00:00Z');

function fmt(d, tz, pattern) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', second: '2-digit', weekday: 'long', hour12: false
  }).formatToParts(d).forEach(p => { parts[p.type] = p.value; });
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const monthShort = new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'short' }).format(d);
  const map = { yyyy: parts.year, MMM: monthShort, MM: parts.month, dd: parts.day, d: String(Number(parts.day)),
    HH: hour, H: String(Number(hour)), mm: parts.minute, ss: parts.second, EEEE: parts.weekday, EEE: parts.weekday.slice(0, 3) };
  return pattern.replace(/'T'|yyyy|MMM|MM|dd|d|HH|H|mm|ss|EEEE|EEE/g, t => (t === "'T'" ? 'T' : map[t]));
}

function makeEnv() {
  NOW = new Date('2026-11-20T09:00:00Z');
  const props = { ANTHROPIC_API_KEY: 'test', WHATSAPP_PHONE: '+2340000', CALLMEBOT_APIKEY: 'k', WEB_APP_URL: 'https://script.google.com/x/exec' };
  const sheets = {};
  const whatsapp = [];
  const claudeQueue = [];
  const claudeRequests = [];
  const messages = [];
  let uuid = 0;

  function makeSheet(name) {
    const rows = [];
    let frozen = 0;
    return {
      name, rows,
      getLastRow: () => rows.length,
      getLastColumn: () => (rows[0] || []).length,
      getMaxRows: () => 1000, getMaxColumns: () => 26,
      getFrozenRows: () => frozen, setFrozenRows: n => { frozen = n; },
      getRange: (r, c, nr, nc) => ({
        getValues: () => rows.slice(r - 1, r - 1 + nr).map(row => { const out = []; for (let i = 0; i < nc; i++) out.push(row[c - 1 + i] === undefined ? '' : row[c - 1 + i]); return out; }),
        setValue: v => { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; },
        setValues: vals => { vals.forEach((vr, i) => { while (rows.length < r + i) rows.push([]); vr.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = v; }); }); },
        setNumberFormat: () => {}
      }),
      getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
      appendRow: vals => {
        // Like Sheets with '@' format: everything is stored as text, booleans as TRUE/FALSE.
        rows.push(vals.map(v => typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : (typeof v === 'number' ? v : String(v))));
      }
    };
  }
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = makeSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: () => {},
    getUrl: () => 'https://sheet', getId: () => 'sheet1'
  };

  function thread(id, msgs, opts = {}) {
    const t = {
      id, msgs, spam: !!opts.spam, inbox: !opts.archived, labels: [], important: false,
      getId: () => id, getMessages: () => msgs, isInSpam: () => t.spam, isInInbox: () => t.inbox,
      moveToInbox: () => { t.spam = false; t.inbox = true; }, addLabel: l => t.labels.push(l), markImportant: () => { t.important = true; }
    };
    return t;
  }
  function msg(id, from, subject, body, date) {
    const m = { id, starred: false, getId: () => id, getFrom: () => from, getTo: () => 'me@example.com', getSubject: () => subject, getPlainBody: () => body, getDate: () => new Date(date), star: () => { m.starred = true; } };
    messages.push(m);
    return m;
  }
  const threads = [];

  const ctx = {
    console,
    Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    Session: { getScriptTimeZone: () => TZ, getEffectiveUser: () => ({ getEmail: () => 'me@example.com' }) },
    SpreadsheetApp: { openById: () => ss, create: () => ss },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger: () => {}, newTrigger: () => { const b = { timeBased: () => b, everyMinutes: () => b, atHour: () => b, everyDays: () => b, inTimezone: () => b, create: () => b }; return b; } },
    GmailApp: {
      search: q => { ctx.lastQuery = q; return threads.slice(); },
      getUserLabelByName: () => ({ name: 'AppTracker' }), createLabel: () => ({ name: 'AppTracker' })
    },
    Utilities: {
      getUuid: () => 'uuid-' + (++uuid) + '-0000-0000-000000000000',
      formatDate: fmt,
      parseDate: (s, tz) => {
        // Interpret s (yyyy-MM-ddTHH:mm:ss) as wall time in tz.
        const guess = new Date(s + 'Z');
        const offsetMin = (new Date(fmt(guess, tz, "yyyy-MM-dd'T'HH:mm:ss") + 'Z') - guess) / 6e4;
        return new Date(guess.getTime() - offsetMin * 6e4);
      }
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (url.startsWith('https://api.callmebot.com')) {
          whatsapp.push(decodeURIComponent(/text=([^&]*)/.exec(url)[1]));
          return { getResponseCode: () => 200, getContentText: () => 'Message queued' };
        }
        if (url === 'https://api.anthropic.com/v1/messages') {
          const req = JSON.parse(opts.payload);
          claudeRequests.push({ req, headers: opts.headers });
          const out = claudeQueue.shift();
          if (!out) throw new Error('unexpected Claude call');
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(out) }] }) };
        }
        return { getResponseCode: () => 200, getContentText: () => '<html><title>X</title><body>Applications close Dec 1. Results announced by Dec 20.</body></html>' };
      }
    },
    HtmlService: { createHtmlOutput: h => ({ html: h }) },
    ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } }
  };
  // Freeze "now" for Date() and Date.now() inside the script.
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(NOW.getTime()); else super(...a); }
    static now() { return NOW.getTime(); }
  }
  ctx.Date = FakeDate;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);
  return { ctx, props, sheets, whatsapp, claudeQueue, claudeRequests, threads, thread, msg, table: n => vm.runInContext(`readTable_('${n}')`, ctx) };
}

function analysis(over) {
  return Object.assign({
    relevant: true, case_ref: '', org: 'Acme', program: 'Acme Fellowship 2027', stage: 'received', outcome: 'none',
    closes_case: false, importance: 'info', headline: 'Acme received your application', summary: 'Received.',
    response_window_start: '', response_window_end: '', actions: [], sender_hints: ['acme.org']
  }, over);
}

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); } catch (e) { console.log('✗ ' + name); throw e; }
}

test('pure helpers', () => {
  const { ctx } = makeEnv();
  const q = vm.runInContext("buildQuery_(['acme.org','no-reply@greenhouse.io','bad hint'], '2d')", ctx);
  assert(q.startsWith('in:anywhere -in:trash -in:sent -in:chats newer_than:2d ('), q);
  assert(q.includes('from:(acme.org OR no-reply@greenhouse.io)'), q);
  assert(!q.includes('bad hint'));
  assert(!q.includes('{'));
  assert.strictEqual(vm.runInContext("mergeHints_('acme.org, gmail.com', ['ACME.org','https://jobs.acme.org/x','gmail.com'])", ctx), 'acme.org, jobs.acme.org');
  assert.strictEqual(vm.runInContext("parseDeadline_('2026-12-01').toISOString()", ctx), '2026-12-01T22:59:00.000Z');
  assert.strictEqual(vm.runInContext("parseDeadline_('2026-12-01T14:00').toISOString()", ctx), '2026-12-01T13:00:00.000Z');
  assert.strictEqual(vm.runInContext("lookbackMs_('3d')", ctx), 3 * 864e5);
  assert.strictEqual(vm.runInContext("isTrue_('TRUE') && !isTrue_('FALSE') && !isTrue_('')", ctx), true);
});

test('full lifecycle: receipt → window → acceptance with deadline → reminders → done', () => {
  const env = makeEnv();
  const { ctx } = env;
  vm.runInContext('setup()', ctx);
  assert(env.props.APP_TOKEN);

  // 1. Confirmation email arrives with a response window.
  env.threads.push(env.thread('t1', [env.msg('m1', 'Acme <apply@acme.org>', 'We received your application', 'Thanks! You will hear back between Dec 1 and Dec 10.', '2026-11-20T08:00:00Z')]));
  env.claudeQueue.push(analysis({ response_window_start: '2026-12-01', response_window_end: '2026-12-10' }));
  vm.runInContext('tick()', ctx);
  let cases = env.table('Cases');
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].status, 'open');
  assert.strictEqual(cases[0].window_end, '2026-12-10');
  assert(cases[0].sender_hints.includes('apply@acme.org'));
  assert.strictEqual(env.whatsapp.length, 0, 'info alerts are not sent to WhatsApp');
  const req = env.claudeRequests[0];
  assert.strictEqual(req.req.model, 'claude-opus-5-5');
  assert.strictEqual(req.req.output_config.format.type, 'json_schema');
  assert.strictEqual(req.req.fallbacks, 'default');
  assert.strictEqual(req.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');

  // Same email again is not re-processed.
  vm.runInContext('tick()', ctx);
  assert.strictEqual(env.claudeRequests.length, 1);

  // Next search includes the case's senders.
  assert(ctx.lastQuery.includes('from:(acme.org OR apply@acme.org)'), ctx.lastQuery);

  // 2. Window opens → heads-up.
  NOW = new Date('2026-12-01T08:00:00Z');
  vm.runInContext('tick()', ctx);
  assert(env.whatsapp.some(w => w.includes('Response window open')), env.whatsapp.join('\n---\n'));

  // 3. Acceptance lands in SPAM via a platform sender, with a confirm-by deadline.
  env.threads.push(env.thread('t2', [env.msg('m2', 'Acme via Submittable <noreply@submittable.com>', 'Congratulations!', 'You are accepted. Confirm your spot by Dec 3.', '2026-12-01T09:00:00Z')], { spam: true }));
  env.claudeQueue.push(analysis({
    case_ref: cases[0].id, stage: 'offer', outcome: 'accepted', importance: 'critical',
    headline: '🎉 Accepted into Acme Fellowship — confirm by Dec 3', summary: 'You got in.',
    actions: [{ description: 'Confirm your spot', deadline: '2026-12-03' }], sender_hints: ['submittable.com']
  }));
  NOW = new Date('2026-12-01T09:05:00Z');
  vm.runInContext('tick()', ctx);
  const t2 = env.threads[1];
  assert.strictEqual(t2.spam, false, 'rescued from spam');
  assert(t2.important);
  assert(env.threads[1].msgs[0].starred);
  const crit = env.whatsapp[env.whatsapp.length - 1];
  assert(crit.includes('🚨') && crit.includes('Was in SPAM') && crit.includes('Confirm your spot'), crit);
  assert(crit.includes('action=ack'), 'includes a tap-to-handle link');
  cases = env.table('Cases');
  assert.strictEqual(cases.length, 1, 'matched to the same case');
  assert.strictEqual(cases[0].outcome, 'accepted');
  assert.strictEqual(env.table('Actions').length, 1);

  // 4. Not handled → reminder after 3h, but not during quiet hours.
  const before = env.whatsapp.length;
  NOW = new Date('2026-12-01T10:00:00Z');
  vm.runInContext('tick()', ctx);
  assert.strictEqual(env.whatsapp.length, before, 'too soon to remind');
  NOW = new Date('2026-12-01T12:10:00Z');
  vm.runInContext('tick()', ctx);
  assert(env.whatsapp[env.whatsapp.length - 1].includes('Reminder #1'));
  const n = env.whatsapp.length;
  NOW = new Date('2026-12-01T23:30:00Z'); // 00:30 Lagos → quiet
  vm.runInContext('tick()', ctx);
  assert.strictEqual(env.whatsapp.filter(w => w.includes('Reminder')).length, env.whatsapp.slice(0, n).filter(w => w.includes('Reminder')).length, 'no repeat reminders in quiet hours');

  // 5. 24h before the deadline → countdown alert.
  NOW = new Date('2026-12-03T08:00:00Z');
  vm.runInContext('tick()', ctx);
  assert(env.whatsapp.some(w => /left: Confirm your spot/.test(w)), env.whatsapp.slice(-3).join('\n---\n'));

  // 6. Marking the action done silences its alerts.
  const actionId = env.table('Actions')[0].id;
  const res = vm.runInContext(`doPost({postData:{contents: JSON.stringify({token: '${env.props.APP_TOKEN}', action: 'action_done', id: '${actionId}'})}})`, ctx);
  assert.strictEqual(JSON.parse(res.text).ok, true);
  const open = env.table('Alerts').filter(a => a.action_id.includes(actionId) && a.acked !== true && String(a.acked).toLowerCase() !== 'true');
  assert.strictEqual(open.length, 0, 'all alerts about the action are acked');
  const sent = env.whatsapp.length;
  NOW = new Date('2026-12-03T14:00:00Z');
  vm.runInContext('tick()', ctx);
  assert.strictEqual(env.whatsapp.length, sent, 'no more nagging');

  // 7. Graduation email closes the case.
  env.threads.push(env.thread('t3', [env.msg('m3', 'Acme <hello@acme.org>', 'Congratulations, graduate!', 'You completed the fellowship.', '2026-12-03T13:00:00Z')]));
  env.claudeQueue.push(analysis({ case_ref: cases[0].id, stage: 'completed', outcome: 'accepted', closes_case: true, importance: 'important', headline: '🎓 Completed Acme Fellowship' }));
  NOW = new Date('2026-12-03T15:00:00Z');
  vm.runInContext('tick()', ctx);
  assert.strictEqual(env.table('Cases')[0].status, 'closed');
});

test('irrelevant mail, own mail and Claude errors', () => {
  const env = makeEnv();
  vm.runInContext('setup()', env.ctx);
  env.threads.push(env.thread('t1', [
    env.msg('m1', 'Shop <deals@shop.com>', 'Congratulations, 50% off!', 'sale', '2026-11-20T08:00:00Z'),
    env.msg('m2', 'Me <me@example.com>', 'Re: my application', 'hi', '2026-11-20T08:10:00Z')
  ]));
  env.claudeQueue.push({ relevant: false, case_ref: '', org: '', program: '', stage: 'other', outcome: 'none', closes_case: false, importance: 'info', headline: '', summary: '', response_window_start: '', response_window_end: '', actions: [], sender_hints: [] });
  vm.runInContext('tick()', env.ctx);
  assert.strictEqual(env.claudeRequests.length, 1, 'own sent mail skipped');
  assert.strictEqual(env.table('Cases').length, 0);
  assert.strictEqual(env.table('Processed').length, 1);

  // A failed Claude call leaves the email unprocessed so it is retried.
  env.threads.push(env.thread('t2', [env.msg('m3', 'X <a@x.org>', 'Interview invitation', 'hi', '2026-11-20T08:20:00Z')]));
  vm.runInContext('tick()', env.ctx); // queue empty → fetch throws
  assert.strictEqual(env.table('Processed').length, 1);
});

test('silence alert when window passes with no email', () => {
  const env = makeEnv();
  vm.runInContext('setup()', env.ctx);
  env.threads.push(env.thread('t1', [env.msg('m1', 'Beta <a@beta.io>', 'Application received', 'Results by Nov 25', '2026-11-20T08:00:00Z')]));
  env.claudeQueue.push(analysis({ org: 'Beta', program: 'Beta Internship', response_window_start: '2026-11-25', response_window_end: '2026-11-25' }));
  vm.runInContext('tick()', env.ctx);
  NOW = new Date('2026-11-26T10:00:00Z');
  vm.runInContext('tick()', env.ctx);
  assert(env.whatsapp.some(w => w.includes('No news from')), env.whatsapp.join('\n'));
  const count = env.whatsapp.length;
  vm.runInContext('tick()', env.ctx);
  assert.strictEqual(env.whatsapp.length, count, 'silence alert sent once');
});

test('web API: token, state, ack link, quick add', () => {
  const env = makeEnv();
  vm.runInContext('setup()', env.ctx);
  const tok = env.props.APP_TOKEN;
  assert.strictEqual(JSON.parse(vm.runInContext("doGet({parameter:{token:'nope'}}).text", env.ctx)).ok, false);
  env.claudeQueue.push({ org: 'Gamma', program: 'Gamma Scholarship', response_window_start: '2026-12-20', response_window_end: '2026-12-20', actions: [], sender_hints: ['gamma.edu'], summary: 'Results Dec 20.' });
  const add = JSON.parse(vm.runInContext(`doPost({postData:{contents: JSON.stringify({token:'${tok}', action:'add', url:'', text:'Applied to Gamma scholarship https://gamma.edu/apply'})}}).text`, env.ctx));
  assert.strictEqual(add.ok, true, JSON.stringify(add));
  assert.strictEqual(add.case.org, 'Gamma');
  assert(add.case.sender_hints.includes('gamma.edu'));
  const state = JSON.parse(vm.runInContext(`doGet({parameter:{token:'${tok}'}}).text`, env.ctx));
  assert.strictEqual(state.cases.length, 1);
  assert(!('_row' in state.cases[0]));

  vm.runInContext("createAlert_({case_id:'x', level:'critical', title:'T', body:'B'})", env.ctx);
  const id = env.table('Alerts')[0].id;
  const html = vm.runInContext(`doGet({parameter:{token:'${tok}', action:'ack', id:'${id}'}}).html`, env.ctx);
  assert(html.includes('Marked as handled'));
  assert.strictEqual(String(env.table('Alerts')[0].acked).toLowerCase(), 'true');
});

console.log(`\n${passed} test groups passed`);
