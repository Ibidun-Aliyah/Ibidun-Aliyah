/**
 * Follow-Through — Google Sheet backend.
 *
 * Works from a phone browser, no spreadsheet editor needed:
 *   1. script.google.com → New project → paste this file → Save.
 *   2. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)
 *      → Authorize → copy the Web app URL.
 *   3. Paste that URL into the phone app. The first request creates the
 *      "Opportunities Tracker" sheet in your Google Drive by itself.
 *
 * The web app URL is the secret: keep it private.
 *
 * Updating this script later: paste the new code, Save, then
 *   Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy.
 * (That keeps the same web app URL. "New deployment" would make a new one.)
 *
 * Endpoints:
 *   POST {action:"capture", app, url, screenText, imageBase64, note}  → new Tracker row
 *   POST {action:"profile", profile:{…}} / GET ?action=getProfile        → your profile (name, school, level…)
 *   GET  ?action=list[&status=New]                                     → Tracker rows as JSON
 *   POST {action:"update", id, fields:{Header: value, ...}}            → edit a Tracker row
 *   GET  ?action=image&id=...                                          → screenshot as base64
 *   POST {action:"tip", id, fields:{Topic, Title, Key points, ...}}    → move a capture to Tips & Resources
 *   GET  ?action=tips                                                  → Tips rows as JSON
 *   POST {action:"tipUpdate", id, fields:{...}}                        → edit a Tips row
 *   POST {action:"doc", key, title, body, mode}                        → write a Google Doc (mode: replace | append | create)
 *   GET  ?action=readDoc&key=...                                       → a Google Doc's text
 *   GET  ?action=docs                                                  → links to all docs this script made
 *
 * Doc bodies use simple markdown: "# ", "## ", "### " headings, "- " bullets,
 * "**bold**", "---" for a divider.
 */

const SHEET_NAME = 'Tracker';
const HEADERS = [
  'ID', 'Captured', 'Status', 'Title', 'Organisation', 'Type', 'Deadline', 'Remind on',
  'Link', 'Requirements', 'What it offers', 'Saved from', 'Screen text', 'Screenshot',
  'Notes', 'Outcome', 'Updated', 'Category', 'Essay doc', 'CV doc', 'Applied on', 'Eligibility', 'Interview doc'
];
const STATUSES = ['New', 'Suggested', 'Saved', 'Preparing', 'Submitted', 'Closed'];
const OUTCOMES = ['Accepted', 'Shortlisted', 'Interview', 'Rejected', 'No response', 'Missed the deadline', 'Decided not to apply', 'Not an opportunity'];
const DATE_COLS = ['Deadline', 'Remind on', 'Applied on'];
const CATEGORIES = ['Opportunity', 'Event', 'Tip', 'Other'];
const TIPS_NAME = 'Tips & Resources';
const TIP_HEADERS = ['ID', 'Saved', 'Topic', 'Title', 'Key points', 'Link', 'Saved from', 'Screenshot', 'In digest'];
const FOLDER_NAME = 'Follow-Through captures';
const DOCS_FOLDER = 'Follow-Through';
const SCHEMA = '9';

/* ---------- one-time setup ---------- */
function setup() {
  const ss = book_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME, 0);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1E6A4E').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, HEADERS.length, 140);
  sh.setColumnWidth(col_('Title'), 260);
  sh.setColumnWidth(col_('Requirements'), 280);
  sh.setColumnWidth(col_('Screen text'), 200);

  const rows = sh.getMaxRows() - 1;
  sh.getRange(2, col_('Status'), rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  sh.getRange(2, col_('Deadline'), rows, 2).setNumberFormat('yyyy-mm-dd');
  sh.getRange(2, col_('Applied on'), rows, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(2, col_('Screen text'), rows, 1).setWrap(false);

  // Deadline colours: red within 3 days, amber within 7 (only while not submitted/closed).
  const dl = sh.getRange(2, col_('Deadline'), rows, 1);
  const L = colLetter_(col_('Deadline')), S = colLetter_(col_('Status'));
  const open = `AND($${S}2<>"Submitted",$${S}2<>"Closed",$${L}2<>"")`;
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND(${open},$${L}2-TODAY()<=3)`)
      .setBackground('#F8DED8').setFontColor('#C2412B').setRanges([dl]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND(${open},$${L}2-TODAY()<=7)`)
      .setBackground('#F7E9CF').setFontColor('#A8670F').setRanges([dl]).build(),
  ]);

  sh.getRange(2, col_('Category'), rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CATEGORIES, true).build());

  let tips = ss.getSheetByName(TIPS_NAME);
  if (!tips) tips = ss.insertSheet(TIPS_NAME, 1);
  tips.getRange(1, 1, 1, TIP_HEADERS.length).setValues([TIP_HEADERS])
    .setFontWeight('bold').setBackground('#A8670F').setFontColor('#FFFFFF');
  tips.setFrozenRows(1);
  tips.setColumnWidths(1, TIP_HEADERS.length, 140);
  tips.setColumnWidth(4, 260);
  tips.setColumnWidth(5, 420);
  tips.getRange(2, 5, tips.getMaxRows() - 1, 1).setWrap(true);

  const extra = ss.getSheetByName('Sheet1');
  if (extra && ss.getSheets().length > 1) ss.deleteSheet(extra);
  folder_();
  PropertiesService.getScriptProperties().setProperty('SETUP_DONE', '1');
  PropertiesService.getScriptProperties().setProperty('SCHEMA', SCHEMA);
  Logger.log('Setup done. Your sheet: ' + ss.getUrl());
}

/**
 * Run this once from the editor (pick "authorize" next to ▷ Run) so Google asks for
 * every permission the tracker needs: Sheets, Drive and Docs. It changes nothing.
 */
function authorize() {
  DocumentApp.getActiveDocument();
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.getRequest('https://generativelanguage.googleapis.com/');
  MailApp.getRemainingDailyQuota();
  installEmailTrigger_();
  Logger.log('All set: Docs, Gemini and Bisi\'s emails are on. Emails go to ' + Session.getEffectiveUser().getEmail());
}

/** The tracker spreadsheet: the one this script is attached to, or one it creates in your Drive. */
function book_() {
  try { const a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch (e) {}
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('Opportunities Tracker');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

/* ---------- web endpoints ---------- */
function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'act') return actPage_(p);
  return handle_(p);
}
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  return handle_(body);
}

const AI_ACTIONS = ['process', 'essay', 'tailor', 'uploadCv', 'cvAdd', 'setKey', 'eligibility', 'review', 'interview'];

function handle_(p) {
  try {
    if (PropertiesService.getScriptProperties().getProperty('SCHEMA') !== SCHEMA) withLock_(setup);
    if (AI_ACTIONS.indexOf(p.action) >= 0) {
      switch (p.action) {
        case 'process': return json_(process_(p));
        case 'essay': return json_(essay_(p));
        case 'tailor': return json_(tailor_(p));
        case 'uploadCv': return json_(uploadCv_(p));
        case 'cvAdd': return json_(cvAdd_(p));
        case 'setKey': return json_(setKey_(p));
        case 'eligibility': return json_(eligibility_(p));
        case 'review': return json_(review_(p));
        case 'interview': return json_(interview_(p));
      }
    }
    return json_(withLock_(() => {
      switch (p.action) {
        case 'ping': { const ss = book_(); return { ok: true, sheet: ss.getName(), sheetUrl: ss.getUrl(), schema: SCHEMA }; }
        case 'dashboard': return dashboard_();
        case 'capture': return capture_(p);
        case 'list': return list_(p);
        case 'update': return update_(p);
        case 'image': return image_(p);
        case 'tip': return tip_(p);
        case 'tips': return rows_(tipsSheet_(), p);
        case 'tipUpdate': return updateRow_(tipsSheet_(), TIP_HEADERS, p);
        case 'doc': return doc_(p);
        case 'readDoc': return readDoc_(p);
        case 'docs': return docs_();
        case 'delete': return deleteRow_(p);
        case 'suggest': return suggest_(p);
        case 'profile': return saveProfile_(p);
        case 'getProfile': return { ok: true, profile: loadProfile_() };
        case 'asset': return asset_(p);
        case 'stats': return stats_(p);
        case 'emailNow': return emailNow_(p);
        case 'emailSettings': return emailSettings_(p);
        default: return { ok: false, error: 'unknown_action' };
      }
    }));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function capture_(p) {
  const sh = sheet_();
  const id = 'c' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  let shot = '';
  if (p.imageBase64) {
    const blob = Utilities.newBlob(Utilities.base64Decode(p.imageBase64), 'image/jpeg', id + '.jpg');
    const file = folder_().createFile(blob);
    shot = file.getUrl();
  }
  const now = new Date();
  const row = {
    'ID': id, 'Captured': now, 'Status': 'New',
    'Title': (p.title || '').slice(0, 300),
    'Link': (p.url || '').slice(0, 2000),
    'Saved from': (p.app || '').slice(0, 100),
    'Screen text': (p.screenText || '').slice(0, 45000),
    'Screenshot': shot,
    'Notes': (p.note || '').slice(0, 2000),
    'Updated': now,
  };
  sh.appendRow(HEADERS.map(h => row[h] !== undefined ? row[h] : ''));
  return { ok: true, id: id };
}

function list_(p) { return rows_(sheet_(), p); }

function rows_(sh, p) {
  const values = sh.getDataRange().getValues();
  const head = values.shift();
  const tz = Session.getScriptTimeZone();
  let rows = values.filter(r => r[0]).map(r => {
    const o = {};
    head.forEach((h, i) => {
      const v = r[i];
      o[h] = v instanceof Date ? Utilities.formatDate(v, tz, DATE_COLS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") : v;
    });
    return o;
  });
  if (p.status) rows = rows.filter(r => r['Status'] === p.status);
  if (p.brief) rows.forEach(r => { r['Screen text'] = String(r['Screen text'] || '').slice(0, 300); });
  return { ok: true, today: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), rows: rows };
}

function update_(p) { return updateRow_(sheet_(), HEADERS, p); }

function updateRow_(sh, headers, p) {
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
  const idx = ids.indexOf(p.id);
  if (idx < 0) return { ok: false, error: 'not_found' };
  const rowNum = idx + 2;
  const fields = p.fields || {};
  Object.keys(fields).forEach(h => {
    const c = headers.indexOf(h);
    if (c < 0 || h === 'ID') return;
    let v = fields[h];
    if (DATE_COLS.indexOf(h) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-').map(Number); v = new Date(y, m - 1, d);
    }
    if (Array.isArray(v)) v = v.join('\n');
    sh.getRange(rowNum, c + 1).setValue(v);
  });
  if (headers === HEADERS) sh.getRange(rowNum, col_('Updated')).setValue(new Date());
  return { ok: true, id: p.id };
}

/* ---------- tips ---------- */
function tip_(p) {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  const idx = values.findIndex(r => r[0] === p.id);
  if (idx < 1) return { ok: false, error: 'not_found' };
  const src = values[idx];
  const f = p.fields || {};
  const row = {
    'ID': p.id, 'Saved': src[col_('Captured') - 1] || new Date(),
    'Topic': f['Topic'] || '', 'Title': f['Title'] || src[col_('Title') - 1] || '',
    'Key points': Array.isArray(f['Key points']) ? f['Key points'].join('\n') : (f['Key points'] || ''),
    'Link': f['Link'] || src[col_('Link') - 1] || '', 'Saved from': src[col_('Saved from') - 1] || '',
    'Screenshot': src[col_('Screenshot') - 1] || '', 'In digest': '',
  };
  tipsSheet_().appendRow(TIP_HEADERS.map(h => row[h]));
  sh.deleteRow(idx + 1);
  return { ok: true, id: p.id };
}
function tipsSheet_() {
  let t = book_().getSheetByName(TIPS_NAME);
  if (!t) { setup(); t = book_().getSheetByName(TIPS_NAME); }
  return t;
}

/* ---------- Google Docs ---------- */
function doc_(p) {
  if (!p.key || !/^[\w-]{1,80}$/.test(p.key)) return { ok: false, error: 'bad_key' };
  const props = PropertiesService.getScriptProperties();
  let doc = null, created = false;
  const id = props.getProperty('DOC:' + p.key);
  if (id) { try { doc = DocumentApp.openById(id); } catch (e) { doc = null; } }
  if (!doc) {
    doc = DocumentApp.create(p.title || p.key);
    DriveApp.getFileById(doc.getId()).moveTo(docsFolder_());
    props.setProperty('DOC:' + p.key, doc.getId());
    created = true;
  }
  const mode = p.mode || 'replace';
  if (created || mode === 'replace' || mode === 'append') {
    if (p.title && doc.getName() !== p.title) doc.setName(p.title);
    const body = doc.getBody();
    if (mode === 'replace' || created) {
      body.appendParagraph('');           // Docs can't clear a body whose last element is a list item or table
      body.clear();
    }
    renderMarkdown_(body, String(p.body || ''));
    if (mode === 'replace' || created) {
      const first = body.getChild(0);       // clear() leaves one empty paragraph at the top
      if (body.getNumChildren() > 1 && first.getType() === DocumentApp.ElementType.PARAGRAPH && !first.asParagraph().getText()) first.removeFromParent();
    }
    doc.saveAndClose();
  }
  return { ok: true, key: p.key, url: doc.getUrl(), created: created };
}
function readDoc_(p) {
  const id = PropertiesService.getScriptProperties().getProperty('DOC:' + p.key);
  if (!id) return { ok: false, error: 'no_doc' };
  const doc = DocumentApp.openById(id);
  return { ok: true, key: p.key, url: doc.getUrl(), title: doc.getName(), text: doc.getBody().getText() };
}
function docs_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  const out = {};
  Object.keys(all).filter(k => k.indexOf('DOC:') === 0).forEach(k => {
    out[k.slice(4)] = 'https://docs.google.com/document/d/' + all[k] + '/edit';
  });
  return { ok: true, docs: out };
}
function docsFolder_() {
  const it = DriveApp.getFoldersByName(DOCS_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DOCS_FOLDER);
}
function renderMarkdown_(body, md) {
  const H = DocumentApp.ParagraphHeading;
  md.replace(/\r/g, '').split('\n').forEach(line => {
    const t = line.trimEnd();
    if (!t.trim()) return;
    let el, text = t, m;
    if ((m = t.match(/^(#{1,3})\s+(.*)$/))) {
      text = m[2];
      el = body.appendParagraph('');
      el.setHeading([H.HEADING1, H.HEADING2, H.HEADING3][m[1].length - 1]);
    } else if (/^\s*[-*•]\s+/.test(t)) {
      text = t.replace(/^\s*[-*•]\s+/, '');
      el = body.appendListItem('').setGlyphType(DocumentApp.GlyphType.BULLET);
      if (/^\s{2,}/.test(t)) el.setNestingLevel(1);
    } else if (/^\s*\d+[.)]\s+/.test(t)) {
      text = t.replace(/^\s*\d+[.)]\s+/, '');
      el = body.appendListItem('').setGlyphType(DocumentApp.GlyphType.NUMBER);
    } else if (/^-{3,}$/.test(t.trim())) {
      body.appendHorizontalRule();
      return;
    } else {
      el = body.appendParagraph('');
      el.setHeading(H.NORMAL);
    }
    richText_(el, text);
  });
}
function richText_(el, text) {
  const parts = text.split('**');
  let plain = '', bold = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) bold.push([plain.length, plain.length + part.length - 1]);
    plain += part;
  });
  if (!plain) plain = ' ';
  el.setText(plain);
  const t = el.editAsText();
  t.setBold(false);
  bold.forEach(([a, b]) => { if (b >= a) t.setBold(a, b, true); });
}

function image_(p) {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  const row = values.find(r => r[0] === p.id);
  if (!row || !row[col_('Screenshot') - 1]) return { ok: false, error: 'no_image' };
  const fileId = String(row[col_('Screenshot') - 1]).match(/[-\w]{25,}/);
  if (!fileId) return { ok: false, error: 'no_image' };
  const blob = DriveApp.getFileById(fileId[0]).getBlob();
  return { ok: true, mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

/* ---------- helpers ---------- */
function sheet_() {
  let sh = book_().getSheetByName(SHEET_NAME);
  if (!sh) { setup(); sh = book_().getSheetByName(SHEET_NAME); }
  return sh;
}
function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
function col_(h) { return HEADERS.indexOf(h) + 1; }
function colLetter_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }


/* =====================================================================
 * Dashboard data (one call for the app's home screen)
 * ===================================================================== */
function dashboard_() {
  const t = rows_(sheet_(), { brief: 1 });
  t.rows.forEach(r => { delete r['Screen text']; });
  const tips = rows_(tipsSheet_(), {}).rows;
  const props = PropertiesService.getScriptProperties();
  return {
    ok: true, today: t.today, sheetUrl: book_().getUrl(),
    rows: t.rows, tips: tips, docs: docs_().docs,
    ai: { hasKey: !!props.getProperty('GEMINI_KEY'), model: props.getProperty('GEMINI_MODEL') || '' },
  };
}

/* =====================================================================
 * Gemini (free key from aistudio.google.com) — instant sorting and writing
 * ===================================================================== */
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/';

function setKey_(p) {
  const key = String(p.key || '').trim();
  if (!key) return { ok: false, error: 'Paste your Gemini API key first.' };
  const models = listModels_(key);
  if (!models.length) return { ok: false, error: 'That key did not work. Check you copied all of it.' };
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GEMINI_KEY', key);
  props.setProperty('GEMINI_MODELS', JSON.stringify(models));
  props.setProperty('GEMINI_MODELS_AT', String(Date.now()));
  props.setProperty('GEMINI_MODEL', models[0]);
  return { ok: true, model: models[0] };
}

/** Flash models that can generate text, best first (newest non-lite, then lite). */
function listModels_(key) {
  const res = UrlFetchApp.fetch(GEMINI + 'models?pageSize=200&key=' + encodeURIComponent(key), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return [];
  const list = (JSON.parse(res.getContentText()).models || [])
    .filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0)
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /flash/.test(n) && !/image|tts|audio|live|embed|vision|thinking|exp|8b/.test(n));
  const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const score = n => ver(n) * 10 - (/lite/.test(n) ? 50 : 0) - (/preview/.test(n) ? 1 : 0) + (/latest/.test(n) ? 0.5 : 0);
  const sorted = list.sort((a, b) => score(b) - score(a));
  return sorted.filter(n => !/lite/.test(n)).slice(0, 3).concat(sorted.filter(n => /lite/.test(n)).slice(0, 2));
}

function models_() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_KEY');
  if (!key) throw new Error('no_key');
  let models = JSON.parse(props.getProperty('GEMINI_MODELS') || '[]');
  if (!models.length || Date.now() - Number(props.getProperty('GEMINI_MODELS_AT') || 0) > 3 * 864e5) {
    const fresh = listModels_(key);
    if (fresh.length) { models = fresh; props.setProperty('GEMINI_MODELS', JSON.stringify(models)); props.setProperty('GEMINI_MODELS_AT', String(Date.now())); }
  }
  return { key: key, models: models };
}

/**
 * Ask Gemini. parts: [{text}|{inline_data}]. opts.search tries Google Search grounding
 * first and quietly drops it if this key's tier doesn't allow it. Falls through the
 * model list on quota errors.
 */
function gemini_(parts, opts) {
  opts = opts || {};
  const m = models_();
  const props = PropertiesService.getScriptProperties();
  // Google Search grounding isn't on the free tier for newer models; once refused, skip it for a day.
  const tried = [];
  // fast: sorting and CV import — lite models first (quicker, much higher free quota), thinking turned down.
  const order = opts.fast ? m.models.filter(x => /lite/.test(x)).concat(m.models.filter(x => !/lite/.test(x))) : m.models;
  for (const model of order) {
    const searchOff = Date.now() < Number(props.getProperty('NO_SEARCH_UNTIL') || 0);
    const modes = opts.search && !searchOff ? [true, false] : [false];
    let skipModel = false;
    for (const search of modes) {
      if (skipModel) break;
      for (let attempt = 0; attempt < 2; attempt++) {
        const body = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: opts.temperature || 0.4, maxOutputTokens: opts.maxTokens || 8192 } };
        if (search) body.tools = [{ google_search: {} }];
        else if (opts.json) body.generationConfig.responseMimeType = 'application/json';
        const think = opts.fast && props.getProperty('NO_THINKCFG:' + model) !== '1' ? thinkingConfig_(model) : null;
        if (think) body.generationConfig.thinkingConfig = think;
        const res = UrlFetchApp.fetch(GEMINI + 'models/' + model + ':generateContent?key=' + encodeURIComponent(m.key), {
          method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true,
        });
        const code = res.getResponseCode();
        const txt = res.getContentText();
        if (code === 200) {
          const j = JSON.parse(txt);
          const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [])
            .map(x => x.text || '').join('').trim();
          if (text) { props.setProperty('GEMINI_MODEL', model); return { text: text, model: model, searched: search }; }
          tried.push(model + (search ? '+search' : '') + ': empty answer');
          break;
        }
        const msg = ((JSON.parse(txt || '{}').error || {}).message || txt).slice(0, 160);
        if (code === 400 && think && /think/i.test(txt)) {
          // This model doesn't take that thinking setting: remember and retry plainly.
          props.setProperty('NO_THINKCFG:' + model, '1');
          tried.push(model + ': thinking setting not supported, retrying');
          attempt--; continue;
        }
        tried.push(model + (search ? '+search' : '') + ': ' + code + ' ' + msg);
        if (search) {
          // Search refused (quota, tier or unsupported): remember, and retry this model without it.
          if (code === 429 || code === 400 || code === 403) props.setProperty('NO_SEARCH_UNTIL', String(Date.now() + 864e5));
          break;
        }
        if (code === 429) {
          // Per-minute limit: wait once and retry; a daily or zero quota moves on to the next model.
          const perMinute = /per.?minute|PerMinute|retry in|retryDelay/i.test(txt) && !/PerDay|per.?day|limit: 0/i.test(txt);
          if (perMinute && attempt === 0) { Utilities.sleep(15000); continue; }
          skipModel = true; break;
        }
        if (code === 404 || code === 400 || code === 403 || code >= 500) { skipModel = true; break; }
        skipModel = true; break;
      }
    }
  }
  const quota = tried.every(t => / 429 /.test(t));
  throw new Error(quota
    ? 'Gemini free quota is used up for now (every model said "quota exceeded"). It resets daily; try again later. ' + tried.slice(-2).join(' | ')
    : 'Gemini failed: ' + tried.slice(-3).join(' | '));
}

/** Ask the model to think as little as it allows (2.5 uses a token budget, 3.x a level). */
function thinkingConfig_(model) {
  const v = parseFloat((model.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
  if (!v) return null;
  if (v < 3) return { thinkingBudget: /lite/.test(model) ? 0 : 0 };
  return { thinkingLevel: 'low' };
}

function parseJson_(text) {
  try { return JSON.parse(text); } catch (e) {}
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) { try { return JSON.parse(f[1]); } catch (e) {} }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
  return null;
}

function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function addDays_(iso, n) {
  const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d + n);
  return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function daysBetween_(a, b) {
  const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 864e5);
}
function rowById_(sh, id) {
  const values = sh.getDataRange().getValues();
  const head = values[0];
  const i = values.findIndex((r, k) => k > 0 && r[0] === id);
  if (i < 1) return null;
  const o = {}; head.forEach((h, c) => { o[h] = values[i][c]; });
  return o;
}
function shotPart_(row) {
  const id = String(row['Screenshot'] || '').match(/[-\w]{25,}/);
  if (!id) return null;
  try {
    const blob = DriveApp.getFileById(id[0]).getBlob();
    return { inline_data: { mime_type: blob.getContentType() || 'image/jpeg', data: Utilities.base64Encode(blob.getBytes()) } };
  } catch (e) { return null; }
}

/* ---------- instant sorting ---------- */
function process_(p) {
  if (!PropertiesService.getScriptProperties().getProperty('GEMINI_KEY')) return { ok: false, error: 'no_key' };
  const all = rows_(sheet_(), {}).rows.filter(r => r['Status'] === 'New' && (!p.id || r['ID'] === p.id));
  all.sort((x, y) => String(y['Captured']).localeCompare(String(x['Captured'])));   // newest first
  const cache = CacheService.getScriptCache();
  const done = [];
  for (const r of all.slice(0, 1)) {
    if (cache.get('proc:' + r['ID'])) continue;
    cache.put('proc:' + r['ID'], '1', 300);
    try { done.push(sortOne_(r)); }
    catch (e) { done.push({ id: r['ID'], error: String(e.message || e) }); }
    finally { cache.remove('proc:' + r['ID']); }
  }
  return { ok: true, processed: done, left: Math.max(0, all.length - done.length) };
}

function sortOne_(r) {
  const today = today_();
  const profile = readDocText_('about-me').slice(0, 2500);
  const prompt = `Today is ${today}. I saved this from my phone (app: ${r['Saved from'] || 'unknown'}) because it might be useful.
I'm a Nigerian 200-level Mechatronics Engineering student at LASUSTECH. About me:
${profile || '(no profile yet)'}

Work out what it is and reply with ONLY a JSON object:
{
 "category": "Opportunity" | "Event" | "Tip" | "Other",
 "title": string, "organisation": string,
 "type": one of "Scholarship","Internship","Fellowship","Competition","Hackathon","Conference","Programme","Job","Grant","Event","Other",
 "link": string | null,                      // official application/registration page if known
 "deadline": "YYYY-MM-DD" | null,            // application/registration deadline. NEVER guess; null if not stated
 "eventDate": "YYYY-MM-DD" | null, "eventTime": string | null, "venue": string | null,   // events only; time in Lagos time
 "requirements": [string],                   // e.g. Essay: "Why this programme?" (300 words), "CV", "2 references"
 "offers": string,                           // 1–2 sentences: what it offers and who can apply
 "eligible": "likely" | "unclear" | "unlikely",
 "notes": string,                            // anything I should know: fees, doubts, what to check
 "topic": string,                            // tips only: one of "CV & resume","Interviews","Applications & essays","Career","Tech & skills","Productivity","Other"
 "keyPoints": [string]                       // tips only: 3–6 lines of the actual advice, usable without the post
}
Opportunity = something to apply for. Event = something to attend (webinar, workshop, meetup…). Tip = advice or a resource to learn from. Other = not useful.
If the year of a date is missing, use its next occurrence after today.

What I saved:
Link: ${r['Link'] || 'none'}
Screen text:
${String(r['Screen text'] || '').slice(0, 8000)}`;
  const parts = [{ text: prompt }];
  const shot = shotPart_(r);
  if (shot) parts.push(shot);
  const ans = gemini_(parts, { search: true, json: true, temperature: 0.2, fast: true });
  const j = parseJson_(ans.text);
  if (!j || !j.category) throw new Error('could_not_read_answer');

  const cat = String(j.category);
  if (cat === 'Tip') {
    withLock_(() => tip_({ id: r['ID'], fields: { Topic: j.topic || 'Other', Title: j.title || 'Saved tip', 'Key points': (j.keyPoints || []).map(x => '• ' + x), Link: j.link || r['Link'] } }));
    return { id: r['ID'], category: 'Tip', title: j.title };
  }
  if (cat === 'Other') {
    withLock_(() => updateRow_(sheet_(), HEADERS, { id: r['ID'], fields: { Category: 'Other', Status: 'Closed', Outcome: 'Not an opportunity', Title: j.title || '' } }));
    return { id: r['ID'], category: 'Other' };
  }
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const deadline = valid(j.deadline) ? j.deadline : (cat === 'Event' && valid(j.eventDate) ? j.eventDate : '');
  let remind;
  if (!deadline) remind = addDays_(today, 3);
  else {
    const left = daysBetween_(today, deadline);
    const before = cat === 'Event' ? 2 : 7;
    remind = left > before ? addDays_(deadline, -before) : addDays_(today, left > 0 ? 1 : 0);
  }
  const notes = [
    cat === 'Event' ? [j.eventDate && ('Date: ' + j.eventDate), j.eventTime && ('Time: ' + j.eventTime), j.venue && ('Where: ' + j.venue)].filter(Boolean).join(' · ') : '',
    j.eligible ? 'Eligibility: ' + j.eligible : '',
    j.notes || '',
    deadline ? (ans.searched ? 'Sorted instantly (checked online).' : 'Sorted instantly. Deadline not yet confirmed online.') : 'No deadline found yet.',
  ].filter(Boolean).join('\n');
  const dup = findDuplicate_(r['ID'], j.title, j.organisation, j.link || r['Link']);
  if (dup) {
    const fill = {};
    if (!dup['Deadline'] && deadline) { fill.Deadline = deadline; fill['Remind on'] = remind; }
    if (!dup['Link'] && (j.link || r['Link'])) fill.Link = j.link || r['Link'];
    if (!dup['Requirements'] && (j.requirements || []).length) fill.Requirements = j.requirements.join('\n');
    withLock_(() => {
      if (Object.keys(fill).length) updateRow_(sheet_(), HEADERS, { id: dup['ID'], fields: fill });
      updateRow_(sheet_(), HEADERS, { id: r['ID'], fields: { Category: cat, Status: 'Closed', Outcome: 'Duplicate of ' + dup['ID'], Title: j.title || '' } });
    });
    return { id: r['ID'], category: cat, title: j.title, duplicateOf: dup['ID'], duplicateTitle: dup['Title'] };
  }
  withLock_(() => updateRow_(sheet_(), HEADERS, { id: r['ID'], fields: {
    Category: cat, Status: 'Saved', Title: j.title || 'Untitled', Organisation: j.organisation || '',
    Type: j.type || (cat === 'Event' ? 'Event' : 'Other'), Deadline: deadline, 'Remind on': remind,
    Link: j.link || r['Link'] || '', Requirements: (j.requirements || []).join('\n'),
    'What it offers': j.offers || '', Notes: notes,
  } }));
  return { id: r['ID'], category: cat, title: j.title, deadline: deadline };
}

/* ---------- essays & CV ---------- */
function readDocText_(key) {
  // The profile from the app goes in front of the "About me" doc, so sorting, eligibility, essays and interview prep all see it.
  if (key === 'about-me') { const pr = profileText_(); const rest = readDocRaw_(key); return pr ? pr + (rest ? '\n\n' + rest : '') : rest; }
  return readDocRaw_(key);
}
function readDocRaw_(key) {
  const id = PropertiesService.getScriptProperties().getProperty('DOC:' + key);
  if (!id) return '';
  try { return DocumentApp.openById(id).getBody().getText(); } catch (e) { return ''; }
}
function oppContext_(r) {
  return `OPPORTUNITY: ${r['Title']} — ${r['Organisation']} (${r['Type']})
Deadline: ${r['Deadline'] instanceof Date ? Utilities.formatDate(r['Deadline'], Session.getScriptTimeZone(), 'yyyy-MM-dd') : (r['Deadline'] || 'unknown')}
Link: ${r['Link'] || ''}
What it offers: ${r['What it offers'] || ''}
Requirements:
${r['Requirements'] || '(not listed)'}
Notes: ${r['Notes'] || ''}`;
}
const NO_INVENT = 'Never invent facts, numbers, dates, grades, awards or experience. Where a real detail is needed, write [ADD: what is needed].';

function essay_(p) {
  const r = rowById_(sheet_(), p.id);
  if (!r) return { ok: false, error: 'not_found' };
  const about = readDocText_('about-me'), cv = readDocText_('master-cv');
  const prompt = `Help me write the essays for this application. ${NO_INVENT}
Write in simple markdown (# ## ### headings, - bullets, **bold**). For EACH essay/statement/short-answer question in the requirements
(if none are listed, use the usual personal statement: "Why do you want this, and why are you a good fit?"):
## <the exact question>
Word limit: <n or "not stated">
### Angles
- 3 options, one line each, naming the real story from my profile/CV to use
### Recommended
One or two sentences on which angle and why.
### First draft
In my voice: plain, specific, first person, within the word limit. Open with a concrete moment. No clichés
("passionate", "ever since I was young", "tapestry", "delve").
### Before you submit
- 3 short checks

Start the document with: # Essays: <title> and a line with the deadline and link.

${oppContext_(r)}

ABOUT ME:
${about.slice(0, 6000) || '(empty)'}

MY CV:
${cv.slice(0, 8000) || '(empty)'}`;
  const ans = gemini_([{ text: prompt }], { temperature: 0.7 });
  const d = withLock_(() => doc_({ key: 'essay-' + p.id, title: 'Essays: ' + r['Title'], body: ans.text, mode: 'replace' }));
  withLock_(() => updateRow_(sheet_(), HEADERS, { id: p.id, fields: { 'Essay doc': d.url } }));
  return { ok: true, url: d.url };
}

function tailor_(p) {
  const r = rowById_(sheet_(), p.id);
  if (!r) return { ok: false, error: 'not_found' };
  const cv = readDocText_('master-cv');
  if (cv.replace(/\[[^\]]*\]/g, '').trim().length < 200) return { ok: false, error: 'Add your CV first (My CV → Upload).' };
  const prompt = `Tailor my CV for this opportunity. ${NO_INVENT}
Use ONLY what is in my CV below. You may reorder, reword, cut, and bring forward what matters most here, and mirror
the posting's keywords where they are true for me. Keep it to one page for internships/programmes, two at most otherwise.
Output simple markdown (# name, ## sections, - bullets, **bold**) in this order:
## What I changed and why
- 3–6 bullets
---
<the full tailored CV>
## Consider adding (only if true)
- gaps worth filling for this application

${oppContext_(r)}

MY CV:
${cv.slice(0, 12000)}`;
  const ans = gemini_([{ text: prompt }], { temperature: 0.3 });
  const d = withLock_(() => doc_({ key: 'cv-' + p.id, title: 'CV for ' + r['Title'], body: ans.text, mode: 'replace' }));
  withLock_(() => updateRow_(sheet_(), HEADERS, { id: p.id, fields: { 'CV doc': d.url } }));
  return { ok: true, url: d.url };
}

/* ---------- master CV: upload and updates ---------- */
function uploadCv_(p) {
  if (!p.base64) return { ok: false, error: 'No file received.' };
  const name = String(p.name || 'cv');
  const mime = String(p.mime || '');
  const bytes = Utilities.base64Decode(p.base64);
  const blob = Utilities.newBlob(bytes, mime || 'application/octet-stream', name);
  const original = docsFolder_().createFile(blob.copyBlob().setName('Original CV - ' + name));

  const parts = [];
  const lower = name.toLowerCase();
  if (/\.docx$/.test(lower) || mime.indexOf('wordprocessingml') >= 0) {
    parts.push({ text: 'MY CV (text extracted from a Word file):\n' + docxText_(blob).slice(0, 20000) });
  } else if (/\.(txt|md)$/.test(lower) || mime.indexOf('text/') === 0) {
    parts.push({ text: 'MY CV:\n' + blob.getDataAsString().slice(0, 20000) });
  } else if (mime === 'application/pdf' || /\.pdf$/.test(lower) || mime.indexOf('image/') === 0) {
    parts.push({ inline_data: { mime_type: mime || 'application/pdf', data: p.base64 } });
  } else {
    return { ok: false, error: 'Upload a PDF, Word (.docx) or photo of your CV.' };
  }
  parts.unshift({ text: `Turn this CV into clean, well-structured simple markdown: "# Full name", a contact line, then "## " sections
(Profile, Education, Experience/Leadership, Projects, Skills, Awards, and any others it has) with "- " bullets and **bold**
for roles and institutions. Keep EVERY fact exactly as written: no additions, no removals, no rewording beyond fixing
obvious typos and layout. Output only the markdown.` });
  const ans = gemini_(parts, { temperature: 0.1, fast: true });
  const d = withLock_(() => doc_({ key: 'master-cv', title: 'Master CV', body: ans.text, mode: 'replace' }));
  return { ok: true, url: d.url, original: original.getUrl() };
}

function docxText_(blob) {
  const files = Utilities.unzip(blob.copyBlob().setContentType('application/zip'));
  const xml = files.filter(f => f.getName() === 'word/document.xml')[0];
  if (!xml) return '';
  return xml.getDataAsString()
    .replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
}

function cvAdd_(p) {
  const update = String(p.text || '').trim();
  if (!update) return { ok: false, error: 'Describe what you did first.' };
  const cv = readDocText_('master-cv');
  if (!cv.trim()) return { ok: false, error: 'Upload your CV first.' };
  const prompt = `Here is my CV and something new I've done. Add it to the CV in the right section (create the section if
needed), written as a strong, honest CV line in the CV's existing style. Change nothing else. Only use what I wrote:
${NO_INVENT}
Reply in this exact format:
<the full updated CV in simple markdown: # name, ## sections, - bullets, **bold**>
===CHANGES===
- 1–3 bullets describing exactly what you added or changed

NEW: ${update}

MY CV:
${cv.slice(0, 12000)}`;
  const ans = gemini_([{ text: prompt }], { temperature: 0.2, fast: true });
  const split = ans.text.split('===CHANGES===');
  if (split.length < 2 || split[0].trim().length < 200) return { ok: false, error: 'Could not update the CV this time. Try again.' };
  const d = withLock_(() => doc_({ key: 'master-cv', title: 'Master CV', body: split[0].trim(), mode: 'replace' }));
  return { ok: true, url: d.url, changes: split[1].trim() };
}


/* =====================================================================
 * Bisi's emails — sent from your own Gmail by an hourly timer
 * ===================================================================== */
const BISI = {
  dueToday: ["{t} closes TODAY. I'm not mad. I'm just… hovering. 🐝", "This is a hive-priority situation. {t} closes TODAY.", "Today. {t}. Today. Bee-lieve me, tomorrow is too late.", "It's deadline day for {t}. I cleared my whole schedule to watch you do this."],
  due: ["{t} closes in {d} days. Just thought you'd want to know. Again.", "Don't let {t} buzz off. {d} days left.", "Bee honest: have you even opened {t}?", "{d} days left for {t}. I'm sure you have a plan. Right? 🙂"],
  ignored: ["Okay. I'll just keep reminding you then. I have nothing but time. 🐝", "Fun fact: applications don't submit themselves. I checked.", "I'm not saying I'm disappointed. I'm just saying I'm a bee and I'm sad."],
  check: ["It's been two weeks since you applied to {t}. Any news, or are we pretending it didn't happen?", "Heard back from {t}? I'm asking for a friend. The friend is me."],
  morning: ["Good morning. I've already been up for hours worrying about your deadlines. ☀️", "Rise and shine. Mostly shine. The deadlines aren't going anywhere. 🐝", "Morning! Small steps today. I'll be watching. Lovingly."],
  clear: ["Nothing urgent today. Look at you being responsible. 🥹", "All clear. I'm genuinely proud. Don't make it weird."],
  sunday: ["Here's your week. I made it pretty so you'd actually read it. 💛", "Bee-hold: your week, in one email. 🍯", "Weekly report from your favourite bee. Grades are… let's just read it."],
};
function bisiLine_(kind, vars) {
  const arr = BISI[kind] || BISI.morning;
  const seed = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'D')) + (vars && vars.t ? vars.t.length : 0);
  return arr[seed % arr.length].replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
}

function installEmailTrigger_() {
  const has = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'emailTick');
  if (!has) ScriptApp.newTrigger('emailTick').timeBased().everyHours(1).create();
}

function asset_(p) {
  if (!/^[\w.-]{1,60}$/.test(p.name || '') || !p.base64) return { ok: false, error: 'bad_asset' };
  const props = PropertiesService.getScriptProperties();
  const old = props.getProperty('ASSET:' + p.name);
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  const f = docsFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'image/png', p.name));
  props.setProperty('ASSET:' + p.name, f.getId());
  return { ok: true, name: p.name };
}
function assetBlob_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('ASSET:' + name);
  if (!id) return null;
  try { return DriveApp.getFileById(id).getBlob().setName(name); } catch (e) { return null; }
}

function stats_(p) {
  const props = PropertiesService.getScriptProperties();
  if (p.streak != null) { props.setProperty('STREAK', String(Number(p.streak) || 0)); props.setProperty('STREAK_AT', today_()); }
  if (p.url && /^https:\/\/script\.google\.com\/.+\/exec$/.test(p.url)) props.setProperty('WEBAPP_URL', p.url);
  return { ok: true };
}
function emailSettings_(p) {
  const props = PropertiesService.getScriptProperties();
  if (p.on != null) props.setProperty('EMAILS_OFF', p.on ? '' : '1');
  return { ok: true, on: !props.getProperty('EMAILS_OFF'), to: Session.getEffectiveUser().getEmail(), quota: MailApp.getRemainingDailyQuota() };
}

/* ---------- signed one-tap links ---------- */
function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('LINK_SECRET');
  if (!s) { s = Utilities.getUuid(); props.setProperty('LINK_SECRET', s); }
  return s;
}
function sig_(id, what) {
  const raw = Utilities.computeHmacSha256Signature(id + '|' + what, secret_());
  return Utilities.base64EncodeWebSafe(raw).slice(0, 22);
}
function actUrl_(id, what) {
  const base = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || ScriptApp.getService().getUrl();
  return base + '?action=act&id=' + encodeURIComponent(id) + '&do=' + encodeURIComponent(what) + '&sig=' + sig_(id, what);
}
const ACTIONS = {
  applied: { label: 'I applied ✓', fields: () => ({ Status: 'Submitted', 'Applied on': today_(), 'Remind on': addDays_(today_(), 14) }), msg: "Look at you! Marked as applied. I'll ask about the result in two weeks.", mood: 'party' },
  snooze: { label: 'Remind me tomorrow', fields: () => ({ 'Remind on': addDays_(today_(), 1) }), msg: "Fine. Tomorrow. I'm writing that down. 📝", mood: 'sassy' },
  preparing: { label: "I'm on it", fields: () => ({ Status: 'Preparing' }), msg: "Marked as Preparing. Open the app to get your essays and CV written.", mood: 'happy' },
  accepted: { label: 'Accepted 🎉', fields: () => ({ Status: 'Closed', Outcome: 'Accepted', 'Remind on': '' }), msg: "YOU GOT IN?! I'm telling every flower I know. 🎉", mood: 'party' },
  shortlisted: { label: 'Shortlisted', fields: () => ({ Status: 'Submitted', Outcome: 'Shortlisted', 'Remind on': addDays_(today_(), 7) }), msg: "Shortlisted! I knew it. Let's prepare. 🐝", mood: 'party' },
  interview: { label: 'Interview', fields: () => ({ Status: 'Submitted', Outcome: 'Interview', 'Remind on': addDays_(today_(), 7) }), msg: "An interview! Breathe. Then prepare. I'll remind you.", mood: 'happy' },
  rejected: { label: 'Rejected', fields: () => ({ Status: 'Closed', Outcome: 'Rejected', 'Remind on': '' }), msg: "Their loss. Genuinely. On to the next one. 💛", mood: 'crying' },
  nonews: { label: 'No news yet', fields: () => ({ 'Remind on': addDays_(today_(), 7) }), msg: "Okay. I'll ask again next week. Patiently. Mostly.", mood: 'sleepy' },
};
function actPage_(p) {
  const a = ACTIONS[p.do];
  let ok = false, msg = "That link didn't work. Open the app instead.", mood = 'worried', title = '';
  if (a && p.id && p.sig === sig_(p.id, p.do)) {
    const r = withLock_(() => updateRow_(sheet_(), HEADERS, { id: p.id, fields: a.fields() }));
    if (r.ok) { ok = true; msg = a.msg; mood = a.mood; const row = rowById_(sheet_(), p.id); title = row ? row['Title'] : ''; }
  }
  const img = assetBlob_('bisi_' + mood + '.png');
  const src = img ? 'data:image/png;base64,' + Utilities.base64Encode(img.getBytes()) : '';
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="margin:0;background:#EEF2EF;font-family:Arial,sans-serif;color:#13231C;display:flex;min-height:100vh;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:22px;padding:28px;max-width:360px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.08)">
  ${src ? `<img src="${src}" width="120" height="120" alt="Bisi">` : '<div style="font-size:64px">🐝</div>'}
  <h2 style="margin:12px 0 6px">${ok ? 'Saved ✓' : 'Hmm'}</h2>
  ${title ? `<div style="color:#5A6A62;margin-bottom:8px">${escHtml_(title)}</div>` : ''}
  <p style="font-size:16px;line-height:1.5">${escHtml_(msg)}</p>
  <p style="color:#5A6A62;font-size:13px">You can close this tab.</p></div></body>`;
  return HtmlService.createHtmlOutput(html).setTitle('Bisi').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function escHtml_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- email layout ---------- */
function sendBisi_(subject, mood, headline, bodyHtml) {
  const to = Session.getEffectiveUser().getEmail();
  const img = assetBlob_('bisi_' + mood + '.png');
  const html = `<div style="background:#EEF2EF;padding:20px 12px;font-family:Arial,Helvetica,sans-serif;color:#13231C">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px">
  <tr><td style="padding:22px 22px 8px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;padding-right:14px">${img ? '<img src="cid:bisi" width="84" height="84" alt="Bisi the bee" style="display:block">' : '<div style="font-size:56px">🐝</div>'}</td>
      <td style="vertical-align:middle;font-size:17px;line-height:1.4;font-weight:bold">${escHtml_(headline)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:6px 22px 22px;font-size:15px;line-height:1.55">${bodyHtml}</td></tr>
  <tr><td style="padding:12px 22px 20px;border-top:1px solid #DBE3DD;color:#5D6D65;font-size:12px">
    Bisi 🐝 from Follow-Through · <a href="${book_().getUrl()}" style="color:#1E6A4E">Open your tracker</a>
  </td></tr></table></div>`;
  const opts = { to: to, subject: subject, htmlBody: html, name: 'Bisi from Follow-Through' };
  if (img) opts.inlineImages = { bisi: img };
  MailApp.sendEmail(opts);
}
function button_(id, what, primary) {
  return `<a href="${actUrl_(id, what)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;${primary ? 'background:#1E6A4E;color:#ffffff' : 'background:#E6ECE7;color:#13231C'}">${ACTIONS[what].label}</a>`;
}
function itemHtml_(r, extra) {
  const req = String(r['Requirements'] || '').split('\n').filter(String);
  const links = [r['Link'] && `<a href="${r['Link']}" style="color:#1E6A4E">Application</a>`,
    r['Essay doc'] && `<a href="${r['Essay doc']}" style="color:#1E6A4E">Essays</a>`,
    r['CV doc'] && `<a href="${r['CV doc']}" style="color:#1E6A4E">Tailored CV</a>`].filter(Boolean).join(' · ');
  return `<div style="border:1px solid #DBE3DD;border-radius:14px;padding:12px 14px;margin:10px 0">
    <div style="font-weight:bold;font-size:15px">${escHtml_(r['Title'] || 'Untitled')}</div>
    <div style="color:#5D6D65;font-size:13px">${escHtml_([r['Organisation'], extra].filter(Boolean).join(' · '))}</div>
    ${req.length ? `<div style="font-size:13px;margin-top:6px">Next: ${escHtml_(req[0])}${req.length > 1 ? ` (+${req.length - 1} more)` : ''}</div>` : ''}
    ${links ? `<div style="font-size:13px;margin-top:6px">${links}</div>` : ''}
  </div>`;
}

/* ---------- the hourly tick ---------- */
function emailTick() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('EMAILS_OFF')) return;
  const tz = Session.getScriptTimeZone();
  const hour = Number(Utilities.formatDate(new Date(), tz, 'H'));
  const weekday = Number(Utilities.formatDate(new Date(), tz, 'u'));   // 1 = Monday … 7 = Sunday
  const today = today_();
  const sent = JSON.parse(props.getProperty('SENT') || '{}');
  Object.keys(sent).forEach(k => { if (daysBetween_(sent[k], today) > 30) delete sent[k]; });
  const once = key => { if (sent[key]) return false; sent[key] = today; return true; };
  const rows = rows_(sheet_(), {}).rows;
  const active = r => r['Status'] === 'Saved' || r['Status'] === 'Preparing';
  const left = r => (r['Deadline'] ? daysBetween_(today, String(r['Deadline'])) : null);
  try {
    if (hour === 7 && once('morning:' + today)) morningEmail_(rows, today);
    if (hour === 9) countdownEmails_(rows.filter(r => active(r) && left(r) !== null), today, once);
    if (hour === 10) rows.filter(r => r['Status'] === 'Submitted' && r['Remind on'] && String(r['Remind on']) <= today)
      .forEach(r => { if (once('check:' + r['ID'] + ':' + r['Remind on'])) checkEmail_(r); });
    if (hour === 18) {
      const ignored = rows.filter(r => active(r) && left(r) !== null && left(r) >= 0 && left(r) <= 2 &&
        String(r['Updated'] || '').slice(0, 10) < addDays_(today, -1));
      if (ignored.length && once('ignored:' + today)) ignoredEmail_(ignored, today);
    }
    if (weekday === 7 && hour === 20 && once('sunday:' + today)) sundayEmail_(rows, today);
  } finally {
    props.setProperty('SENT', JSON.stringify(sent));
  }
}

function morningEmail_(rows, today) {
  const act = rows.filter(r => r['Status'] === 'Saved' || r['Status'] === 'Preparing');
  const due = act.filter(r => r['Deadline'] && daysBetween_(today, String(r['Deadline'])) >= 0 && daysBetween_(today, String(r['Deadline'])) <= 7)
    .sort((a, b) => String(a['Deadline']).localeCompare(String(b['Deadline'])));
  const overdue = act.filter(r => r['Deadline'] && daysBetween_(today, String(r['Deadline'])) < 0);
  const remind = act.filter(r => r['Remind on'] && String(r['Remind on']) <= today && due.indexOf(r) < 0);
  const fresh = rows.filter(r => String(r['Captured'] || '').slice(0, 10) >= addDays_(today, -1) && r['Status'] !== 'New' && r['Status'] !== 'Closed');
  const props = PropertiesService.getScriptProperties();
  const streak = props.getProperty('STREAK_AT') >= addDays_(today, -1) ? Number(props.getProperty('STREAK') || 0) : 0;
  const n = due.length + overdue.length + remind.length;
  const mood = overdue.length ? 'sassy' : due.some(r => daysBetween_(today, String(r['Deadline'])) <= 1) ? 'worried' : n ? 'happy' : 'sleepy';
  let body = `<p style="margin:0 0 6px">${streak ? `🍯 <b>${streak} ${streak === 1 ? 'day' : 'days'} of nectar.</b> ` : ''}${n ? `<b>${n} ${n === 1 ? 'thing needs' : 'things need'} you.</b>` : bisiLine_('clear')}</p>`;
  if (overdue.length) body += `<h3 style="margin:16px 0 4px;font-size:15px;color:#C2412B">Deadline passed (did you apply?)</h3>` + overdue.map(r => itemHtml_(r, 'closed ' + String(r['Deadline'])) + button_(r['ID'], 'applied', true)).join('');
  if (due.length) body += `<h3 style="margin:16px 0 4px;font-size:15px">Due this week</h3>` + due.map(r => { const d = daysBetween_(today, String(r['Deadline'])); return itemHtml_(r, d === 0 ? 'due TODAY' : d === 1 ? 'due tomorrow' : `${d} days left`); }).join('');
  if (remind.length) body += `<h3 style="margin:16px 0 4px;font-size:15px">You asked me to remind you</h3>` + remind.map(r => itemHtml_(r, r['Deadline'] ? 'due ' + r['Deadline'] : '')).join('');
  if (fresh.length) body += `<h3 style="margin:16px 0 4px;font-size:15px">Sorted since yesterday</h3><ul style="padding-left:18px;margin:4px 0">` + fresh.map(r => `<li>${escHtml_(r['Title'] || 'Untitled')}${r['Category'] ? ' <span style="color:#5D6D65">(' + escHtml_(r['Category']) + ')</span>' : ''}</li>`).join('') + '</ul>';
  sendBisi_(n ? `☀️ ${n} ${n === 1 ? 'thing' : 'things'} need you today` : '☀️ Nothing urgent today (enjoy it)', mood, bisiLine_('morning'), body);
}

function countdownEmails_(rows, today, once) {
  const group = [];
  rows.forEach(r => {
    const d = daysBetween_(today, String(r['Deadline']));
    if ([7, 3, 1, 0].indexOf(d) < 0 || !once('count:' + r['ID'] + ':' + d)) return;
    if (d <= 1) {
      const line = d === 0 ? bisiLine_('dueToday', { t: r['Title'] }) : bisiLine_('due', { t: r['Title'], d: 1 }).replace('1 days', '1 day');
      sendBisi_(d === 0 ? `🚨 ${r['Title']} closes TODAY` : `⏰ ${r['Title']} closes tomorrow`, d === 0 ? 'worried' : 'sassy', line,
        itemHtml_(r, d === 0 ? 'due TODAY' : 'due tomorrow') + button_(r['ID'], 'applied', true) + (r['Status'] === 'Saved' ? button_(r['ID'], 'preparing') : '') + button_(r['ID'], 'snooze'));
    } else group.push([r, d]);
  });
  if (group.length) {
    const top = group.sort((a, b) => a[1] - b[1])[0];
    sendBisi_(`⏳ ${group.length === 1 ? top[0]['Title'] + ' closes in ' + top[1] + ' days' : group.length + ' deadlines coming up'}`, 'worried',
      bisiLine_('due', { t: top[0]['Title'], d: top[1] }),
      group.map(([r, d]) => itemHtml_(r, `${d} days left`) + (r['Status'] === 'Saved' ? button_(r['ID'], 'preparing', true) : '') + button_(r['ID'], 'applied')).join(''));
  }
}

function ignoredEmail_(rows, today) {
  sendBisi_(`😤 You've been ignoring ${rows.length === 1 ? rows[0]['Title'] : rows.length + ' deadlines'}`, 'sassy', bisiLine_('ignored'),
    `<p style="margin:0 0 6px">These close in two days or less and nothing has changed since yesterday. I noticed. I always notice.</p>` +
    rows.map(r => { const d = daysBetween_(today, String(r['Deadline'])); return itemHtml_(r, d === 0 ? 'due TODAY' : d === 1 ? 'due tomorrow' : '2 days left') + button_(r['ID'], 'applied', true) + button_(r['ID'], 'preparing') + button_(r['ID'], 'snooze'); }).join(''));
}

function checkEmail_(r) {
  sendBisi_(`📬 Heard back from ${r['Title']}?`, 'worried', bisiLine_('check', { t: r['Title'] }),
    itemHtml_(r, r['Applied on'] ? 'applied ' + r['Applied on'] : 'submitted') +
    `<p style="margin:10px 0 4px">Tap what happened:</p>` +
    ['accepted', 'shortlisted', 'interview', 'rejected', 'nonews'].map((w, i) => button_(r['ID'], w, i === 0)).join(''));
}

function sundayEmail_(rows, today) {
  const docText = readDocText_('digest');
  const idx = docText.lastIndexOf('Week of');
  let section = idx >= 0 ? docText.slice(idx) : '';
  const fresh = section && /Week of/.test(section) ? section : '';
  const applied = rows.filter(r => String(r['Applied on'] || '').slice(0, 10) >= addDays_(today, -6)).length;
  const saved = rows.filter(r => String(r['Captured'] || '').slice(0, 10) >= addDays_(today, -6)).length;
  const results = rows.filter(r => r['Outcome'] && ['Accepted', 'Shortlisted', 'Interview', 'Rejected'].indexOf(r['Outcome']) >= 0 && String(r['Updated'] || '').slice(0, 10) >= addDays_(today, -6));
  const mood = results.some(r => r['Outcome'] !== 'Rejected') ? 'party' : applied ? 'happy' : 'sassy';
  let body = `<p style="margin:0 0 10px"><b>This week:</b> ${saved} saved · ${applied} applied${results.length ? ' · ' + results.length + ' result' + (results.length > 1 ? 's' : '') : ''}${applied ? '' : '. Zero applications. I said nothing. (I said this.)'}</p>`;
  if (results.length) body += '<ul style="padding-left:18px;margin:4px 0">' + results.map(r => `<li>${escHtml_(r['Title'])}: <b>${escHtml_(r['Outcome'])}</b></li>`).join('') + '</ul>';
  if (fresh) {
    body += `<div style="background:#F6F9F7;border-radius:12px;padding:12px 14px;margin-top:12px;white-space:pre-wrap;font-size:14px">${escHtml_(fresh.slice(0, 6000))}</div>`;
  }
  const digestUrl = docs_().docs['digest'];
  if (digestUrl) body += `<p style="margin-top:12px"><a href="${digestUrl}" style="color:#1E6A4E;font-weight:bold">Open your full digest →</a></p>`;
  sendBisi_('📊 Your week, from Bisi', mood, bisiLine_('sunday'), body);
}

/** Send one email now (for testing): kind = morning | sunday. */
function emailNow_(p) {
  const rows = rows_(sheet_(), {}).rows, today = today_();
  if (p.kind === 'sunday') sundayEmail_(rows, today); else morningEmail_(rows, today);
  return { ok: true, to: Session.getEffectiveUser().getEmail(), quota: MailApp.getRemainingDailyQuota() };
}


/* =====================================================================
 * Duplicates, real delete, Bisi's picks, eligibility, essay review, interview prep
 * ===================================================================== */
function normUrl_(u) {
  u = String(u || '').trim().toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  return u.length > 8 ? u : '';
}
function normTitle_(t) { return String(t || '').toLowerCase().replace(/\b(20\d\d|call for applications|apply now|applications? open)\b/g, '').replace(/[^a-z0-9]+/g, ''); }
function findDuplicate_(selfId, title, org, link) {
  const nl = normUrl_(link), nt = normTitle_(title), no = normTitle_(org);
  if (!nl && nt.length < 8) return null;
  const rows = rows_(sheet_(), {}).rows.filter(x => x['ID'] !== selfId && x['Status'] !== 'New' && x['Category'] !== 'Other' &&
    !/^(Deleted|Duplicate)/.test(String(x['Outcome'] || '')));
  return rows.find(x => {
    if (nl && normUrl_(x['Link']) === nl) return true;
    const xt = normTitle_(x['Title']);
    if (!xt || xt.length < 8) return false;
    if (xt === nt) return true;
    const contains = (xt.indexOf(nt) >= 0 || nt.indexOf(xt) >= 0) && Math.min(xt.length, nt.length) >= 12;
    return contains && (!no || !normTitle_(x['Organisation']) || normTitle_(x['Organisation']) === no);
  }) || null;
}

function deleteRow_(p) {
  const sh = sheet_();
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
  const idx = ids.indexOf(p.id);
  if (idx < 0) return { ok: false, error: 'not_found' };
  sh.deleteRow(idx + 2);
  return { ok: true, id: p.id };
}

/** Bisi's picks: a ready-made row with Status "Suggested" (the weekly Claude search adds these). */
function suggest_(p) {
  const f = p.fields || {};
  if (!f.Title) return { ok: false, error: 'missing_title' };
  const dup = findDuplicate_('', f.Title, f.Organisation, f.Link);
  if (dup) return { ok: true, skipped: 'already_tracked', id: dup['ID'] };
  const id = 's' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const now = new Date();
  const row = { 'ID': id, 'Captured': now, 'Status': 'Suggested', 'Category': 'Opportunity', 'Saved from': 'Bisi\'s picks', 'Updated': now };
  ['Title', 'Organisation', 'Type', 'Link', 'What it offers', 'Notes'].forEach(k => { if (f[k]) row[k] = String(f[k]); });
  if (Array.isArray(f.Requirements)) row['Requirements'] = f.Requirements.join('\n'); else if (f.Requirements) row['Requirements'] = String(f.Requirements);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.Deadline || '')) { const [y, m, d] = f.Deadline.split('-').map(Number); row['Deadline'] = new Date(y, m - 1, d); }
  sheet_().appendRow(HEADERS.map(h => row[h] !== undefined ? row[h] : ''));
  return { ok: true, id: id };
}

/* ---------- profile (from the app's welcome screens and Me tab) ---------- */
const PROFILE_FIELDS = ['nickname', 'name', 'dob', 'gender', 'email', 'country', 'city', 'school', 'course', 'level', 'gradYear', 'cgpa', 'interests', 'goals'];
function saveProfile_(p) {
  const pr = p.profile || {}, out = {};
  PROFILE_FIELDS.forEach(k => { if (pr[k] != null && String(pr[k]).trim()) out[k] = String(pr[k]).slice(0, 600); });
  PropertiesService.getScriptProperties().setProperty('PROFILE', JSON.stringify(out));
  return { ok: true, profile: out };
}
function loadProfile_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('PROFILE') || '{}'); } catch (e) { return {}; } }
function profileText_() {
  const p = loadProfile_();
  if (!Object.keys(p).length) return '';
  let age = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.dob || '')) {
    const d = new Date(p.dob + 'T12:00:00'), n = new Date();
    age = n.getFullYear() - d.getFullYear() - ((n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) ? 1 : 0);
  }
  const L = [];
  if (p.name || p.nickname) L.push('Name: ' + (p.name || p.nickname) + (p.nickname && p.name ? ' (goes by ' + p.nickname + ')' : ''));
  if (age !== '') L.push('Age: ' + age + ' (born ' + p.dob + ')');
  if (p.gender) L.push('Gender: ' + p.gender);
  if (p.country || p.city) L.push('Lives in: ' + [p.city, p.country].filter(String).join(', '));
  if (p.school) L.push('School: ' + p.school);
  if (p.course) L.push('Course: ' + p.course);
  if (p.level) L.push('Level/year: ' + p.level + (p.gradYear ? ', graduating ' + p.gradYear : ''));
  else if (p.gradYear) L.push('Graduating: ' + p.gradYear);
  if (p.cgpa) L.push('CGPA: ' + p.cgpa);
  if (p.interests) L.push('Interests: ' + p.interests);
  if (p.goals) L.push('Looking for: ' + p.goals);
  if (p.email) L.push('Email: ' + p.email);
  return 'PROFILE (from the app)\n' + L.join('\n');
}
function profileText2_() {
  return 'ABOUT ME:\n' + readDocText_('about-me').slice(0, 5000) + '\n\nMY CV:\n' + readDocText_('master-cv').slice(0, 9000);
}

/** "Am I eligible?" Strong / Possible / Long shot, with reasons, saved in the Eligibility column. */
function eligibility_(p) {
  const r = rowById_(sheet_(), p.id);
  if (!r) return { ok: false, error: 'not_found' };
  const prompt = `Judge honestly whether I'm a good candidate for this opportunity before I spend time applying.
Use only facts from my profile; if something important is unknown, say what to check. Reply with ONLY JSON:
{"verdict": "Strong" | "Possible" | "Long shot", "reasons": [2-4 short strings], "gaps": [0-3 short strings: what's missing or to check], "tip": "one sentence on how to strengthen the application"}

${oppContext_(r)}

${profileText2_()}`;
  const ans = gemini_([{ text: prompt }], { json: true, temperature: 0.2, fast: true });
  const j = parseJson_(ans.text);
  if (!j || !j.verdict) return { ok: false, error: 'Could not read the answer. Try again.' };
  const summary = j.verdict + ' · ' + (j.reasons || []).join('; ') + ((j.gaps || []).length ? ' · Check: ' + j.gaps.join('; ') : '') + (j.tip ? ' · Tip: ' + j.tip : '');
  withLock_(() => updateRow_(sheet_(), HEADERS, { id: p.id, fields: { Eligibility: summary } }));
  return { ok: true, verdict: j.verdict, reasons: j.reasons || [], gaps: j.gaps || [], tip: j.tip || '', summary: summary };
}

/** Feedback on a draft I wrote myself. */
function review_(p) {
  const draft = String(p.draft || '').trim();
  if (draft.split(/\s+/).length < 20) return { ok: false, error: 'Paste at least a paragraph of your draft.' };
  const r = p.id ? rowById_(sheet_(), p.id) : null;
  const words = draft.split(/\s+/).filter(String).length;
  const prompt = `Review my application essay draft like a kind but honest mentor. Plain text with short headings in CAPS, no markdown symbols.
Give, in this order:
ANSWERS THE QUESTION? yes / partly / no, and why (2 sentences).
TOP 3 FIXES: numbered, each quoting the sentence to change and giving a rewrite.
WHAT WORKS: 1-2 things to keep.
LENGTH: my draft is ${words} words${p.words ? ', limit ' + p.words : ''}; say what to cut or add.
Never invent facts about me; where a real example would help, say "[add a real example of …]".

${p.question ? 'QUESTION: ' + p.question + '\n' : ''}${r ? oppContext_(r) + '\n' : ''}
MY DRAFT:
${draft.slice(0, 12000)}`;
  const ans = gemini_([{ text: prompt }], { temperature: 0.4 });
  return { ok: true, text: ans.text, words: words };
}

/** Likely interview questions with answers built from my real CV, as a Google Doc. */
function interview_(p) {
  const r = rowById_(sheet_(), p.id);
  if (!r) return { ok: false, error: 'not_found' };
  const prompt = `I've been ${r['Outcome'] === 'Interview' ? 'invited to interview' : 'shortlisted'} for this opportunity. Prepare me.
Write simple markdown (# ## headings, - bullets, **bold**):
# Interview prep: <title>
## What they're probably looking for (3 bullets)
## Likely questions
For 8-10 questions (mix of motivation, technical/mechatronics, teamwork/leadership, and one curveball):
### <question>
- **Why they ask:** one line
- **Your answer outline:** 3 bullets using real stories from my CV and profile (never invent; write [ADD: …] if a real example is needed)
## Questions to ask them (3)
## The day before (5-point checklist)

${oppContext_(r)}

${profileText2_()}`;
  const ans = gemini_([{ text: prompt }], { temperature: 0.5 });
  const d = withLock_(() => doc_({ key: 'interview-' + p.id, title: 'Interview prep: ' + r['Title'], body: ans.text, mode: 'replace' }));
  withLock_(() => updateRow_(sheet_(), HEADERS, { id: p.id, fields: { 'Interview doc': d.url } }));
  return { ok: true, url: d.url };
}
