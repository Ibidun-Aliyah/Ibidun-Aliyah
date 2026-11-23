/**
 * AppTracker — follows your applications from "we received it" to the final email.
 *
 * Runs inside YOUR Google account (Apps Script). Every few minutes it:
 *   1. Asks Gmail (server-side search) only for emails that look application-related.
 *   2. Sends those few emails to Claude, which decides if they really are, and pulls out
 *      the organisation, stage, outcome, response window and any "do X by DATE" actions.
 *   3. Keeps each application as a "case" in a Google Sheet.
 *   4. Pins important emails (star + important + label, rescues them from Spam),
 *      alerts you on WhatsApp, and keeps reminding you until you mark things handled.
 *   5. Serves a small JSON API that the Android app reads.
 *
 * Setup: see README.md. In short: set Script Properties, run setup(), deploy as web app.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

var DEFAULTS = {
  CLAUDE_MODEL: 'claude-opus-5-5',
  CLAUDE_EFFORT: 'low',
  REMIND_EVERY_HOURS: '3',      // how often an unhandled critical alert is re-sent on WhatsApp
  MAX_REMINDERS: '12',          // stop nagging about one alert after this many sends
  QUIET_START_HOUR: '23',       // no repeat reminders between these hours (first alerts still go out)
  QUIET_END_HOUR: '6',
  LOOKBACK: '2d',               // how far back each Gmail search looks
  MAX_EMAILS_PER_RUN: '15',
  DIGEST_HOUR: '7'
};

var KEYWORDS = [
  'application', 'applied', 'applying', 'submission', 'submitted', 'received your',
  'shortlisted', 'shortlist', 'interview', 'assessment', 'congratulations', 'offer',
  'admission', 'admitted', 'accepted', 'acceptance', 'unfortunately', 'regret',
  'fellowship', 'scholarship', 'internship', 'cohort', 'bootcamp', 'programme', 'program',
  'onboarding', 'orientation', 'next steps', 'next stage', 'waitlist', 'waitlisted',
  'selected', 'selection', 'candidate', 'candidacy', 'grant', 'award', 'deadline',
  'confirm your', 'graduation', 'certificate'
];

var GMAIL_LABEL = 'AppTracker';
var STAGES = ['applied', 'received', 'screening', 'assessment', 'interview', 'decision',
  'offer', 'onboarding', 'in_progress', 'completed', 'other'];
var OUTCOMES = ['none', 'shortlisted', 'accepted', 'waitlisted', 'rejected', 'withdrawn'];
var IMPORTANCE = ['critical', 'important', 'info'];
var ACTION_THRESHOLDS_HOURS = [72, 24, 6, 1];

var SHEETS = {
  Cases: ['id', 'created', 'updated', 'status', 'org', 'program', 'stage', 'outcome',
    'sender_hints', 'window_start', 'window_end', 'window_open_alerted', 'silence_alerted',
    'last_email_at', 'last_subject', 'last_link', 'source_url', 'summary', 'history'],
  Actions: ['id', 'case_id', 'description', 'deadline', 'done', 'created', 'done_at',
    'reminded', 'link'],
  Alerts: ['id', 'case_id', 'action_id', 'level', 'title', 'body', 'link', 'created',
    'acked', 'acked_at', 'last_sent', 'send_count'],
  Processed: ['msg_id', 'at', 'relevant', 'case_id', 'subject']
};

function cfg(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return (v === null || v === '') ? (DEFAULTS[key] !== undefined ? DEFAULTS[key] : '') : v;
}

function tz() {
  return Session.getScriptTimeZone() || 'Africa/Lagos';
}

// ---------------------------------------------------------------------------
// One-time setup
// ---------------------------------------------------------------------------

/** Run this once from the editor. Creates the sheet, the token and the timers. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = getSpreadsheet_();
  Object.keys(SHEETS).forEach(function (name) { ensureSheet_(ss, name, SHEETS[name]); });
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  if (!props.getProperty('APP_TOKEN')) {
    props.setProperty('APP_TOKEN', Utilities.getUuid().replace(/-/g, ''));
  }

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(Number(cfg('DIGEST_HOUR')))
    .everyDays(1).inTimezone(tz()).create();

  getLabel_();

  var missing = ['ANTHROPIC_API_KEY'].filter(function (k) { return !props.getProperty(k); });
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('APP_TOKEN (paste into the Android app): ' + props.getProperty('APP_TOKEN'));
  if (missing.length) Logger.log('⚠️ Still missing Script Properties: ' + missing.join(', '));
  if (!props.getProperty('WHATSAPP_PHONE') || !props.getProperty('CALLMEBOT_APIKEY')) {
    Logger.log('ℹ️ WhatsApp not configured (WHATSAPP_PHONE + CALLMEBOT_APIKEY). Alerts will only go to the app.');
  }
  Logger.log('Next: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). ' +
    'Then put the /exec URL in Script Property WEB_APP_URL and in the Android app.');
}

/** Sends a test WhatsApp message. */
function testWhatsApp() {
  var ok = sendWhatsApp_('✅ AppTracker is connected. Important application emails will show up here.');
  Logger.log(ok ? 'Sent. Check WhatsApp.' : 'Failed. Check WHATSAPP_PHONE and CALLMEBOT_APIKEY.');
}

/** Runs Claude on your most recent matching email without saving anything. */
function testClaude() {
  var threads = GmailApp.search(buildQuery_([]), 0, 1);
  if (!threads.length) { Logger.log('No matching emails in the last ' + cfg('LOOKBACK')); return; }
  var msgs = threads[0].getMessages();
  var r = analyzeEmail_(emailForPrompt_(msgs[msgs.length - 1]), []);
  Logger.log(JSON.stringify(r, null, 2));
}

/** Re-scans a longer period, e.g. after first install. Edit the value and run. */
function backfill() {
  runCheck_('30d', 60);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

function tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    runCheck_(cfg('LOOKBACK'), Number(cfg('MAX_EMAILS_PER_RUN')));
    runTimeChecks_(new Date());
    runReminders_(new Date());
  } finally {
    lock.releaseLock();
  }
}

function runCheck_(lookback, maxEmails) {
  if (!cfg('ANTHROPIC_API_KEY')) { Logger.log('ANTHROPIC_API_KEY not set'); return; }
  var processed = {};
  readTable_('Processed').forEach(function (r) { processed[r.msg_id] = true; });

  var cases = readTable_('Cases');
  var openCases = cases.filter(function (c) { return c.status === 'open'; });
  var hints = [];
  openCases.forEach(function (c) { hints = hints.concat(splitHints_(c.sender_hints)); });

  var query = buildQuery_(hints, lookback);
  var threads = GmailApp.search(query, 0, 50);
  var since = Date.now() - lookbackMs_(lookback);
  var todo = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (processed[m.getId()]) return;
      if (m.getDate().getTime() < since) return;
      if (isFromMe_(m)) return;
      todo.push({ msg: m, thread: t });
    });
  });
  todo.sort(function (a, b) { return a.msg.getDate() - b.msg.getDate(); });
  todo = todo.slice(0, maxEmails);

  todo.forEach(function (item) {
    var m = item.msg;
    var result;
    try {
      result = analyzeEmail_(emailForPrompt_(m), openCases);
    } catch (err) {
      Logger.log('Claude error for "' + m.getSubject() + '": ' + err);
      return; // not marked processed → retried next run
    }
    var caseId = '';
    if (result && result.relevant) {
      caseId = applyAnalysis_(result, m, item.thread);
      openCases = readTable_('Cases').filter(function (c) { return c.status === 'open'; });
    }
    appendRow_('Processed', {
      msg_id: m.getId(), at: new Date(), relevant: !!(result && result.relevant),
      case_id: caseId, subject: m.getSubject()
    });
  });
}

/** Gmail search that only returns likely application emails (runs on Google's side). */
function buildQuery_(senderHints, lookback) {
  var terms = KEYWORDS.map(function (k) { return k.indexOf(' ') >= 0 ? '"' + k + '"' : k; });
  var froms = (senderHints || []).filter(function (h) { return /^[\w.+-]*@?[\w-]+(\.[\w-]+)+$/.test(h); });
  if (froms.length) terms.push('from:(' + froms.join(' OR ') + ')');
  return 'in:anywhere -in:trash -in:sent -in:chats newer_than:' + (lookback || cfg('LOOKBACK')) +
    ' (' + terms.join(' OR ') + ')';
}

function isFromMe_(m) {
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  return (m.getFrom() || '').toLowerCase().indexOf(me) >= 0;
}

function emailForPrompt_(m) {
  var body = m.getPlainBody() || '';
  if (body.length > 20000) body = body.slice(0, 20000) + '\n[...email continues...]';
  return {
    from: m.getFrom(),
    to: m.getTo(),
    subject: m.getSubject(),
    date: Utilities.formatDate(m.getDate(), tz(), "yyyy-MM-dd'T'HH:mm"),
    body: body
  };
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------

var ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    relevant: { type: 'boolean' },
    case_ref: { type: 'string' },
    org: { type: 'string' },
    program: { type: 'string' },
    stage: { type: 'string', enum: STAGES },
    outcome: { type: 'string', enum: OUTCOMES },
    closes_case: { type: 'boolean' },
    importance: { type: 'string', enum: IMPORTANCE },
    headline: { type: 'string' },
    summary: { type: 'string' },
    response_window_start: { type: 'string' },
    response_window_end: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, deadline: { type: 'string' } },
        required: ['description', 'deadline'],
        additionalProperties: false
      }
    },
    sender_hints: { type: 'array', items: { type: 'string' } }
  },
  required: ['relevant', 'case_ref', 'org', 'program', 'stage', 'outcome', 'closes_case',
    'importance', 'headline', 'summary', 'response_window_start', 'response_window_end',
    'actions', 'sender_hints'],
  additionalProperties: false
};

var SYSTEM_PROMPT = [
  'You help one person track applications they have submitted (jobs, internships, fellowships,',
  'scholarships, grants, admissions, programmes, bootcamps, competitions, visas and similar).',
  'You read one email and return JSON describing it. The person missed a fellowship acceptance',
  'once because it got buried, so accuracy on decisions and deadlines matters most.',
  '',
  'relevant: true only if the email is about an application this person actually submitted, or a',
  'programme they are in because of one (stages, decisions, onboarding, schedules, completion).',
  'Newsletters, marketing, "applications are now open" invitations, job alerts and recommendations',
  'are NOT relevant. If not relevant, fill the other fields with empty values ("", [], "other",',
  '"none", false, "info").',
  '',
  'case_ref: the id of the matching open case from the list provided, or "" if this is a new',
  'application. Match on organisation and programme, not only the sender: many programmes email',
  'through platforms like Greenhouse, Lever, Workable, Typeform, Submittable or Google Forms.',
  '',
  'org / program: short human names, e.g. "Andela", "Software Engineering Fellowship 2027".',
  'stage: where the application is now. outcome: the decision so far.',
  'closes_case: true only when the process is finished: rejection, withdrawal, or the programme',
  'is complete (graduation, wrap-up, certificate). An acceptance that still needs steps is NOT closed.',
  '',
  'importance:',
  '  critical  = acceptance/offer/selection, interview or assessment invitation, or anything that',
  '              asks the person to do something by a date.',
  '  important = other real progress (shortlisted, under review update, rejection, schedule change).',
  '  info      = receipt confirmations and routine updates with nothing to do.',
  '',
  'headline: one short line for a phone notification, e.g. "🎉 Accepted into X — confirm by Dec 3".',
  'summary: 1–3 sentences with what matters.',
  '',
  'response_window_start / response_window_end: when they should expect the next response, as',
  'YYYY-MM-DD, resolving relative phrases ("within 2 weeks", "by end of month") against the email',
  'date. Use "" when the email gives no hint.',
  '',
  'actions: things the person must do, each with a deadline as YYYY-MM-DD or YYYY-MM-DDTHH:MM',
  '(their local time), or "" if none is given. Include confirming a spot, accepting an offer,',
  'booking an interview, completing forms or tests, attending orientation. Do not invent actions.',
  '',
  'sender_hints: email addresses or domains this programme writes from or may write from',
  '(e.g. "andela.com", "no-reply@greenhouse.io"). Domains of generic mail providers like',
  'gmail.com are not useful on their own; give the full address in that case.'
].join('\n');

function analyzeEmail_(email, openCases) {
  var caseList = openCases.map(function (c) {
    return { id: c.id, org: c.org, program: c.program, stage: c.stage, sender_hints: c.sender_hints };
  });
  var today = Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd (EEEE)');
  var user = 'Today is ' + today + ', time zone ' + tz() + '.\n\n' +
    'Open cases:\n' + JSON.stringify(caseList) + '\n\n' +
    'Email:\nFrom: ' + email.from + '\nTo: ' + email.to + '\nDate: ' + email.date +
    '\nSubject: ' + email.subject + '\n\n' + email.body;
  return callClaudeJson_(SYSTEM_PROMPT, user, ANALYSIS_SCHEMA);
}

var QUICK_ADD_SCHEMA = {
  type: 'object',
  properties: {
    org: { type: 'string' },
    program: { type: 'string' },
    response_window_start: { type: 'string' },
    response_window_end: { type: 'string' },
    actions: ANALYSIS_SCHEMA.properties.actions,
    sender_hints: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['org', 'program', 'response_window_start', 'response_window_end', 'actions',
    'sender_hints', 'summary'],
  additionalProperties: false
};

var QUICK_ADD_PROMPT = [
  'The person just applied to something and logged it manually because no confirmation email',
  'may come. From their note and the text of the programme page (if any), return:',
  'org and program (short names); response_window_start/end as YYYY-MM-DD for when results or the',
  'next stage are expected ("" if unknown); actions: upcoming things they must do with deadlines',
  '(YYYY-MM-DD or YYYY-MM-DDTHH:MM, or ""), only if stated; sender_hints: the organisation\'s',
  'domain(s) and any application platform domain visible on the page; summary: 1–2 sentences',
  'with the key dates of the programme timeline.'
].join('\n');

function callClaudeJson_(system, userText, schema) {
  var body = {
    model: cfg('CLAUDE_MODEL'),
    max_tokens: 16000,
    system: system,
    output_config: { effort: cfg('CLAUDE_EFFORT'), format: { type: 'json_schema', schema: schema } },
    messages: [{ role: 'user', content: userText }]
  };
  var headers = {
    'x-api-key': cfg('ANTHROPIC_API_KEY'),
    'anthropic-version': '2026-10-21'
  };
  // Opus 5.5 / Fable / Sonnet 5.5: if a safety classifier declines, retry on a fallback model.
  if (/^claude-(opus-5|fable-5|sonnet-5-5)/.test(body.model)) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    body.fallbacks = 'default';
  }
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code !== 200) throw new Error('Claude API ' + code + ': ' + text.slice(0, 500));
  var data = JSON.parse(text);
  if (data.stop_reason === 'refusal') throw new Error('Claude declined this email');
  if (data.stop_reason === 'max_tokens') throw new Error('Claude output was cut off');
  var block = (data.content || []).filter(function (b) { return b.type === 'text'; })[0];
  if (!block) throw new Error('No text in Claude response');
  return JSON.parse(block.text);
}

// ---------------------------------------------------------------------------
// Applying results
// ---------------------------------------------------------------------------

function applyAnalysis_(r, m, thread) {
  var now = new Date();
  var link = gmailLink_(thread);
  var cases = readTable_('Cases');
  var c = null;
  if (r.case_ref) c = cases.filter(function (x) { return x.id === r.case_ref; })[0] || null;
  var isNew = !c;

  if (isNew) {
    c = {
      id: 'c' + shortId_(), created: now, status: 'open', org: r.org, program: r.program,
      stage: r.stage, outcome: r.outcome, sender_hints: '', window_start: '', window_end: '',
      window_open_alerted: '', silence_alerted: '', source_url: '', summary: '', history: ''
    };
  }
  c.updated = now;
  if (r.org) c.org = r.org;
  if (r.program) c.program = r.program;
  if (r.stage && r.stage !== 'other') c.stage = r.stage;
  if (r.outcome && r.outcome !== 'none') c.outcome = r.outcome;
  c.sender_hints = mergeHints_(c.sender_hints, r.sender_hints.concat([senderAddress_(m.getFrom())]));
  if (r.response_window_start || r.response_window_end) {
    c.window_start = r.response_window_start || r.response_window_end;
    c.window_end = r.response_window_end || r.response_window_start;
    c.window_open_alerted = '';
    c.silence_alerted = '';
  }
  c.last_email_at = m.getDate();
  c.last_subject = m.getSubject();
  c.last_link = link;
  c.summary = r.summary;
  c.history = (c.history ? c.history + '\n' : '') +
    Utilities.formatDate(m.getDate(), tz(), 'yyyy-MM-dd') + ' · ' + r.stage +
    (r.outcome !== 'none' ? ' (' + r.outcome + ')' : '') + ' · ' + m.getSubject();
  if (r.closes_case) c.status = 'closed';

  if (isNew) appendRow_('Cases', c); else updateRow_('Cases', c);

  // Make the email impossible to lose in Gmail.
  var rescued = false;
  try {
    if (thread.isInSpam()) { thread.moveToInbox(); rescued = true; }
    thread.addLabel(getLabel_());
    if (r.importance !== 'info') {
      m.star();
      thread.markImportant();
      if (thread.isInInbox() === false && !thread.isInSpam()) thread.moveToInbox();
    }
  } catch (err) { Logger.log('Gmail tagging failed: ' + err); }

  // Actions with deadlines.
  var newActionIds = [];
  r.actions.forEach(function (a) {
    if (!a.description) return;
    var id = 'a' + shortId_();
    appendRow_('Actions', {
      id: id, case_id: c.id, description: a.description, deadline: a.deadline || '',
      done: false, created: now, done_at: '', reminded: passedThresholds_(a.deadline, now), link: link
    });
    newActionIds.push(id);
  });

  var title = r.headline || ((c.org || 'Application') + ': ' + r.stage);
  if (rescued) title = '⚠️ Was in SPAM — ' + title;
  var level = rescued && r.importance === 'info' ? 'important' : r.importance;
  var body = r.summary;
  if (r.actions.length) {
    body += '\n\nTo do:\n' + r.actions.map(function (a) {
      return '• ' + a.description + (a.deadline ? ' (by ' + prettyDate_(a.deadline) + ')' : '');
    }).join('\n');
  }
  createAlert_({
    case_id: c.id, action_id: newActionIds.join(','), level: level, title: title, body: body, link: link
  });
  return c.id;
}

function senderAddress_(from) {
  var m = /<([^>]+)>/.exec(from || '');
  return (m ? m[1] : (from || '')).trim().toLowerCase();
}

function mergeHints_(existing, more) {
  var seen = {};
  var out = [];
  splitHints_(existing).concat(more || []).forEach(function (h) {
    h = String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!h || seen[h]) return;
    if (/^(gmail|yahoo|outlook|hotmail|icloud)\.com$/.test(h)) return;
    seen[h] = true;
    out.push(h);
  });
  return out.slice(0, 12).join(', ');
}

function splitHints_(s) {
  return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

function gmailLink_(thread) {
  return 'https://mail.google.com/mail/u/0/#all/' + thread.getId();
}

// ---------------------------------------------------------------------------
// Time-based checks: windows opening, silence, action deadlines
// ---------------------------------------------------------------------------

function runTimeChecks_(now) {
  var today = Utilities.formatDate(now, tz(), 'yyyy-MM-dd');

  readTable_('Cases').forEach(function (c) {
    if (c.status !== 'open') return;
    var ws = dateStr_(c.window_start), we = dateStr_(c.window_end);
    var name = caseName_(c);
    if (ws && !c.window_open_alerted && today >= ws && (!we || today <= we)) {
      c.window_open_alerted = 'yes';
      updateRow_('Cases', c);
      createAlert_({
        case_id: c.id, level: 'important',
        title: '👀 Response window open: ' + name,
        body: 'You could hear back from ' + name + ' any day now (expected ' + prettyDate_(ws) +
          (we && we !== ws ? ' – ' + prettyDate_(we) : '') + '). Any email from them will be pinned.',
        link: c.last_link
      });
    }
    if (we && !c.silence_alerted && today > we) {
      var lastEmail = c.last_email_at ? Utilities.formatDate(new Date(c.last_email_at), tz(), 'yyyy-MM-dd') : '';
      if (!lastEmail || lastEmail < (ws || we)) {
        c.silence_alerted = 'yes';
        updateRow_('Cases', c);
        createAlert_({
          case_id: c.id, level: 'important',
          title: '🤔 No news from ' + name,
          body: 'The expected response window ended on ' + prettyDate_(we) + '. Check Spam and ' +
            'Promotions, log in to their portal, or send a polite follow-up email.',
          link: c.source_url || c.last_link
        });
      } else {
        c.silence_alerted = 'n/a';
        updateRow_('Cases', c);
      }
    }
  });

  var cases = indexBy_(readTable_('Cases'), 'id');
  readTable_('Actions').forEach(function (a) {
    if (isTrue_(a.done) || !a.deadline) return;
    var due = parseDeadline_(a.deadline);
    if (!due) return;
    var hoursLeft = (due - now) / 36e5;
    var reminded = splitHints_(a.reminded);
    var c = cases[a.case_id] || {};
    var name = caseName_(c);
    if (hoursLeft < 0) {
      if (reminded.indexOf('overdue') < 0) {
        a.reminded = reminded.concat(['overdue']).join(',');
        updateRow_('Actions', a);
        createAlert_({
          case_id: a.case_id, action_id: a.id, level: 'critical',
          title: '⏰ OVERDUE: ' + a.description,
          body: name + ' — this was due ' + prettyDate_(a.deadline) + '. If it is still possible, do it now or email them.',
          link: a.link
        });
      }
      return;
    }
    for (var i = ACTION_THRESHOLDS_HOURS.length - 1; i >= 0; i--) {
      var th = ACTION_THRESHOLDS_HOURS[i];
      if (hoursLeft <= th) {
        // Mark this and all larger thresholds as handled so we only send the tightest one.
        var newly = ACTION_THRESHOLDS_HOURS.filter(function (t) { return t >= th; })
          .map(String).filter(function (t) { return reminded.indexOf(t) < 0; });
        if (newly.length) {
          a.reminded = reminded.concat(newly).join(',');
          updateRow_('Actions', a);
          createAlert_({
            case_id: a.case_id, action_id: a.id, level: 'critical',
            title: '⏳ ' + humanHours_(hoursLeft) + ' left: ' + a.description,
            body: name + ' — due ' + prettyDate_(a.deadline) + '.',
            link: a.link
          });
        }
        break;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Alerts & reminders
// ---------------------------------------------------------------------------

function createAlert_(a) {
  var now = new Date();
  var alert = {
    id: 'n' + shortId_(), case_id: a.case_id || '', action_id: a.action_id || '',
    level: a.level || 'info', title: a.title || '', body: a.body || '', link: a.link || '',
    created: now, acked: a.level === 'info', acked_at: '', last_sent: '', send_count: 0
  };
  if (alert.level === 'critical' || alert.level === 'important') {
    if (sendWhatsApp_(formatWhatsApp_(alert, 0))) {
      alert.last_sent = now;
      alert.send_count = 1;
    }
  }
  appendRow_('Alerts', alert);
  return alert;
}

function runReminders_(now) {
  var every = Number(cfg('REMIND_EVERY_HOURS')) * 36e5;
  var max = Number(cfg('MAX_REMINDERS'));
  if (inQuietHours_(now)) return;
  readTable_('Alerts').forEach(function (al) {
    if (al.level !== 'critical' || isTrue_(al.acked)) return;
    var count = Number(al.send_count || 0);
    if (count >= max) return;
    var last = al.last_sent ? new Date(al.last_sent).getTime() : 0;
    if (now.getTime() - last < every) return;
    if (sendWhatsApp_(formatWhatsApp_(al, count))) {
      al.last_sent = now;
      al.send_count = count + 1;
      updateRow_('Alerts', al);
    }
  });
}

function inQuietHours_(now) {
  var h = Number(Utilities.formatDate(now, tz(), 'H'));
  var s = Number(cfg('QUIET_START_HOUR')), e = Number(cfg('QUIET_END_HOUR'));
  return s > e ? (h >= s || h < e) : (h >= s && h < e);
}

function formatWhatsApp_(al, previousSends) {
  var lines = [];
  if (previousSends > 0) lines.push('🔁 Reminder #' + previousSends + ' (not marked handled yet)');
  lines.push((al.level === 'critical' ? '🚨 ' : '📌 ') + al.title);
  if (al.body) lines.push('', al.body);
  if (al.link) lines.push('', '📧 ' + al.link);
  var ack = ackUrl_(al.id);
  if (ack && al.level === 'critical') lines.push('', '✅ Tap when handled: ' + ack);
  return lines.join('\n');
}

function ackUrl_(alertId) {
  var base = cfg('WEB_APP_URL');
  if (!base) return '';
  return base + '?action=ack&id=' + encodeURIComponent(alertId) + '&token=' + encodeURIComponent(cfg('APP_TOKEN'));
}

function sendWhatsApp_(text) {
  var phone = cfg('WHATSAPP_PHONE'), key = cfg('CALLMEBOT_APIKEY');
  if (!phone || !key) return false;
  if (text.length > 1500) text = text.slice(0, 1497) + '...';
  try {
    var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
      '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(key);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var ok = res.getResponseCode() === 200 && !/error|not\s+valid|apikey is invalid/i.test(res.getContentText().slice(0, 300));
    if (!ok) Logger.log('WhatsApp send failed: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
    return ok;
  } catch (err) {
    Logger.log('WhatsApp send error: ' + err);
    return false;
  }
}

/** Morning summary on WhatsApp of everything still open. */
function dailyDigest() {
  var lines = buildDigest_(new Date());
  if (lines) sendWhatsApp_(lines);
}

function buildDigest_(now) {
  var cases = readTable_('Cases').filter(function (c) { return c.status === 'open'; });
  var actions = readTable_('Actions').filter(function (a) { return !isTrue_(a.done); });
  var alerts = readTable_('Alerts').filter(function (a) { return !isTrue_(a.acked) && a.level === 'critical'; });
  if (!cases.length && !actions.length) return '';
  var byId = indexBy_(readTable_('Cases'), 'id');
  var out = ['☀️ AppTracker — ' + Utilities.formatDate(now, tz(), 'EEE d MMM')];
  if (alerts.length) out.push('', '🚨 ' + alerts.length + ' unhandled critical alert(s)');
  if (actions.length) {
    out.push('', '✅ To do:');
    actions.sort(function (a, b) { return String(a.deadline || 'z').localeCompare(String(b.deadline || 'z')); })
      .forEach(function (a) {
        out.push('• ' + a.description + (a.deadline ? ' — ' + prettyDate_(a.deadline) : '') +
          ' (' + caseName_(byId[a.case_id] || {}) + ')');
      });
  }
  if (cases.length) {
    out.push('', '📋 Waiting on:');
    cases.forEach(function (c) {
      var w = dateStr_(c.window_end) ? ' — expect by ' + prettyDate_(dateStr_(c.window_end)) : '';
      out.push('• ' + caseName_(c) + ' [' + c.stage + ']' + w);
    });
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Web app API (used by the Android app and WhatsApp "handled" links)
// ---------------------------------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.token !== cfg('APP_TOKEN')) return json_({ ok: false, error: 'bad token' });
  if (p.action === 'ack') {
    var done = ackAlert_(p.id);
    return HtmlService.createHtmlOutput(
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<div style="font-family:sans-serif;font-size:22px;padding:40px;text-align:center">' +
      (done ? '✅ Marked as handled. No more reminders for this one.' : 'Alert not found.') + '</div>');
  }
  return json_(getState_());
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (body.token !== cfg('APP_TOKEN')) return json_({ ok: false, error: 'bad token' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case 'ack': return json_({ ok: ackAlert_(body.id) });
      case 'action_done': return json_({ ok: markActionDone_(body.id) });
      case 'close_case': return json_({ ok: setCaseStatus_(body.id, 'closed') });
      case 'reopen_case': return json_({ ok: setCaseStatus_(body.id, 'open') });
      case 'add': return json_({ ok: true, case: quickAdd_(body.url || '', body.text || '') });
      case 'state': return json_(getState_());
      default: return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getState_() {
  var cutoff = Date.now() - 30 * 864e5;
  var cases = readTable_('Cases').filter(function (c) {
    return c.status === 'open' || new Date(c.updated).getTime() > cutoff;
  });
  var actions = readTable_('Actions').filter(function (a) {
    return !isTrue_(a.done) || new Date(a.done_at).getTime() > cutoff;
  });
  var alerts = readTable_('Alerts').filter(function (a) {
    return !isTrue_(a.acked) || new Date(a.created).getTime() > Date.now() - 7 * 864e5;
  });
  return {
    ok: true,
    now: new Date().toISOString(),
    timezone: tz(),
    cases: cases.map(clean_),
    actions: actions.map(clean_),
    alerts: alerts.map(clean_)
  };
}

function clean_(row) {
  var o = {};
  Object.keys(row).forEach(function (k) {
    if (k === '_row') return;
    var v = row[k];
    o[k] = v instanceof Date ? v.toISOString() : v;
  });
  return o;
}

function ackAlert_(id) {
  var found = false;
  readTable_('Alerts').forEach(function (al) {
    if (al.id === id && !isTrue_(al.acked)) {
      al.acked = true;
      al.acked_at = new Date();
      updateRow_('Alerts', al);
      found = true;
    } else if (al.id === id) {
      found = true;
    }
  });
  return found;
}

function markActionDone_(id) {
  var found = false;
  readTable_('Actions').forEach(function (a) {
    if (a.id !== id) return;
    a.done = true;
    a.done_at = new Date();
    updateRow_('Actions', a);
    found = true;
  });
  if (found) {
    // Finishing an action silences every alert about it.
    readTable_('Alerts').forEach(function (al) {
      if (!isTrue_(al.acked) && splitHints_(al.action_id).indexOf(id) >= 0) {
        var others = splitHints_(al.action_id).filter(function (x) { return x !== id; });
        var stillOpen = others.some(function (oid) {
          return readTable_('Actions').some(function (a) { return a.id === oid && !isTrue_(a.done); });
        });
        if (!stillOpen) {
          al.acked = true;
          al.acked_at = new Date();
          updateRow_('Alerts', al);
        }
      }
    });
  }
  return found;
}

function setCaseStatus_(id, status) {
  var found = false;
  readTable_('Cases').forEach(function (c) {
    if (c.id !== id) return;
    c.status = status;
    c.updated = new Date();
    updateRow_('Cases', c);
    found = true;
  });
  return found;
}

/** Log an application by hand (for ones that never send a confirmation). */
function quickAdd_(url, text) {
  url = extractUrl_(url) || extractUrl_(text);
  var page = '';
  if (url) {
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() < 400) page = htmlToText_(res.getContentText()).slice(0, 30000);
    } catch (err) { Logger.log('Could not fetch ' + url + ': ' + err); }
  }
  var info = { org: '', program: '', response_window_start: '', response_window_end: '', actions: [], sender_hints: [], summary: '' };
  if (cfg('ANTHROPIC_API_KEY')) {
    try {
      var today = Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd');
      info = callClaudeJson_(QUICK_ADD_PROMPT,
        'Today is ' + today + '.\nTheir note: ' + (text || '(none)') + '\nLink: ' + (url || '(none)') +
        '\n\nPage text:\n' + (page || '(could not load page)'), QUICK_ADD_SCHEMA);
    } catch (err) { Logger.log('Quick-add analysis failed: ' + err); }
  }
  var now = new Date();
  var hints = info.sender_hints || [];
  if (url) hints.push(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''));
  var c = {
    id: 'c' + shortId_(), created: now, updated: now, status: 'open',
    org: info.org || (url ? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : 'Application'),
    program: info.program || text.slice(0, 80), stage: 'applied', outcome: 'none',
    sender_hints: mergeHints_('', hints), window_start: info.response_window_start || '',
    window_end: info.response_window_end || info.response_window_start || '',
    window_open_alerted: '', silence_alerted: '', last_email_at: '', last_subject: '',
    last_link: '', source_url: url || '', summary: info.summary || text,
    history: Utilities.formatDate(now, tz(), 'yyyy-MM-dd') + ' · applied (logged manually)'
  };
  appendRow_('Cases', c);
  (info.actions || []).forEach(function (a) {
    if (!a.description) return;
    appendRow_('Actions', {
      id: 'a' + shortId_(), case_id: c.id, description: a.description, deadline: a.deadline || '',
      done: false, created: now, done_at: '', reminded: passedThresholds_(a.deadline, now), link: url || ''
    });
  });
  return clean_(c);
}

function extractUrl_(s) {
  var m = /https?:\/\/[^\s<>"']+/.exec(s || '');
  return m ? m[0] : '';
}

function htmlToText_(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Sheet storage helpers
// ---------------------------------------------------------------------------

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create('AppTracker data');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  headers.forEach(function (h) {
    if (have.indexOf(h) < 0) { have.push(h); sh.getRange(1, have.length).setValue(h); }
  });
  if (sh.getFrozenRows() !== 1) {
    sh.setFrozenRows(1);
    // Plain text everywhere, so Sheets never turns "2026-12-01" into a midnight Date.
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat('@');
  }
  return sh;
}

function sheet_(name) {
  return ensureSheet_(getSpreadsheet_(), name, SHEETS[name]);
}

function readTable_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var headers = values.shift() || [];
  return values.map(function (row, i) {
    var o = { _row: i + 2 };
    headers.forEach(function (h, j) { o[h] = row[j]; });
    return o;
  });
}

function appendRow_(name, obj) {
  var sh = sheet_(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(function (h) { return cell_(obj[h]); }));
  obj._row = sh.getLastRow();
}

function updateRow_(name, obj) {
  if (!obj._row) return appendRow_(name, obj);
  var sh = sheet_(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.getRange(obj._row, 1, 1, headers.length)
    .setValues([headers.map(function (h) { return cell_(obj[h]); })]);
}

function cell_(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toISOString();
  return v;
}

function getLabel_() {
  return GmailApp.getUserLabelByName(GMAIL_LABEL) || GmailApp.createLabel(GMAIL_LABEL);
}

// ---------------------------------------------------------------------------
// Small utilities (pure — unit tested in test/run-tests.js)
// ---------------------------------------------------------------------------

function lookbackMs_(lookback) {
  var m = /^(\d+)([dhm])$/.exec(String(lookback || '2d'));
  if (!m) return 2 * 864e5;
  return Number(m[1]) * ({ d: 864e5, h: 36e5, m: 6e4 })[m[2]];
}

function shortId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function isTrue_(v) {
  return v === true || String(v).toLowerCase() === 'true';
}

function indexBy_(rows, key) {
  var o = {};
  rows.forEach(function (r) { o[r[key]] = r; });
  return o;
}

function caseName_(c) {
  if (!c) return 'Application';
  if (c.org && c.program && c.program.toLowerCase().indexOf(String(c.org).toLowerCase()) < 0) return c.org + ' — ' + c.program;
  return c.program || c.org || 'Application';
}

/** Sheets may turn "2026-12-01" into a Date; normalise either to "yyyy-MM-dd". */
function dateStr_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz(), 'yyyy-MM-dd');
  var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v));
  return m ? m[1] : '';
}

/** "2026-12-01" → end of that day local; "2026-12-01T14:00" → that time local. */
function parseDeadline_(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  var s = String(v).trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  var hh = m[4] !== undefined ? m[4] : '23', mm = m[5] !== undefined ? m[5] : '59';
  var iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + hh + ':' + mm + ':00';
  return Utilities.parseDate(iso, tz(), "yyyy-MM-dd'T'HH:mm:ss");
}

function prettyDate_(v) {
  var d = parseDeadline_(v);
  if (!d) return String(v || '');
  var hasTime = /T\d{2}:\d{2}/.test(String(v)) || v instanceof Date;
  return Utilities.formatDate(d, tz(), hasTime ? 'EEE d MMM, HH:mm' : 'EEE d MMM');
}

/** Countdown thresholds already passed when an action is created (the first alert covers them). */
function passedThresholds_(deadline, now) {
  var due = parseDeadline_(deadline);
  if (!due) return '';
  var hoursLeft = (due - now) / 36e5;
  if (hoursLeft < 0) return '';
  return ACTION_THRESHOLDS_HOURS.filter(function (t) { return hoursLeft <= t; }).join(',');
}

function humanHours_(h) {
  if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min';
  if (h < 48) return Math.round(h) + 'h';
  return Math.round(h / 24) + ' days';
}
