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
  'Notes', 'Outcome', 'Updated', 'Category', 'Essay doc', 'CV doc', 'Applied on'
];
const STATUSES = ['New', 'Saved', 'Preparing', 'Submitted', 'Closed'];
const OUTCOMES = ['Accepted', 'Shortlisted', 'Interview', 'Rejected', 'No response', 'Missed the deadline', 'Decided not to apply', 'Not an opportunity'];
const DATE_COLS = ['Deadline', 'Remind on', 'Applied on'];
const CATEGORIES = ['Opportunity', 'Event', 'Tip', 'Other'];
const TIPS_NAME = 'Tips & Resources';
const TIP_HEADERS = ['ID', 'Saved', 'Topic', 'Title', 'Key points', 'Link', 'Saved from', 'Screenshot', 'In digest'];
const FOLDER_NAME = 'Follow-Through captures';
const DOCS_FOLDER = 'Follow-Through';
const SCHEMA = '6';

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
  Logger.log('All set: the tracker can now create Google Docs and use Gemini.');
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
  return handle_(e.parameter || {});
}
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  return handle_(body);
}

const AI_ACTIONS = ['process', 'essay', 'tailor', 'uploadCv', 'cvAdd', 'setKey'];

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
