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
  'Notes', 'Outcome', 'Updated', 'Category', 'Essay doc', 'CV doc'
];
const STATUSES = ['New', 'Saved', 'Preparing', 'Submitted', 'Closed'];
const CATEGORIES = ['Opportunity', 'Event', 'Tip', 'Other'];
const TIPS_NAME = 'Tips & Resources';
const TIP_HEADERS = ['ID', 'Saved', 'Topic', 'Title', 'Key points', 'Link', 'Saved from', 'Screenshot', 'In digest'];
const FOLDER_NAME = 'Follow-Through captures';
const DOCS_FOLDER = 'Follow-Through';
const SCHEMA = '2';

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

function handle_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (PropertiesService.getScriptProperties().getProperty('SCHEMA') !== SCHEMA) setup();
    switch (p.action) {
      case 'ping': { const ss = book_(); return json_({ ok: true, sheet: ss.getName(), sheetUrl: ss.getUrl(), schema: SCHEMA }); }
      case 'capture': return json_(capture_(p));
      case 'list': return json_(list_(p));
      case 'update': return json_(update_(p));
      case 'image': return json_(image_(p));
      case 'tip': return json_(tip_(p));
      case 'tips': return json_(rows_(tipsSheet_(), p));
      case 'tipUpdate': return json_(updateRow_(tipsSheet_(), TIP_HEADERS, p));
      case 'doc': return json_(doc_(p));
      case 'readDoc': return json_(readDoc_(p));
      case 'docs': return json_(docs_());
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
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
      o[h] = v instanceof Date ? Utilities.formatDate(v, tz, (h === 'Deadline' || h === 'Remind on') ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm") : v;
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
    if ((h === 'Deadline' || h === 'Remind on') && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
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
    if (mode === 'replace' || created) body.clear();
    renderMarkdown_(body, String(p.body || ''));
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
