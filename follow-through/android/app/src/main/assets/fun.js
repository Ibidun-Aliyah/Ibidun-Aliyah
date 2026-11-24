/* Just-for-fun games: Bee Chess (vs Bisi, a real chess engine), Bisi Flight (arcade) and Pollen Pairs (memory).
 * All offline. games.js lists them under "Just for fun" and hands each one the screen while it's played. */
(() => {
const store = {
  get(k, d){ try { const v = localStorage.getItem('ftg-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('ftg-' + k, JSON.stringify(v)); } catch(e){} }
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bee = (mood, size, anim) => window.bisiSvg ? bisiSvg(mood, size, anim !== false) : '🐝';

/* =====================================================================
 * Chess engine (board of 64; index 0 = a8 … 63 = h1; white = uppercase)
 * ===================================================================== */
const Chess = (() => {
  const N = [-17, -15, -10, -6, 6, 10, 15, 17], K = [-9, -8, -7, -1, 1, 7, 8, 9];
  const R_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]], B_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // piece-square tables from white's point of view (index 0 = a8)
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };
  const isW = p => p && p === p.toUpperCase();
  const side = p => p ? (isW(p) ? 'w' : 'b') : null;
  const rc = i => [i >> 3, i & 7];

  function fromFEN(fen){
    const [pos, turn, cas, ep] = fen.split(' ');
    const b = [];
    for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) b.push(null); else b.push(ch); }
    const sq = s => s === '-' ? -1 : (8 - +s[1]) * 8 + (s.charCodeAt(0) - 97);
    return { b, turn, cas: cas === '-' ? '' : cas, ep: sq(ep || '-'), half: 0, hist: [] };
  }
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function attacked(s, i, by){
    const b = s.b, [r, c] = rc(i);
    // pawns
    const pr = by === 'w' ? r + 1 : r - 1, P = by === 'w' ? 'P' : 'p';
    if (pr >= 0 && pr < 8) { if (c > 0 && b[pr * 8 + c - 1] === P) return true; if (c < 7 && b[pr * 8 + c + 1] === P) return true; }
    const Nn = by === 'w' ? 'N' : 'n', Kk = by === 'w' ? 'K' : 'k';
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === Nn) return true; }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === Kk) return true; }
    const Rr = by === 'w' ? 'R' : 'r', Bb = by === 'w' ? 'B' : 'b', Qq = by === 'w' ? 'Q' : 'q';
    for (const [dirs, A] of [[R_DIRS, Rr], [B_DIRS, Bb]]) for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (p === A || p === Qq) return true; break; } rr += dr; cc += dc; }
    }
    return false;
  }
  const kingSq = (s, t) => s.b.indexOf(t === 'w' ? 'K' : 'k');
  const inCheck = (s, t) => attacked(s, kingSq(s, t), t === 'w' ? 'b' : 'w');

  function pseudo(s, capsOnly){
    const out = [], b = s.b, t = s.turn, opp = t === 'w' ? 'b' : 'w';
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p || side(p) !== t) continue;
      const [r, c] = rc(i), k = p.toLowerCase();
      const add = (to, extra) => { const cap = b[to]; if (capsOnly && !cap && !(extra && (extra.ep || extra.promo))) return; out.push(Object.assign({ from: i, to, piece: p, cap }, extra || {})); };
      if (k === 'p') {
        const d = t === 'w' ? -1 : 1, start = t === 'w' ? 6 : 1, last = t === 'w' ? 0 : 7;
        const one = (r + d) * 8 + c;
        if (r + d >= 0 && r + d < 8 && !b[one]) {
          if (r + d === last) for (const pr of 'qrbn') add(one, { promo: pr }); else if (!capsOnly) add(one);
          const two = (r + 2 * d) * 8 + c;
          if (!capsOnly && r === start && !b[two]) out.push({ from: i, to: two, piece: p, cap: null, dbl: true });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc, rr = r + d; if (cc < 0 || cc > 7 || rr < 0 || rr > 7) continue;
          const to = rr * 8 + cc;
          if (b[to] && side(b[to]) === opp) { if (rr === last) for (const pr of 'qrbn') add(to, { promo: pr }); else add(to); }
          else if (to === s.ep) out.push({ from: i, to, piece: p, cap: t === 'w' ? 'p' : 'P', ep: true });
        }
      } else if (k === 'n') {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const to = rr * 8 + cc; if (!b[to] || side(b[to]) === opp) add(to); }
      } else if (k === 'k') {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const to = rr * 8 + cc; if (!b[to] || side(b[to]) === opp) add(to); }
        if (!capsOnly) {
          const row = t === 'w' ? 56 : 0, KS = t === 'w' ? 'K' : 'k', QS = t === 'w' ? 'Q' : 'q';
          if (i === row + 4 && !inCheck(s, t)) {
            if (s.cas.includes(KS) && !b[row + 5] && !b[row + 6] && b[row + 7] === (t === 'w' ? 'R' : 'r') && !attacked(s, row + 5, opp) && !attacked(s, row + 6, opp)) out.push({ from: i, to: row + 6, piece: p, cap: null, castle: 'k' });
            if (s.cas.includes(QS) && !b[row + 3] && !b[row + 2] && !b[row + 1] && b[row] === (t === 'w' ? 'R' : 'r') && !attacked(s, row + 3, opp) && !attacked(s, row + 2, opp)) out.push({ from: i, to: row + 2, piece: p, cap: null, castle: 'q' });
          }
        }
      } else {
        const dirs = k === 'r' ? R_DIRS : k === 'b' ? B_DIRS : R_DIRS.concat(B_DIRS);
        for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const to = rr * 8 + cc; if (b[to]) { if (side(b[to]) === opp) add(to); break; } add(to); rr += dr; cc += dc; } }
      }
    }
    return out;
  }
  function make(s, m){
    const b = s.b, t = s.turn;
    s.hist.push({ m, cas: s.cas, ep: s.ep, half: s.half, captured: m.ep ? b[m.to + (t === 'w' ? 8 : -8)] : b[m.to] });
    b[m.to] = m.promo ? (t === 'w' ? m.promo.toUpperCase() : m.promo) : b[m.from];
    b[m.from] = null;
    if (m.ep) b[m.to + (t === 'w' ? 8 : -8)] = null;
    if (m.castle) { const row = t === 'w' ? 56 : 0; if (m.castle === 'k') { b[row + 5] = b[row + 7]; b[row + 7] = null; } else { b[row + 3] = b[row]; b[row] = null; } }
    const strip = sq => { if (sq === 63) s.cas = s.cas.replace('K', ''); if (sq === 56) s.cas = s.cas.replace('Q', ''); if (sq === 7) s.cas = s.cas.replace('k', ''); if (sq === 0) s.cas = s.cas.replace('q', ''); };
    if (m.piece === 'K') s.cas = s.cas.replace(/[KQ]/g, ''); if (m.piece === 'k') s.cas = s.cas.replace(/[kq]/g, '');
    strip(m.from); strip(m.to);
    s.ep = m.dbl ? (m.from + m.to) / 2 : -1;
    s.half = (m.piece.toLowerCase() === 'p' || m.cap) ? 0 : s.half + 1;
    s.turn = t === 'w' ? 'b' : 'w';
  }
  function unmake(s){
    const h = s.hist.pop(), m = h.m, b = s.b;
    s.turn = s.turn === 'w' ? 'b' : 'w';
    const t = s.turn;
    b[m.from] = m.piece;
    if (m.ep) { b[m.to] = null; b[m.to + (t === 'w' ? 8 : -8)] = h.captured; }
    else b[m.to] = h.captured;
    if (m.castle) { const row = t === 'w' ? 56 : 0; if (m.castle === 'k') { b[row + 7] = b[row + 5]; b[row + 5] = null; } else { b[row] = b[row + 3]; b[row + 3] = null; } }
    s.cas = h.cas; s.ep = h.ep; s.half = h.half;
  }
  function legal(s){
    const t = s.turn, out = [];
    for (const m of pseudo(s)) { make(s, m); if (!inCheck(s, t)) out.push(m); unmake(s); }
    return out;
  }
  function perft(s, d){ if (!d) return 1; let n = 0; for (const m of legal(s)) { make(s, m); n += perft(s, d - 1); unmake(s); } return n; }

  function evaluate(s){
    let score = 0;
    for (let i = 0; i < 64; i++) { const p = s.b[i]; if (!p) continue; const k = p.toLowerCase(); const v = VAL[k] + PST[k][isW(p) ? i : (7 - (i >> 3)) * 8 + (i & 7)]; score += isW(p) ? v : -v; }
    return s.turn === 'w' ? score : -score;
  }
  const order = ms => ms.sort((a, b) => ((b.cap ? VAL[b.cap.toLowerCase()] * 10 - VAL[b.piece.toLowerCase()] : 0) + (b.promo ? 800 : 0)) - ((a.cap ? VAL[a.cap.toLowerCase()] * 10 - VAL[a.piece.toLowerCase()] : 0) + (a.promo ? 800 : 0)));
  let nodes = 0, deadline = 0;
  function quiesce(s, alpha, beta, depth){
    nodes++;
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (alpha < stand) alpha = stand;
    if (depth <= 0) return alpha;
    const t = s.turn;
    for (const m of order(pseudo(s, true))) {
      make(s, m); if (inCheck(s, t)) { unmake(s); continue; }
      const sc = -quiesce(s, -beta, -alpha, depth - 1); unmake(s);
      if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function search(s, depth, alpha, beta, ply){
    nodes++;
    if (depth === 0) return quiesce(s, alpha, beta, 4);
    const ms = order(legal(s));
    if (!ms.length) return inCheck(s, s.turn) ? -100000 + ply : 0;
    if (s.half >= 100) return 0;
    for (const m of ms) {
      make(s, m); const sc = -search(s, depth - 1, -beta, -alpha, ply + 1); unmake(s);
      if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
      if (Date.now() > deadline) break;
    }
    return alpha;
  }
  /* level 1–4: Larva, Worker, Soldier, Queen */
  function best(s, level){
    const ms = legal(s); if (!ms.length) return null;
    const depth = [1, 2, 3, 4][level - 1] || 2, noise = [250, 50, 12, 0][level - 1] || 0;
    deadline = Date.now() + 4000; nodes = 0;
    let bestM = ms[0], bestS = -Infinity;
    for (const m of order(ms.slice())) {
      make(s, m); let sc = -search(s, depth - 1, -Infinity, Infinity, 1); unmake(s);
      sc += noise ? (Math.random() - 0.5) * noise : 0;
      if (sc > bestS) { bestS = sc; bestM = m; }
    }
    return bestM;
  }
  function material(s){ const n = { w: [], b: [] }; for (const p of s.b) if (p && p.toLowerCase() !== 'k') n[side(p)].push(p.toLowerCase()); return n; }
  function insufficient(s){ const m = material(s), all = m.w.concat(m.b); return all.length === 0 || (all.length === 1 && /[nb]/.test(all[0])); }
  function key(s){ return s.b.map(p => p || '.').join('') + s.turn + s.cas + s.ep; }
  return { fromFEN, START, legal, make, unmake, inCheck, best, perft, insufficient, key, side, VAL };
})();

/* ---------------- Bee Chess UI ---------------- */
const LEVELS = [['Larva', 'just hatched, very forgiving'], ['Worker', 'knows the rules, makes mistakes'], ['Soldier', 'thinks ahead, punishes blunders'], ['Queen', 'the real deal. Good luck.']];
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const SAY = {
  start: ['Let’s dance. I’m the one with the stinger. 🐝', 'Bzz. Your move, genius.', 'I’ve been practising on flowers. They lost.'],
  myCap: ['Yoink. 🐝', 'Mine now. Thanks!', 'Oops, did you need that?', 'Nom.'],
  yourCap: ['Hey! I needed that.', 'Rude. Very rude.', 'Okay, that one hurt.', 'I meant to do that. Strategy.'],
  check: ['Check! Bzz bzz. 👑', 'Your king looks nervous.', 'Knock knock. Check.'],
  checked: ['Check?! How dare you.', 'Ow. Okay. Thinking…', 'Fine. I see you.'],
  think: ['Thinking… 🤔', 'Hmm…', 'Calculating your doom…', 'Hold on, counting petals…'],
  win: ['Checkmate. Bisi wins! Better luck next time 😌', 'Checkmate! The hive is undefeated.'],
  lose: ['Checkmate… you beat me. I’m not crying, it’s pollen. 😭', 'Okay, you win. Rematch. Now.'],
  draw: ['A draw. We’re equally brilliant.', 'Draw! Nobody stings anybody today.'],
};
let ch = null;   // current chess game
function chessNew(level, color){
  ch = { s: Chess.fromFEN(Chess.START), level, you: color || 'w', sel: -1, moves: [], last: null, over: '', say: pick(SAY.start), mood: 'happy', reps: {}, thinking: false, caps: { w: [], b: [] } };
  store.set('chess-level', level);
  saveChess();
}
function saveChess(){ if (!ch) return; store.set('chess-game', { b: ch.s.b, turn: ch.s.turn, cas: ch.s.cas, ep: ch.s.ep, half: ch.s.half, level: ch.level, you: ch.you, over: ch.over, caps: ch.caps, last: ch.last }); }
function loadChess(){
  const g = store.get('chess-game', null); if (!g || g.over) return false;
  ch = { s: { b: g.b, turn: g.turn, cas: g.cas, ep: g.ep, half: g.half || 0, hist: [] }, level: g.level, you: g.you, sel: -1, moves: [], last: g.last, over: '', say: 'Welcome back. I kept your seat warm. 🐝', mood: 'happy', reps: {}, thinking: false, caps: g.caps || { w: [], b: [] } };
  return true;
}
function chessView(root){
  if (!ch) { if (!loadChess()) return chessSetup(root); }
  const s = ch.s, flip = ch.you === 'b', legal = ch.sel >= 0 ? ch.moves.filter(m => m.from === ch.sel) : [];
  const targets = new Set(legal.map(m => m.to)), checkSq = Chess.inCheck(s, s.turn) ? s.b.indexOf(s.turn === 'w' ? 'K' : 'k') : -1;
  let cells = '';
  for (let v = 0; v < 64; v++) {
    const i = flip ? 63 - v : v, r = i >> 3, c = i & 7, p = s.b[i], dark = (r + c) % 2 === 1;
    const cls = ['ch-sq', dark ? 'd' : 'l', i === ch.sel ? 'sel' : '', ch.last && (i === ch.last.from || i === ch.last.to) ? 'last' : '', i === checkSq ? 'chk' : '', targets.has(i) ? (p ? 'cap' : 'tgt') : ''].join(' ');
    const label = (c === (flip ? 7 : 0) ? `<i class="rk">${8 - r}</i>` : '') + (r === (flip ? 0 : 7) ? `<i class="fl">${'abcdefgh'[c]}</i>` : '');
    cells += `<button class="${cls}" data-sq="${i}" aria-label="${'abcdefgh'[c]}${8 - r}${p ? ' ' + (Chess.side(p) === 'w' ? 'white' : 'black') + ' ' + ({k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'})[p.toLowerCase()] : ''}">${label}${p ? `<span class="pc ${Chess.side(p)}">${GLYPH[p.toLowerCase()]}︎</span>` : ''}</button>`;
  }
  const capRow = side => ch.caps[side].slice().sort((a, b) => Chess.VAL[b] - Chess.VAL[a]).map(p => `<span class="pc ${side === 'w' ? 'b' : 'w'}">${GLYPH[p]}\uFE0E</span>`).join('');
  const bisiSide = ch.you === 'w' ? 'b' : 'w';
  const stats = store.get('chess-stats', {});
  const lv = LEVELS[ch.level - 1][0], rec = stats[lv] || { w: 0, l: 0, d: 0 };
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>♟️ Bee Chess</b><span class="pill">vs ${lv} Bisi</span></div>
    <div class="ch-bisi"><div class="ch-face">${bee(ch.mood, 64)}</div><div class="ch-say">${ch.say}</div></div>
    <div class="ch-caps">${ch.caps[bisiSide].length ? '<small>Bisi took</small> ' + capRow(bisiSide) : ''}</div>
    <div class="ch-board">${cells}</div>
    <div class="ch-caps">${ch.caps[ch.you].length ? '<small>You took</small> ' + capRow(ch.you) : ''}</div>
    <div class="row" style="justify-content:center;margin-top:10px">
      <button class="btn small" data-ch="undo" ${ch.thinking || !ch.s.hist.length ? 'disabled' : ''}>↶ Undo</button>
      <button class="btn small" data-ch="new">New game</button>
    </div>
    <p class="note" style="text-align:center">Your record vs ${lv} Bisi: ${rec.w} won · ${rec.l} lost · ${rec.d} drawn</p>`;
}
function chessSetup(root){
  const lvl = store.get('chess-level', 2), stats = store.get('chess-stats', {});
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>♟️ Bee Chess</b></div>
    <div class="card" style="text-align:center"><div style="width:110px;margin:0 auto">${bee('sassy', 110)}</div>
      <h3 style="font-family:var(--f-d);font-size:1.6rem;margin:6px 0">Play chess with Bisi</h3>
      <p class="note">She plays with a real chess engine, never cheats, and talks a lot of trash.</p>
      <div class="ch-lv">${LEVELS.map(([n, d], i) => { const r = stats[n]; return `<button class="btn ${i + 1 === lvl ? 'primary' : ''}" data-chlv="${i + 1}"><b>${n}</b><small>${d}${r ? ` · ${r.w}–${r.l}` : ''}</small></button>`; }).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-chgo="w">Play white (move first)</button><button class="btn" data-chgo="b">Play black</button></div>
    </div>`;
}
function chessAfterMove(root, m, byYou){
  const s = ch.s;
  ch.last = { from: m.from, to: m.to };
  if (m.cap) ch.caps[Chess.side(m.piece)].push(m.cap.toLowerCase());
  const k = Chess.key(s); ch.reps[k] = (ch.reps[k] || 0) + 1;
  const moves = Chess.legal(s), check = Chess.inCheck(s, s.turn);
  let end = '';
  if (!moves.length) end = check ? (byYou ? 'win' : 'loss') : 'draw';
  else if (s.half >= 100 || ch.reps[k] >= 3 || Chess.insufficient(s)) end = 'draw';
  if (end) {
    ch.over = end;
    const stats = store.get('chess-stats', {}), lv = LEVELS[ch.level - 1][0]; stats[lv] = stats[lv] || { w: 0, l: 0, d: 0 };
    stats[lv][end === 'win' ? 'w' : end === 'loss' ? 'l' : 'd']++; store.set('chess-stats', stats);
    ch.say = end === 'win' ? pick(SAY.lose) : end === 'loss' ? pick(SAY.win) : pick(SAY.draw);
    ch.mood = end === 'win' ? 'crying' : end === 'loss' ? 'party' : 'happy';
    if (end === 'win') store.set('pollen', store.get('pollen', 0) + 50 * ch.level);
  } else if (check) { ch.say = pick(byYou ? SAY.checked : SAY.check); ch.mood = byYou ? 'worried' : 'sassy'; }
  else if (m.cap) { ch.say = pick(byYou ? SAY.yourCap : SAY.myCap); ch.mood = byYou ? 'worried' : 'party'; }
  saveChess();
  chessView(root);
  if (end) setTimeout(() => { const say = root.querySelector('.ch-say'); if (say) say.innerHTML += `<div class="row" style="margin-top:8px"><button class="btn small primary" data-ch="again">Rematch</button><button class="btn small" data-ch="new">Change level</button></div>`; }, 50);
  else if (byYou) bisiMoves(root);
}
function bisiMoves(root){
  ch.thinking = true; ch.say = pick(SAY.think); ch.mood = 'happy'; chessView(root);
  setTimeout(() => {
    if (!ch || ch.over) return;
    const m = Chess.best(ch.s, ch.level);
    ch.thinking = false;
    if (!m) return;
    Chess.make(ch.s, m);
    if (!m.cap && !Chess.inCheck(ch.s, ch.s.turn)) { ch.say = pick(['Your move.', 'Bzz. Go on.', 'Take your time. I have all day. (I don’t.)', '🐝']); ch.mood = 'happy'; }
    chessAfterMove(root, m, false);
  }, 350);
}
function chessClick(root, e){
  const lv = e.target.closest('[data-chlv]'); if (lv){ store.set('chess-level', +lv.dataset.chlv); chessSetup(root); return true; }
  const go = e.target.closest('[data-chgo]'); if (go){ chessNew(store.get('chess-level', 2), go.dataset.chgo); chessView(root); if (ch.you === 'b') bisiMoves(root); return true; }
  const a = e.target.closest('[data-ch]');
  if (a){
    const v = a.dataset.ch;
    if (v === 'new'){ ch = null; store.set('chess-game', null); chessSetup(root); }
    if (v === 'again'){ chessNew(ch.level, ch.you); chessView(root); if (ch.you === 'b') bisiMoves(root); }
    if (v === 'undo' && ch && !ch.thinking){
      const back = ch.s.turn === ch.you ? 2 : 1;
      for (let k = 0; k < back && ch.s.hist.length; k++){ const h = ch.s.hist[ch.s.hist.length - 1]; if (h.captured) { const arr = ch.caps[Chess.side(h.m.piece)]; const at = arr.lastIndexOf(h.captured.toLowerCase()); if (at >= 0) arr.splice(at, 1); } Chess.unmake(ch.s); }
      ch.over = ''; ch.last = null; ch.sel = -1; ch.say = 'Fine, take it back. I saw nothing. 👀'; ch.mood = 'sassy'; saveChess(); chessView(root);
    }
    return true;
  }
  const sq = e.target.closest('[data-sq]');
  if (sq && ch && !ch.over && !ch.thinking && ch.s.turn === ch.you){
    const i = +sq.dataset.sq, p = ch.s.b[i];
    if (ch.sel >= 0){
      const m = ch.moves.find(x => x.from === ch.sel && x.to === i && (!x.promo || x.promo === 'q'));
      if (m){ ch.sel = -1; Chess.make(ch.s, m); chessAfterMove(root, m, true); return true; }
    }
    if (p && Chess.side(p) === ch.you){ ch.sel = i; ch.moves = Chess.legal(ch.s); }
    else ch.sel = -1;
    chessView(root);
    return true;
  }
  return false;
}

/* ---------------- Bisi Flight (arcade) ---------------- */
const FACTS = ['Bees visit about 2 million flowers to make one pound of honey.', 'A honeybee flaps its wings about 200 times a second.', 'Honey never spoils: edible honey has been found in ancient Egyptian tombs.', 'Bees dance to tell each other where the flowers are. It’s called the waggle dance.', 'A worker bee makes about 1/12 of a teaspoon of honey in her whole life.', 'Bees can recognise human faces.', 'Bees have five eyes.', 'One in three bites of food you eat depends on pollinators like bees.'];
let fl = null;
function flightStart(root){
  const best = store.get('flight-best', 0);
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🐝 Bisi Flight</b><span class="pill">Best ${best}</span></div>
    <div class="fl-wrap"><canvas id="fl-cv" aria-label="Bisi Flight game. Tap to fly."></canvas>
      <div class="fl-over" id="fl-over"><div style="width:90px;margin:0 auto">${bee('happy', 90)}</div><h3>Bisi Flight</h3><p>Tap to flap. Dodge the stems, grab the nectar 🍯</p><button class="btn primary" data-fl="go">Play</button></div></div>`;
  const cv = root.querySelector('#fl-cv'), wrap = cv.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = wrap.clientWidth, H = Math.min(560, Math.max(380, Math.round(innerHeight * 0.62)));
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.bisiSvg ? bisiSvg('happy', 64, false) : '<svg xmlns="http://www.w3.org/2000/svg"/>');
  fl = { root, cv, g, W, H, img, state: 'ready', raf: 0 };
  const tap = e => { e.preventDefault(); if (fl && fl.state === 'play') fl.vy = -6.6; };
  cv.addEventListener('pointerdown', tap);
  drawFlight(true);
}
function flightGo(){
  Object.assign(fl, { state: 'play', y: fl.H / 2, vy: 0, t: 0, score: 0, nectar: 0, pipes: [], drops: [], speed: 2.6 });
  fl.root.querySelector('#fl-over').hidden = true;
  const step = () => { if (!fl || fl.state !== 'play') return; tickFlight(); drawFlight(); fl.raf = requestAnimationFrame(step); };
  fl.raf = requestAnimationFrame(step);
}
function tickFlight(){
  const f = fl; f.t++; f.vy += 0.36; f.y += f.vy; f.speed = 2.6 + Math.min(2.4, f.t / 1500);
  if (f.t % Math.round(95 - Math.min(30, f.t / 120)) === 1) {
    const gap = Math.max(130, 175 - f.t / 90), top = 50 + Math.random() * (f.H - gap - 110);
    f.pipes.push({ x: f.W + 30, top, gap, passed: false });
    if (Math.random() < 0.7) f.drops.push({ x: f.W + 30 + 95, y: 40 + Math.random() * (f.H - 80), got: false });
  }
  for (const p of f.pipes) { p.x -= f.speed; if (!p.passed && p.x + 34 < 70) { p.passed = true; f.score++; } }
  for (const d of f.drops) { d.x -= f.speed; if (!d.got && Math.hypot(d.x - 70, d.y - f.y) < 26) { d.got = true; f.nectar++; } }
  f.pipes = f.pipes.filter(p => p.x > -60); f.drops = f.drops.filter(d => d.x > -30 && !d.got);
  const hit = f.y < 14 || f.y > f.H - 30 || f.pipes.some(p => 70 + 16 > p.x && 70 - 16 < p.x + 34 && (f.y - 15 < p.top || f.y + 15 > p.top + p.gap));
  if (hit) flightOver();
}
function drawFlight(still){
  const f = fl, g = f.g, W = f.W, H = f.H;
  g.fillStyle = '#CFE8F7'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#FFFFFF'; for (let k = 0; k < 4; k++) { const x = ((k * 140 - (f.t || 0) * 0.4) % (W + 140) + W + 140) % (W + 140) - 70; g.beginPath(); g.ellipse(x, 60 + k * 37 % 90, 40, 14, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#9BD17A'; g.fillRect(0, H - 22, W, 22); g.strokeStyle = '#1E1606'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, H - 22); g.lineTo(W, H - 22); g.stroke();
  for (const p of f.pipes || []) {
    for (const [y, h, up] of [[0, p.top, false], [p.top + p.gap, H - 22 - p.top - p.gap, true]]) {
      g.fillStyle = '#5FA453'; g.fillRect(p.x + 10, y, 14, h); g.strokeRect(p.x + 10, y, 14, h);
      const fy = up ? y : y + h; g.fillStyle = up ? '#FF8FB1' : '#FFC629';
      for (let a = 0; a < 6; a++) { g.beginPath(); g.ellipse(p.x + 17 + Math.cos(a) * 13, fy + Math.sin(a) * 13, 10, 7, a, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.fillStyle = '#7A4A05'; g.beginPath(); g.arc(p.x + 17, fy, 7, 0, Math.PI * 2); g.fill();
    }
  }
  for (const d of f.drops || []) { g.fillStyle = '#F5B700'; g.beginPath(); g.moveTo(d.x, d.y - 11); g.quadraticCurveTo(d.x + 10, d.y + 3, d.x, d.y + 9); g.quadraticCurveTo(d.x - 10, d.y + 3, d.x, d.y - 11); g.fill(); g.stroke(); }
  const y = still ? H / 2 : f.y;
  g.save(); g.translate(70, y); g.rotate(Math.max(-0.5, Math.min(0.9, (f.vy || 0) / 10)));
  if (f.img.complete) g.drawImage(f.img, -26, -26, 52, 52); else { g.fillStyle = '#FFC629'; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); }
  g.restore();
  if (!still) { g.fillStyle = '#1E1606'; g.font = 'bold 30px "Patrick Hand", cursive'; g.textAlign = 'center'; g.fillText(String(f.score), W / 2, 44); g.font = 'bold 16px Nunito, sans-serif'; g.fillText('🍯 ' + f.nectar, W / 2, 66); }
}
function flightOver(){
  const f = fl; f.state = 'over'; cancelAnimationFrame(f.raf);
  const total = f.score + f.nectar * 2, prev = store.get('flight-best', 0);
  if (total > prev) store.set('flight-best', total);
  store.set('pollen', store.get('pollen', 0) + total);
  const o = f.root.querySelector('#fl-over'); o.hidden = false;
  o.innerHTML = `<div style="width:80px;margin:0 auto">${bee(total > prev && prev ? 'party' : f.score < 3 ? 'crying' : 'worried', 80)}</div>
    <h3>${total > prev && prev ? 'New best! 🎉' : f.score < 3 ? 'Ouch.' : 'Bonk!'}</h3>
    <p><b>${f.score}</b> flowers passed · <b>${f.nectar}</b> nectar · score <b>${total}</b></p>
    <p class="note">🐝 ${pick(FACTS)}</p><button class="btn primary" data-fl="go">Fly again</button>`;
}

/* ---------------- Pollen Pairs (memory with learning decks) ---------------- */
const DECKS = {
  chem: { name: 'Chemistry symbols', pairs: [['Fe', 'Iron'], ['Na', 'Sodium'], ['K', 'Potassium'], ['Cu', 'Copper'], ['Ag', 'Silver'], ['Au', 'Gold'], ['Pb', 'Lead'], ['Hg', 'Mercury'], ['Sn', 'Tin'], ['Zn', 'Zinc'], ['Si', 'Silicon'], ['Cl', 'Chlorine'], ['W', 'Tungsten'], ['Li', 'Lithium']] },
  units: { name: 'Units & quantities', pairs: [['Ω', 'Resistance'], ['F', 'Capacitance'], ['H', 'Inductance'], ['Hz', 'Frequency'], ['N', 'Force'], ['Pa', 'Pressure'], ['J', 'Energy'], ['W', 'Power'], ['C', 'Charge'], ['T', 'Magnetic flux density'], ['Wb', 'Magnetic flux'], ['K', 'Temperature'], ['cd', 'Luminous intensity'], ['mol', 'Amount of substance']] },
  words: { name: 'Words & meanings', pairs: null },
};
let pp = null;
function pairsSetup(root){
  const best = store.get('pairs-best', {});
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🃏 Pollen Pairs</b></div>
    <div class="card" style="text-align:center"><div style="width:90px;margin:0 auto">${bee('happy', 90)}</div>
      <h3 style="font-family:var(--f-d);font-size:1.5rem;margin:6px 0">Find the matching pairs</h3>
      <p class="note">Flip two cards. A symbol matches its name; a word matches its meaning.</p>
      <div class="ch-lv">${Object.entries(DECKS).map(([k, d]) => `<button class="btn" data-pp="${k}"><b>${d.name}</b><small>${best[k] ? 'Best: ' + best[k] + ' moves' : 'Not played yet'}</small></button>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px">${[['6', 'Easy'], ['8', 'Medium'], ['10', 'Hard']].map(([n, l]) => `<button class="btn small ${store.get('pairs-n', 8) == n ? 'primary' : ''}" data-ppn="${n}">${l}</button>`).join('')}</div>
    </div>`;
}
function wordPairs(){
  const src = window.FTGames && FTGames._words ? FTGames._words() : [];
  return src.map(w => [w[0], w[1]]);
}
function pairsGo(root, deck){
  const n = +store.get('pairs-n', 8), all = deck === 'words' ? wordPairs() : DECKS[deck].pairs;
  const chosen = shuffle(all).slice(0, n);
  const cards = shuffle(chosen.flatMap((p, i) => [{ id: i, t: p[0], big: true }, { id: i, t: p[1] }]));
  pp = { root, deck, cards, open: [], done: new Set(), moves: 0, start: Date.now(), lock: false };
  pairsView();
}
function pairsView(){
  const cols = pp.cards.length > 16 ? 4 : pp.cards.length > 12 ? 4 : 3;
  pp.root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🃏 ${DECKS[pp.deck].name}</b><span class="pill">${pp.moves} moves</span></div>
    <div class="pp-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${pp.cards.map((c, i) => {
      const up = pp.open.includes(i) || pp.done.has(c.id);
      return `<button class="pp-card ${up ? 'up' : ''} ${pp.done.has(c.id) ? 'ok' : ''}" data-ppc="${i}" aria-label="${up ? c.t : 'Hidden card'}">${up ? `<span class="${c.big ? 'pp-big' : 'pp-sm'}">${c.t}</span>` : '<span class="pp-back">🐝</span>'}</button>`; }).join('')}</div>`;
}
function pairsFlip(i){
  if (pp.lock || pp.open.includes(i) || pp.done.has(pp.cards[i].id)) return;
  pp.open.push(i); pairsView();
  if (pp.open.length < 2) return;
  pp.moves++;
  const [a, b] = pp.open;
  if (pp.cards[a].id === pp.cards[b].id) {
    pp.done.add(pp.cards[a].id); pp.open = []; setTimeout(pairsView, 250);
    if (pp.done.size === pp.cards.length / 2) setTimeout(pairsWin, 500);
  } else { pp.lock = true; setTimeout(() => { pp.open = []; pp.lock = false; pairsView(); }, 900); }
}
function pairsWin(){
  const secs = Math.round((Date.now() - pp.start) / 1000), best = store.get('pairs-best', {}), prev = best[pp.deck];
  if (!prev || pp.moves < prev) { best[pp.deck] = pp.moves; store.set('pairs-best', best); }
  store.set('pollen', store.get('pollen', 0) + Math.max(10, 60 - pp.moves));
  pp.root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🃏 Pollen Pairs</b></div>
    <div class="card g-end"><div class="g-bisi">${bee('party', 96)}</div><div class="g-score">${pp.moves}</div><div>moves · ${secs}s${!prev || pp.moves < prev ? ' · <b>New best!</b>' : ''}</div>
      <p>${pp.moves <= pp.cards.length / 2 + 2 ? 'Photographic memory?! Who are you.' : pp.moves <= pp.cards.length ? 'Sharp! Bisi approves.' : 'Got there. Your brain is warmed up now. 🐝'}</p>
      <div class="row" style="justify-content:center"><button class="btn primary" data-pp="${pp.deck}">Play again</button><button class="btn" data-ppback>Other decks</button></div></div>`;
}

/* ---------------- registry ---------------- */
let active = null, root = null;
const FUN = {
  chess:  { name: 'Bee Chess', icon: '♟️', blurb: 'Play chess against Bisi: four levels from Larva to Queen. She talks trash.', start: r => chessView(r) },
  flight: { name: 'Bisi Flight', icon: '🐝', blurb: 'Tap to fly between the flowers and grab nectar. Harder the longer you last.', start: r => flightStart(r) },
  pairs:  { name: 'Pollen Pairs', icon: '🃏', blurb: 'Flip cards to match symbols, units and words with their meanings.', start: r => pairsSetup(r) },
};
function onClick(e){
  if (!active) return;
  if (active === 'chess' && chessClick(root, e)) return;
  if (active === 'flight'){ const b = e.target.closest('[data-fl]'); if (b) flightGo(); return; }
  if (active === 'pairs'){
    const d = e.target.closest('[data-pp]'); if (d) return pairsGo(root, d.dataset.pp);
    const n = e.target.closest('[data-ppn]'); if (n){ store.set('pairs-n', +n.dataset.ppn); return pairsSetup(root); }
    if (e.target.closest('[data-ppback]')) return pairsSetup(root);
    const c = e.target.closest('[data-ppc]'); if (c) return pairsFlip(+c.dataset.ppc);
  }
}
window.FTFun = {
  list: FUN,
  meta(k){ if (k === 'chess'){ const s = store.get('chess-stats', {}); const w = Object.values(s).reduce((a, x) => a + x.w, 0); return w ? `${w} win${w === 1 ? '' : 's'}` : ''; }
           if (k === 'flight'){ const b = store.get('flight-best', 0); return b ? 'Best ' + b : ''; }
           if (k === 'pairs'){ const b = Object.values(store.get('pairs-best', {})); return b.length ? 'Best ' + Math.min(...b) + ' moves' : ''; } return ''; },
  start(k, el){ stop(); active = k; root = el; if (!el.dataset.funWired){ el.addEventListener('click', onClick); el.dataset.funWired = 1; } FUN[k].start(el); },
  stop,
  _chess: Chess,
};
function stop(){ if (fl){ cancelAnimationFrame(fl.raf); fl.state = 'over'; fl = null; } if (ch) saveChess(); ch = null; pp = null; active = null; }
if (typeof module !== 'undefined') module.exports = { Chess };
})();
