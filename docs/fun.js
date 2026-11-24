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
  const inCheck = (s, t) => { const k = kingSq(s, t); return k >= 0 && attacked(s, k, t === 'w' ? 'b' : 'w'); };

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
  /* score of a move for the side making it (higher = better), searching `depth` plies */
  function scoreMove(s, m, depth){ deadline = Date.now() + 3000; make(s, m); const sc = -search(s, Math.max(0, depth - 1), -Infinity, Infinity, 1); unmake(s); return sc; }
  /* moves `t` could make right now even if it isn't their turn */
  function movesFor(s, t){ const old = s.turn, oldEp = s.ep; s.turn = t; if (t !== old) s.ep = -1; const ms = legal(s); s.turn = old; s.ep = oldEp; return ms; }
  return { fromFEN, START, legal, make, unmake, inCheck, best, perft, insufficient, key, side, VAL, attacked, scoreMove, movesFor };
})();

/* ---------------- Bee Chess UI ---------------- */
const LEVELS = [['Larva', 'just hatched, very forgiving'], ['Worker', 'knows the rules, makes mistakes'], ['Soldier', 'thinks ahead, punishes blunders'], ['Queen', 'the real deal. Good luck.']];
/* the bee cast: [bee name, chess name] */
const NAMES = { k: ['Drone King', 'king'], q: ['Queen Bee', 'queen'], r: ['Hive', 'rook'], b: ['Flower', 'bishop'], n: ['Butterfly', 'knight'], p: ['Worker', 'pawn'] };
const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
const sqIdx = n => (8 - +n[1]) * 8 + (n.charCodeAt(0) - 97);
const pname = p => NAMES[p.toLowerCase()][0];

/* hand-drawn pieces (100×100). Honey team = white, Midnight team = black */
const TEAM = {
  w: { body: '#FFC629', stripe: '#1E1606', wing: '#EAF5FF', ink: '#1E1606', crown: '#F5B700', jewel: '#D9533B', skep: '#F2C46B', skepLine: '#A86F12', petal: '#FFFDF4', centre: '#F5B700', bfly: '#FF9F43', spot: '#1E1606', eye: '#FFFFFF' },
  b: { body: '#3A2D52', stripe: '#C9B4F2', wing: '#B9AADA', ink: '#120C1C', crown: '#C9B4F2', jewel: '#FFC629', skep: '#5D4C7D', skepLine: '#241B37', petal: '#9B79D6', centre: '#3A2D52', bfly: '#7C5CC0', spot: '#E9DEFF', eye: '#E9DEFF' },
};
function beeBody(T, cx, cy, r, wings){
  const w = wings ? `<ellipse cx="${cx - r * .9}" cy="${cy - r * .75}" rx="${r * .62}" ry="${r * .42}" fill="${T.wing}" stroke="${T.ink}" stroke-width="3.5" transform="rotate(-25 ${cx - r * .9} ${cy - r * .75})"/>
    <ellipse cx="${cx + r * .9}" cy="${cy - r * .75}" rx="${r * .62}" ry="${r * .42}" fill="${T.wing}" stroke="${T.ink}" stroke-width="3.5" transform="rotate(25 ${cx + r * .9} ${cy - r * .75})"/>` : '';
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  return `${w}<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${T.body}"/>
    <g clip-path="url(#${id})" fill="${T.stripe}"><rect x="${cx - r}" y="${cy + r * .22}" width="${r * 2}" height="${r * .26}"/><rect x="${cx - r}" y="${cy + r * .62}" width="${r * 2}" height="${r * .26}"/></g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${T.ink}" stroke-width="4"/>
    <circle cx="${cx - r * .34}" cy="${cy - r * .2}" r="${r * .16}" fill="${T.eye}" stroke="${T.ink}" stroke-width="2"/><circle cx="${cx + r * .34}" cy="${cy - r * .2}" r="${r * .16}" fill="${T.eye}" stroke="${T.ink}" stroke-width="2"/>
    <circle cx="${cx - r * .3}" cy="${cy - r * .18}" r="${r * .07}" fill="${T.ink}"/><circle cx="${cx + r * .38}" cy="${cy - r * .18}" r="${r * .07}" fill="${T.ink}"/>`;
}
function pieceSvg(p){
  const t = Chess.side(p), T = TEAM[t], k = p.toLowerCase();
  let g = '';
  if (k === 'p') g = `<path d="M43 38 Q38 26 32 24 M57 38 Q62 26 68 24" stroke="${T.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>` + beeBody(T, 50, 62, 21, true);
  if (k === 'k') g = beeBody(T, 50, 64, 26, true) +
    `<path d="M30 40 L30 22 L40 31 L50 16 L60 31 L70 22 L70 40 Z" fill="${T.crown}" stroke="${T.ink}" stroke-width="3.5" stroke-linejoin="round"/>
     <path d="M50 2 V14 M44 7 H56" stroke="${T.ink}" stroke-width="4.5" stroke-linecap="round"/><circle cx="50" cy="32" r="3.5" fill="${T.jewel}"/>`;
  if (k === 'q') g = beeBody(T, 50, 64, 25, true) +
    `<path d="M28 42 L26 22 L37 33 L43 16 L50 31 L57 16 L63 33 L74 22 L72 42 Z" fill="${T.crown}" stroke="${T.ink}" stroke-width="3.5" stroke-linejoin="round"/>
     ${[[26, 20], [43, 13], [57, 13], [74, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${T.jewel}" stroke="${T.ink}" stroke-width="2.5"/>`).join('')}`;
  if (k === 'r') g = `<path d="M20 84 Q18 42 50 18 Q82 42 80 84 Z" fill="${T.skep}" stroke="${T.ink}" stroke-width="4" stroke-linejoin="round"/>
     ${[34, 48, 62, 74].map(y => { const half = y < 40 ? 14 : y < 52 ? 24 : 28; return `<path d="M${50 - half} ${y} Q50 ${y + 5} ${50 + half} ${y}" stroke="${T.skepLine}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`; }).join('')}
     <path d="M41 84 V74 Q50 64 59 74 V84 Z" fill="${T.ink}"/><rect x="14" y="82" width="72" height="9" rx="4" fill="${T.skepLine}" stroke="${T.ink}" stroke-width="3"/>`;
  if (k === 'b') g = `<path d="M50 88 V46" stroke="#3E7D33" stroke-width="6" stroke-linecap="round"/>
     <ellipse cx="62" cy="66" rx="12" ry="6" fill="#5FA453" stroke="${T.ink}" stroke-width="3" transform="rotate(-30 62 66)"/>
     ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="${50 + Math.cos(a * Math.PI / 180) * 15}" cy="${33 + Math.sin(a * Math.PI / 180) * 15}" rx="11" ry="8" fill="${T.petal}" stroke="${T.ink}" stroke-width="3" transform="rotate(${a} ${50 + Math.cos(a * Math.PI / 180) * 15} ${33 + Math.sin(a * Math.PI / 180) * 15})"/>`).join('')}
     <circle cx="50" cy="33" r="9" fill="${T.centre}" stroke="${T.ink}" stroke-width="3"/><ellipse cx="50" cy="90" rx="20" ry="5" fill="${T.ink}" opacity=".85"/>`;
  if (k === 'n') g = `<path d="M47 22 Q40 10 33 10 M53 22 Q60 10 67 10" stroke="${T.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
     <path d="M48 36 Q20 8 10 30 Q6 52 46 50 Z M52 36 Q80 8 90 30 Q94 52 54 50 Z" fill="${T.bfly}" stroke="${T.ink}" stroke-width="3.5" stroke-linejoin="round"/>
     <path d="M47 52 Q22 58 24 76 Q34 88 48 64 Z M53 52 Q78 58 76 76 Q66 88 52 64 Z" fill="${T.bfly}" stroke="${T.ink}" stroke-width="3.5" stroke-linejoin="round"/>
     <circle cx="27" cy="32" r="5" fill="${T.spot}"/><circle cx="73" cy="32" r="5" fill="${T.spot}"/><circle cx="34" cy="70" r="3.5" fill="${T.spot}"/><circle cx="66" cy="70" r="3.5" fill="${T.spot}"/>
     <ellipse cx="50" cy="52" rx="6" ry="27" fill="${T.body}" stroke="${T.ink}" stroke-width="3.5"/><path d="M45 48 H55 M45 58 H55" stroke="${T.stripe}" stroke-width="3"/>`;
  return `<svg class="pc" viewBox="0 0 100 100" aria-hidden="true">${g}</svg>`;
}
/* the board, shared by games and lessons */
function boardHTML(s, o){
  o = o || {};
  const flip = !!o.flip, checkSq = Chess.inCheck(s, s.turn) ? s.b.indexOf(s.turn === 'w' ? 'K' : 'k') : -1;
  const targets = new Set((o.moves || []).map(m => m.to)), honey = new Set(o.honey || []), threat = new Set(o.threats || []), hint = o.hint || null;
  let cells = '';
  for (let v = 0; v < 64; v++) {
    const i = flip ? 63 - v : v, r = i >> 3, c = i & 7, p = s.b[i];
    const cls = ['ch-sq', (r + c) % 2 ? 'd' : 'l', i === o.sel ? 'sel' : '', o.last && (i === o.last.from || i === o.last.to) ? 'last' : '', i === checkSq ? 'chk' : '',
      targets.has(i) ? (p ? 'cap' : 'tgt') : '', threat.has(i) ? 'thr' : '', hint && (i === hint.from || i === hint.to) ? 'hint' : ''].join(' ');
    const label = (c === (flip ? 7 : 0) ? `<i class="rk">${8 - r}</i>` : '') + (r === (flip ? 0 : 7) ? `<i class="fl">${'abcdefgh'[c]}</i>` : '');
    const desc = sqName(i) + (p ? ', ' + (Chess.side(p) === 'w' ? 'Honey ' : 'Midnight ') + NAMES[p.toLowerCase()][0] + ' (' + NAMES[p.toLowerCase()][1] + ')' : '') + (honey.has(i) ? ', honey drop' : '');
    cells += `<button class="${cls}" data-sq="${i}" aria-label="${desc}">${label}${p ? pieceSvg(p) : honey.has(i) ? '<span class="ch-honey" aria-hidden="true"></span>' : ''}</button>`;
  }
  return `<div class="ch-frame"><div class="ch-board">${cells}</div></div>`;
}
const SAY = {
  start: ['Let’s dance. I’m the one with the stinger. 🐝', 'Bzz. Your move, genius.', 'I’ve been practising on flowers. They lost.'],
  myCap: ['Yoink. 🐝', 'Mine now. Thanks!', 'Oops, did you need that?', 'Nom.'],
  yourCap: ['Hey! I needed that.', 'Rude. Very rude.', 'Okay, that one hurt.', 'I meant to do that. Strategy.'],
  check: ['Check! Bzz bzz. 👑', 'Your Drone King looks nervous.', 'Knock knock. Check.'],
  checked: ['Check?! How dare you.', 'Ow. Okay. Thinking…', 'Fine. I see you.'],
  think: ['Thinking… 🤔', 'Hmm…', 'Calculating your doom…', 'Hold on, counting petals…'],
  win: ['Checkmate. Bisi wins! Better luck next time 😌', 'Checkmate! The hive is undefeated.'],
  lose: ['Checkmate… you beat me. I’m not crying, it’s pollen. 😭', 'Okay, you win. Rematch. Now.'],
  draw: ['A draw. We’re equally brilliant.', 'Draw! Nobody stings anybody today.'],
};
/* your pieces Bisi could win right now (attacked and not safely defended) */
function threatsTo(s, me){
  const opp = me === 'w' ? 'b' : 'w', caps = Chess.movesFor(s, opp).filter(m => m.cap && Chess.side(m.cap) === me);
  const out = new Map();
  for (const m of caps) {
    const victim = Chess.VAL[m.cap.toLowerCase()], attacker = Chess.VAL[m.piece.toLowerCase()];
    if (m.cap.toLowerCase() === 'k') continue;
    if (!Chess.attacked(s, m.to, me) || attacker < victim) { const prev = out.get(m.to); if (!prev || Chess.VAL[prev.piece.toLowerCase()] > attacker) out.set(m.to, m); }
  }
  return [...out.values()];
}
function describeMove(m, who){
  const nm = pname(m.piece), cn = NAMES[m.piece.toLowerCase()][1];
  let t = `${who} ${nm} (${cn}) ${m.castle ? 'castled ' + (m.castle === 'k' ? 'kingside' : 'queenside') : 'went from ' + sqName(m.from) + ' to ' + sqName(m.to)}`;
  if (m.cap) t += `, capturing ${who === 'My' ? 'your' : 'my'} ${pname(m.cap)}`;
  if (m.promo) t += ` and became a ${pname(m.promo)}`;
  return t + '.';
}
let ch = null;   // current game
function chessNew(level, color, tutor){
  ch = { s: Chess.fromFEN(Chess.START), level, you: color || 'w', tutor: !!tutor, sel: -1, moves: [], last: null, over: '', say: pick(SAY.start), mood: 'happy', reps: {}, thinking: false, caps: { w: [], b: [] }, hint: null, pending: null };
  if (ch.tutor) ch.say = 'Tutor mode on 🎓 I’ll explain my moves, warn you about danger, and you can ask for a hint any time. Tap one of your pieces to see where it can go.';
  store.set('chess-level', level); store.set('chess-tutor', !!tutor);
  saveChess();
}
function saveChess(){ if (!ch || ch.lesson) return; store.set('chess-game', { b: ch.s.b, turn: ch.s.turn, cas: ch.s.cas, ep: ch.s.ep, half: ch.s.half, level: ch.level, you: ch.you, tutor: ch.tutor, over: ch.over, caps: ch.caps, last: ch.last }); }
function loadChess(){
  const g = store.get('chess-game', null); if (!g || g.over) return false;
  ch = { s: { b: g.b, turn: g.turn, cas: g.cas, ep: g.ep, half: g.half || 0, hist: [] }, level: g.level, you: g.you, tutor: !!g.tutor, sel: -1, moves: [], last: g.last, over: '', say: 'Welcome back. I kept your seat warm. 🐝', mood: 'happy', reps: {}, thinking: false, caps: g.caps || { w: [], b: [] }, hint: null, pending: null };
  return true;
}
function chessView(root){
  if (!ch) { if (!loadChess()) return chessSetup(root); }
  if (ch.lesson) return lessonView(root);
  const s = ch.s, myTurn = s.turn === ch.you && !ch.over && !ch.thinking;
  const threats = ch.tutor && myTurn && !ch.pending ? threatsTo(s, ch.you).map(m => m.to) : [];
  const capRow = side => ch.caps[side].slice().sort((a, b) => Chess.VAL[b] - Chess.VAL[a]).map(p => `<span class="ch-mini">${pieceSvg(side === 'w' ? p : p.toUpperCase())}</span>`).join('');
  const bisiSide = ch.you === 'w' ? 'b' : 'w';
  const stats = store.get('chess-stats', {}), lv = LEVELS[ch.level - 1][0], rec = stats[lv] || { w: 0, l: 0, d: 0 };
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>♟️ Bee Chess</b><span class="pill">${ch.tutor ? '🎓 ' : ''}vs ${lv} Bisi</span></div>
    <div class="ch-bisi"><div class="ch-face">${bee(ch.mood, 64)}</div><div class="ch-say">${ch.say}${ch.pending ? `<div class="row" style="margin-top:8px"><button class="btn small primary" data-ch="takeback">Take it back</button><button class="btn small" data-ch="keep">Keep my move</button></div>` : ''}</div></div>
    <div class="ch-caps">${ch.caps[bisiSide].length ? '<small>Bisi took</small> ' + capRow(bisiSide) : ''}</div>
    ${boardHTML(s, { flip: ch.you === 'b', sel: ch.sel, moves: ch.sel >= 0 ? ch.moves.filter(m => m.from === ch.sel) : [], last: ch.last, threats, hint: ch.hint })}
    <div class="ch-caps">${ch.caps[ch.you].length ? '<small>You took</small> ' + capRow(ch.you) : ''}</div>
    <div class="row" style="justify-content:center;margin-top:10px">
      ${ch.tutor ? `<button class="btn small" data-ch="hint" ${myTurn && !ch.pending ? '' : 'disabled'}>💡 Hint</button>` : ''}
      <button class="btn small" data-ch="undo" ${ch.thinking || !s.hist.length ? 'disabled' : ''}>↶ Undo</button>
      <button class="btn small" data-ch="tutor">${ch.tutor ? 'Tutor: on' : '🎓 Tutor'}</button>
      <button class="btn small" data-ch="new">New game</button>
    </div>
    ${ch.tutor ? `<details class="ch-legend"><summary>Which bee is which?</summary>${Object.values(NAMES).map(([b, c], i) => `<div><span class="ch-mini">${pieceSvg('kqrbnp'[i].toUpperCase())}</span><b>${b}</b> = ${c}</div>`).join('')}</details>` : ''}
    <p class="note" style="text-align:center">Your record vs ${lv} Bisi: ${rec.w} won · ${rec.l} lost · ${rec.d} drawn</p>`;
}
function chessSetup(root){
  const lvl = store.get('chess-level', 2), stats = store.get('chess-stats', {}), tutor = store.get('chess-tutor', false), done = store.get('chess-lessons', []);
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>♟️ Bee Chess</b></div>
    <div class="card" style="text-align:center"><div style="width:110px;margin:0 auto">${bee('sassy', 110)}</div>
      <h3 style="font-family:var(--f-d);font-size:1.6rem;margin:6px 0">Play chess with Bisi</h3>
      <div class="ch-cast">${'kqrbnp'.split('').map(k => `<div><span class="ch-mini big">${pieceSvg(k.toUpperCase())}</span><small>${NAMES[k][0]}</small></div>`).join('')}</div>
      <button class="btn ${done.length < LESSONS.length ? 'primary' : ''}" data-ch="lessons" style="width:100%;margin:8px 0">📚 Learn to play: ${LESSONS.length} short lessons${done.length ? ` (${done.length}/${LESSONS.length} done)` : ''}</button>
      <div class="ch-lv">${LEVELS.map(([n, d], i) => { const r = stats[n]; return `<button class="btn ${i + 1 === lvl ? 'primary' : ''}" data-chlv="${i + 1}"><b>${n}</b><small>${d}${r ? ` · ${r.w}–${r.l}` : ''}</small></button>`; }).join('')}</div>
      <label class="ch-tut"><input type="checkbox" id="ch-tutor" ${tutor ? 'checked' : ''}> <span><b>🎓 Tutor mode</b>: Bisi explains her moves, warns you before blunders, and gives hints</span></label>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn" data-chgo="w">Play Honey (move first)</button><button class="btn" data-chgo="b">Play Midnight</button></div>
    </div>`;
}
function endGame(end){
  ch.over = end;
  const stats = store.get('chess-stats', {}), lv = LEVELS[ch.level - 1][0]; stats[lv] = stats[lv] || { w: 0, l: 0, d: 0 };
  stats[lv][end === 'win' ? 'w' : end === 'loss' ? 'l' : 'd']++; store.set('chess-stats', stats);
  ch.say = (end === 'win' ? pick(SAY.lose) : end === 'loss' ? pick(SAY.win) : pick(SAY.draw)) + `<div class="row" style="margin-top:8px"><button class="btn small primary" data-ch="again">Rematch</button><button class="btn small" data-ch="new">Change level</button></div>`;
  ch.mood = end === 'win' ? 'crying' : end === 'loss' ? 'party' : 'happy';
  if (end === 'win') store.set('pollen', store.get('pollen', 0) + 50 * ch.level);
}
function chessAfterMove(root, m, byYou){
  const s = ch.s;
  ch.last = { from: m.from, to: m.to }; ch.hint = null;
  if (m.cap) ch.caps[Chess.side(m.piece)].push(m.cap.toLowerCase());
  const k = Chess.key(s); ch.reps[k] = (ch.reps[k] || 0) + 1;
  const moves = Chess.legal(s), check = Chess.inCheck(s, s.turn);
  let end = '';
  if (!moves.length) end = check ? (byYou ? 'win' : 'loss') : 'draw';
  else if (s.half >= 100 || ch.reps[k] >= 3 || Chess.insufficient(s)) end = 'draw';
  if (end) endGame(end);
  else if (byYou) { if (check) { ch.say = pick(SAY.checked); ch.mood = 'worried'; } else if (m.cap) { ch.say = pick(SAY.yourCap); ch.mood = 'worried'; } }
  else {
    let say = check ? pick(SAY.check) : m.cap ? pick(SAY.myCap) : pick(['Your move.', 'Bzz. Go on.', 'Take your time. I have all day. (I don’t.)', '🐝']);
    if (ch.tutor) {
      say = describeMove(m, 'My') + ' ';
      const now = Chess.movesFor(s, Chess.side(m.piece)).filter(x => x.from === m.to && x.cap && x.cap.toLowerCase() !== 'k');
      if (check) say += 'That’s <b>check</b>: your Drone King is attacked, so you must protect him this move. ';
      if (now.length) say += 'Now it’s eyeing your ' + [...new Set(now.map(x => pname(x.cap) + ' on ' + sqName(x.to)))].join(' and ') + '. ';
      const thr = threatsTo(s, ch.you);
      if (thr.length && !now.length) say += 'Careful: your ' + pname(thr[0].cap) + ' on ' + sqName(thr[0].to) + ' is in danger (red ring). ';
      if (!check && !now.length && !thr.length) say += 'Your move. Tap 💡 if you want a hint.';
    }
    ch.say = say; ch.mood = check ? 'sassy' : m.cap ? 'party' : 'happy';
  }
  saveChess();
  chessView(root);
  if (!end && byYou) bisiMoves(root);
}
function bisiMoves(root){
  ch.thinking = true; if (!ch.tutor) ch.say = pick(SAY.think); else ch.say += '<br><small>Bisi is thinking…</small>'; chessView(root);
  setTimeout(() => {
    if (!ch || ch.over || ch.lesson) return;
    const m = Chess.best(ch.s, ch.level);
    ch.thinking = false;
    if (!m) return;
    Chess.make(ch.s, m);
    chessAfterMove(root, m, false);
  }, 350);
}
/* tutor: is your move a blunder? (loses ≥ 2 pawns' worth compared with your best move) */
function blunderCheck(m){
  const s = ch.s, best = Chess.best(s, 3);
  if (!best) return null;
  const a = Chess.scoreMove(s, m, 2), b = Chess.scoreMove(s, best, 2);
  if (b - a < 200) return null;
  Chess.make(s, m);
  const reply = Chess.best(s, 3);
  Chess.unmake(s);
  let why = 'that move gives me a big advantage';
  if (reply && reply.cap) why = `then my ${pname(reply.piece)} can take your ${pname(reply.cap)} on ${sqName(reply.to)}`;
  else if (reply) { Chess.make(s, m); Chess.make(s, reply); if (Chess.inCheck(s, s.turn) && !Chess.legal(s).length) why = 'then I have <b>checkmate</b>'; Chess.unmake(s); Chess.unmake(s); }
  return { why, best };
}
function chessClick(root, e){
  if (ch && ch.lesson) return lessonClick(root, e);
  const ls = e.target.closest('[data-lesson]'); if (ls){ lessonStart(root, +ls.dataset.lesson); return true; }
  const st = e.target.closest('[data-ch="setup"]'); if (st){ ch = null; chessSetup(root); return true; }
  const lv = e.target.closest('[data-chlv]'); if (lv){ store.set('chess-level', +lv.dataset.chlv); store.set('chess-tutor', !!(root.querySelector('#ch-tutor') || {}).checked); chessSetup(root); return true; }
  const go = e.target.closest('[data-chgo]'); if (go){ chessNew(store.get('chess-level', 2), go.dataset.chgo, (root.querySelector('#ch-tutor') || {}).checked); chessView(root); if (ch.you === 'b') bisiMoves(root); return true; }
  const a = e.target.closest('[data-ch]');
  if (a){
    const v = a.dataset.ch;
    if (v === 'lessons'){ lessonsList(root); return true; }
    if (v === 'new'){ ch = null; store.set('chess-game', null); chessSetup(root); }
    if (v === 'again'){ chessNew(ch.level, ch.you, ch.tutor); chessView(root); if (ch.you === 'b') bisiMoves(root); }
    if (v === 'tutor' && ch){ ch.tutor = !ch.tutor; store.set('chess-tutor', ch.tutor); ch.say = ch.tutor ? 'Tutor mode on 🎓 Red rings = your pieces in danger. 💡 = a hint. I’ll explain my moves.' : 'Tutor off. You’re on your own now. 😈'; saveChess(); chessView(root); }
    if (v === 'hint' && ch && !ch.thinking){
      const m = Chess.best(ch.s, 3);
      if (m){ ch.hint = { from: m.from, to: m.to }; ch.say = `💡 Try your <b>${pname(m.piece)}</b> from ${sqName(m.from)} to ${sqName(m.to)}${m.cap ? ', taking my ' + pname(m.cap) : ''}. (Glowing squares.)`; chessView(root); }
    }
    if (v === 'takeback' && ch && ch.pending){ Chess.unmake(ch.s); ch.pending = null; ch.say = 'Good call. Have another look. 👀'; ch.mood = 'happy'; chessView(root); }
    if (v === 'keep' && ch && ch.pending){ const m = ch.pending; ch.pending = null; chessAfterMove(root, m, true); }
    if (v === 'undo' && ch && !ch.thinking){
      if (ch.pending){ Chess.unmake(ch.s); ch.pending = null; }
      const back = ch.s.turn === ch.you ? 2 : 1;
      for (let k = 0; k < back && ch.s.hist.length; k++){ const h = ch.s.hist[ch.s.hist.length - 1]; if (h.captured) { const arr = ch.caps[Chess.side(h.m.piece)]; const at = arr.lastIndexOf(h.captured.toLowerCase()); if (at >= 0) arr.splice(at, 1); } Chess.unmake(ch.s); }
      ch.over = ''; ch.last = null; ch.sel = -1; ch.hint = null; ch.say = 'Fine, take it back. I saw nothing. 👀'; ch.mood = 'sassy'; saveChess(); chessView(root);
    }
    return true;
  }
  const sq = e.target.closest('[data-sq]');
  if (sq && ch && !ch.over && !ch.thinking && !ch.pending && ch.s.turn === ch.you){
    const i = +sq.dataset.sq, p = ch.s.b[i];
    if (ch.sel >= 0){
      const m = ch.moves.find(x => x.from === ch.sel && x.to === i && (!x.promo || x.promo === 'q'));
      if (m){
        ch.sel = -1;
        const bl = ch.tutor ? blunderCheck(m) : null;
        Chess.make(ch.s, m);
        if (bl){ ch.pending = m; ch.mood = 'worried'; ch.say = `Hmm, wait! 🤔 If you do that, ${bl.why}. A better idea: your ${pname(bl.best.piece)} from ${sqName(bl.best.from)} to ${sqName(bl.best.to)}.`; ch.last = { from: m.from, to: m.to }; chessView(root); return true; }
        chessAfterMove(root, m, true); return true;
      }
    }
    if (p && Chess.side(p) === ch.you){
      ch.sel = i; ch.moves = Chess.legal(ch.s);
      if (ch.tutor){ const n = ch.moves.filter(m => m.from === i).length; ch.say = `Your <b>${pname(p)}</b> (${NAMES[p.toLowerCase()][1]}): ${TIPS[p.toLowerCase()]} ${n ? `It has ${n} move${n === 1 ? '' : 's'} (dots).` : 'It can’t move right now.'}`; }
    } else ch.sel = -1;
    chessView(root);
    return true;
  }
  return false;
}
const TIPS = { k: 'moves one square any way. Keep him safe: if he’s trapped, you lose.', q: 'goes any distance in straight lines or diagonals. Your strongest piece!', r: 'goes any distance up, down or sideways.', b: 'goes any distance diagonally, so it stays on one colour.', n: 'hops in an L shape (2 then 1) and can jump over pieces.', p: 'walks forward one square (two on its first move) and captures diagonally.' };

/* ---------------- lessons ---------------- */
const LESSONS = [
  { t: 'The Worker (pawn)', p: 'p', fen: '8/8/3p4/8/8/8/4P3/8 w - - 0 1', honey: ['e4', 'e5'], goal: 'collect',
    txt: 'Workers walk <b>forward</b>. On their first move they may step <b>two</b> squares. They <b>capture diagonally</b>, one square forward. Collect both honey drops, then capture the Midnight Worker.', extra: 'd6' },
  { t: 'The Hive (rook)', p: 'r', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', honey: ['a6', 'f6', 'f2'], goal: 'collect',
    txt: 'A Hive slides <b>any distance</b> up, down, left or right, but can’t jump over pieces. Collect all the honey.' },
  { t: 'The Flower (bishop)', p: 'b', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', honey: ['f4', 'd6', 'g3'], goal: 'collect',
    txt: 'A Flower slides <b>diagonally</b>, any distance. It always stays on the same colour of square. Collect the honey.' },
  { t: 'The Queen Bee (queen)', p: 'q', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', honey: ['d6', 'h2', 'a2'], goal: 'collect',
    txt: 'The Queen Bee is the strongest piece: she moves like a Hive <b>and</b> a Flower, any distance in a straight line or diagonal. Collect the honey.' },
  { t: 'The Drone King (king)', p: 'k', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', honey: ['e2', 'f3', 'g3'], goal: 'collect',
    txt: 'The Drone King moves <b>one square</b> in any direction. He’s slow but he’s the whole point: if he gets trapped, you lose. Collect the honey.' },
  { t: 'The Butterfly (knight)', p: 'n', fen: '8/8/8/8/8/8/PPPP4/1N6 w - - 0 1', honey: ['c3', 'd5', 'f6'], goal: 'collect',
    txt: 'Butterflies hop in an <b>L shape</b>: two squares one way, then one square sideways. They’re the only piece that can <b>jump over</b> others. Collect the honey.', blockers: true },
  { t: 'Capturing', p: 'q', fen: '4b3/8/8/3p3n/8/8/8/3Q4 w - - 0 1', goal: 'captureAll',
    txt: 'Move onto an enemy piece to <b>capture</b> it. It leaves the board. Use your Queen Bee to capture all three Midnight pieces.' },
  { t: 'Check', p: 'k', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', goal: 'check',
    txt: 'When a piece attacks the enemy Drone King, that’s <b>check</b>. The other side must get out of it straight away. Put the Midnight Drone King in check with your Hive.' },
  { t: 'Checkmate', p: 'k', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate',
    txt: '<b>Checkmate</b> = check with no escape. That’s how you win! The Midnight Drone King is boxed in by his own Workers. Find the move that checkmates him.' },
  { t: 'Checkmate with the Queen Bee', p: 'q', fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', goal: 'mate',
    txt: 'Your Drone King guards the squares next to him. Team up with your Queen Bee to give checkmate in one move.' },
  { t: 'Castling', p: 'r', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', goal: 'castle',
    txt: '<b>Castling</b> tucks your Drone King safely behind a wall: he moves <b>two squares</b> towards a Hive, and the Hive hops over to his other side. Allowed only if neither has moved, nothing is between them, and he isn’t in check. Tap your Drone King, then the square two to the right (g1).' },
  { t: 'Promotion', p: 'p', fen: '7k/4P3/8/8/8/8/8/K7 w - - 0 1', goal: 'promo',
    txt: 'A Worker that reaches the far side gets <b>promoted</b>, usually to a Queen Bee! Walk your Worker to the last row.' },
];
function lessonsList(root){
  const done = new Set(store.get('chess-lessons', []));
  ch = null;
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-ch="setup">← Bee Chess</button><b>📚 Learn to play</b><span class="pill">${done.size}/${LESSONS.length}</span></div>
    <p class="g-intro">Twelve tiny lessons. Each one teaches a piece or rule; you try it right away on the board.</p>
    <div class="ch-lessons">${LESSONS.map((l, i) => `<button class="card ch-lesson ${done.has(i) ? 'done' : ''}" data-lesson="${i}"><span class="ch-mini big">${pieceSvg(l.p.toUpperCase())}</span><span><small>Lesson ${i + 1}</small><b>${l.t}</b></span><span class="ch-tick">${done.has(i) ? '✓' : '›'}</span></button>`).join('')}</div>`;
}
function lessonStart(root, i){
  const L = LESSONS[i];
  ch = { lesson: true, li: i, s: Chess.fromFEN(L.fen), sel: -1, moves: [], honey: (L.honey || []).map(sqIdx), extra: L.extra ? sqIdx(L.extra) : -1, last: null, done: false, msg: '', mood: 'happy' };
  lessonView(root);
}
function lessonGoalText(){
  const L = LESSONS[ch.li];
  if (L.goal === 'collect') return ch.honey.length ? `🍯 Honey left: ${ch.honey.length}` : (ch.extra >= 0 ? '⚔️ Now capture the Midnight Worker' : '');
  if (L.goal === 'captureAll') return `⚔️ Midnight pieces left: ${ch.s.b.filter(p => p && Chess.side(p) === 'b').length}`;
  return '';
}
function lessonView(root){
  const L = LESSONS[ch.li], last = ch.li === LESSONS.length - 1;
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-ch="lessons">← Lessons</button><b>Lesson ${ch.li + 1}</b><span class="pill">${L.t}</span></div>
    <div class="ch-bisi"><div class="ch-face">${bee(ch.done ? 'party' : ch.mood, 64)}</div><div class="ch-say">${ch.done ? `<b>${pick(['You got it! 🎉', 'Perfect! 🐝', 'Look at you go!', 'Nailed it!'])}</b> ${ch.msg}` : L.txt}${ch.msg && !ch.done ? `<div class="ch-warn">${ch.msg}</div>` : ''}</div></div>
    <div class="ch-goal">${ch.done ? '' : lessonGoalText()}</div>
    ${boardHTML(ch.s, { sel: ch.sel, moves: ch.sel >= 0 ? ch.moves.filter(m => m.from === ch.sel) : [], last: ch.last, honey: ch.honey })}
    <div class="row" style="justify-content:center;margin-top:10px">
      <button class="btn small" data-lesson="${ch.li}">↺ Restart</button>
      ${ch.done ? (last ? `<button class="btn small primary" data-ch="setup">Play Bisi now →</button>` : `<button class="btn small primary" data-lesson="${ch.li + 1}">Next lesson →</button>`) : ''}
    </div>`;
}
function lessonClick(root, e){
  const l = e.target.closest('[data-lesson]'); if (l){ lessonStart(root, +l.dataset.lesson); return true; }
  const a = e.target.closest('[data-ch]');
  if (a){ if (a.dataset.ch === 'lessons') lessonsList(root); else if (a.dataset.ch === 'setup'){ ch = null; chessSetup(root); } return true; }
  const sq = e.target.closest('[data-sq]'); if (!sq || ch.done) return true;
  const i = +sq.dataset.sq, p = ch.s.b[i], L = LESSONS[ch.li];
  if (ch.sel >= 0){
    const m = ch.moves.find(x => x.from === ch.sel && x.to === i && (!x.promo || x.promo === 'q'));
    if (m){
      ch.sel = -1; ch.msg = '';
      Chess.make(ch.s, m); ch.last = { from: m.from, to: m.to };
      let ok = false, undo = '';
      if (L.goal === 'collect'){ ch.honey = ch.honey.filter(h => h !== m.to); ok = !ch.honey.length && (ch.extra < 0 || m.to === ch.extra); }
      else if (L.goal === 'captureAll') ok = !ch.s.b.some(x => x && Chess.side(x) === 'b');
      else if (L.goal === 'check'){ ok = Chess.inCheck(ch.s, 'b'); if (!ok) undo = 'Not check yet. Find a square where your Hive attacks the Midnight Drone King along a straight line.'; }
      else if (L.goal === 'mate'){ ok = Chess.inCheck(ch.s, 'b') && !Chess.legal(ch.s).length; if (!ok) undo = 'Not quite: after that, the Midnight Drone King could still escape or capture. Try again!'; }
      else if (L.goal === 'castle'){ ok = !!m.castle; if (!ok) undo = 'That’s a normal move. Tap your Drone King (e1), then g1 or c1 to castle.'; }
      else if (L.goal === 'promo') ok = !!m.promo;
      if (undo){ Chess.unmake(ch.s); ch.last = null; ch.msg = undo; ch.mood = 'worried'; }
      else if (!ok && ch.s.turn === 'b'){ ch.s.turn = 'w'; ch.s.ep = -1; }   // lessons only move your pieces
      if (ok){
        ch.done = true;
        ch.msg = { collect: 'That’s exactly how it moves.', captureAll: 'Capturing is just moving onto an enemy piece.', check: 'The Midnight Drone King is in check. In a real game, Midnight must escape now.', mate: 'Checkmate! In a real game, that’s the win.', castle: 'Your Drone King is tucked safely in the corner with a Hive beside him.', promo: 'Your Worker became a Queen Bee! 👑' }[L.goal];
        const d = new Set(store.get('chess-lessons', [])); d.add(ch.li); store.set('chess-lessons', [...d]);
        store.set('pollen', store.get('pollen', 0) + 10);
      }
      lessonView(root); return true;
    }
  }
  if (p && Chess.side(p) === 'w'){ ch.sel = i; ch.moves = Chess.legal(ch.s); } else ch.sel = -1;
  lessonView(root);
  return true;
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
  const cols = 3, tall = pp.deck === 'words';
  pp.root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🃏 ${DECKS[pp.deck].name}</b><span class="pill">${pp.moves} moves</span></div>
    <div class="pp-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${pp.cards.map((c, i) => {
      const up = pp.open.includes(i) || pp.done.has(c.id);
      const len = String(c.t).length, size = c.big ? (len > 9 ? 1.05 : len > 5 ? 1.35 : 1.8) : (len > 26 ? .74 : len > 16 ? .82 : .92);
      return `<button class="pp-card ${up ? 'up' : ''} ${pp.done.has(c.id) ? 'ok' : ''} ${tall ? 'tall' : ''}" data-ppc="${i}" aria-label="${up ? c.t : 'Hidden card'}">${up ? `<span class="${c.big ? 'pp-big' : 'pp-sm'}" style="font-size:${size}rem">${c.t}</span>` : '<span class="pp-back">🐝</span>'}</button>`; }).join('')}</div>`;
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

/* ---------------- Honey Drop (drop & merge) ---------------- */
const HD_LV = [
  { n:'Pollen',    e:'✨', c:'#FFF6C2' }, { n:'Honey',     e:'🍯', c:'#FFD36E' }, { n:'Daisy',     e:'🌼', c:'#FFFFFF' },
  { n:'Clover',    e:'🍀', c:'#C9EBB2' }, { n:'Ladybug',   e:'🐞', c:'#FFB3A7' }, { n:'Sunflower', e:'🌻', c:'#FFC629' },
  { n:'Butterfly', e:'🦋', c:'#BFD9FF' }, { n:'Bee',       e:'🐝', c:'#FFE08A' }, { n:'Hibiscus',  e:'🌺', c:'#FFC1D6' },
  { n:'Queen',     e:'👑', c:'#F5B700' },
];
const HD_PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
let hd = null;
function hdStart(root){
  const best = store.get('drop-best', 0);
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>🍯 Honey Drop</b><span class="pill">Best ${best}</span></div>
    <div class="hd-bar"><span>Score <b id="hd-score">0</b></span><span class="hd-next">Next <span id="hd-next"></span></span></div>
    <div class="fl-wrap hd-wrap"><canvas id="hd-cv" aria-label="Honey Drop. Tap where to drop."></canvas>
      <div class="fl-over" id="hd-over"><div style="width:90px;margin:0 auto">${bee('happy', 90)}</div><h3>Honey Drop</h3>
        <p>Tap to drop. Two of the same touch → they merge into the next one up.</p>
        <p class="hd-chain">${HD_LV.map(l => l.e).join(' → ')}</p><button class="btn primary" data-hd="go">Play</button></div></div>
    <p class="note" style="text-align:center">Don’t let the jar overflow past the dashed line.</p>`;
  const cv = root.querySelector('#hd-cv'), wrap = cv.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = wrap.clientWidth, H = Math.min(600, Math.max(420, Math.round(innerHeight * 0.62)));
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const unit = Math.min(W, 420) / 26;
  hd = { root, cv, g, W, H, unit, balls: [], state: 'ready', raf: 0, aim: W / 2, cur: 0, next: 0, score: 0, cool: 0, danger: 0, top: 96 };
  const aimAt = e => { const r = cv.getBoundingClientRect(); hd.aim = Math.max(14, Math.min(W - 14, e.clientX - r.left)); };
  cv.addEventListener('pointerdown', e => { if (hd && hd.state === 'play'){ aimAt(e); hd.holding = true; } });
  cv.addEventListener('pointermove', e => { if (hd && hd.state === 'play') aimAt(e); });
  cv.addEventListener('pointerup', e => { if (hd && hd.state === 'play'){ aimAt(e); hdDrop(); hd.holding = false; } });
  hdDraw();
}
const hdR = lv => hd.unit * (0.95 + lv * 0.42);
const hdRand = () => [0, 0, 1, 1, 2, 3][Math.floor(Math.random() * 6)];
function hdGo(){
  Object.assign(hd, { state: 'play', balls: [], score: 0, cur: hdRand(), next: hdRand(), cool: 0, danger: 0 });
  hd.root.querySelector('#hd-over').hidden = true;
  hdUi();
  const step = () => { if (!hd || hd.state !== 'play') return; for (let k = 0; k < 3; k++) hdTick(); hdDraw(); hd.raf = requestAnimationFrame(step); };
  hd.raf = requestAnimationFrame(step);
}
function hdUi(){ const s = hd.root.querySelector('#hd-score'), n = hd.root.querySelector('#hd-next'); if (s) s.textContent = hd.score; if (n) n.textContent = HD_LV[hd.next].e; }
function hdDrop(){
  if (hd.cool > 0) return;
  const r = hdR(hd.cur), x = Math.max(r + 4, Math.min(hd.W - r - 4, hd.aim));
  hd.balls.push({ x, y: hd.top - 40, vx: 0, vy: 0, lv: hd.cur, r, age: 0 });
  hd.cur = hd.next; hd.next = hdRand(); hd.cool = 45; hdUi();
}
function hdTick(){
  const B = hd.balls, W = hd.W, floor = hd.H - 8, grav = 0.12;
  if (hd.cool > 0) hd.cool--;
  for (const b of B){ b.age++; b.vy += grav; b.x += b.vx; b.y += b.vy; b.vx *= 0.995;
    if (b.x - b.r < 6){ b.x = 6 + b.r; b.vx = Math.abs(b.vx) * 0.3; }
    if (b.x + b.r > W - 6){ b.x = W - 6 - b.r; b.vx = -Math.abs(b.vx) * 0.3; }
    if (b.y + b.r > floor){ b.y = floor - b.r; b.vy *= -0.15; b.vx *= 0.92; } }
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++){
    const a = B[i], b = B[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
    if (d >= min) continue;
    if (a.lv === b.lv){
      a.dead = b.dead = true;
      hd.score += HD_PTS[a.lv] * 2;
      if (a.lv < HD_LV.length - 1){ const lv = a.lv + 1; B.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: -1, lv, r: hdR(lv), age: 60, pop: 12 }); }
      else hd.score += 200;
      hdUi(); continue;
    }
    const nx = dx / d, ny = dy / d, over = min - d, ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
    a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot); b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel < 0){ const imp = -(1.1) * rel / (1 / ma + 1 / mb); a.vx -= imp * nx / ma; a.vy -= imp * ny / ma; b.vx += imp * nx / mb; b.vy += imp * ny / mb; }
  }
  hd.balls = B.filter(b => !b.dead);
  const over = hd.balls.some(b => b.age > 120 && b.y - b.r < hd.top && Math.abs(b.vy) < 0.6);
  hd.danger = over ? hd.danger + 1 : Math.max(0, hd.danger - 2);
  if (hd.danger > 240) hdOver();
}
function hdBall(g, x, y, lv, r, pop){
  const L = HD_LV[lv], rr = r * (pop ? 1 + pop / 40 : 1);
  g.fillStyle = L.c; g.strokeStyle = '#1E1606'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - rr * .35, y - rr * .4, rr * .28, rr * .18, -.5, 0, Math.PI * 2); g.fill();
  g.font = `${Math.round(rr * 1.05)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(L.e, x, y + rr * .06);
}
function hdDraw(){
  const g = hd.g, W = hd.W, H = hd.H;
  g.fillStyle = '#FFF8E1'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(201,138,11,.16)'; g.lineWidth = 1;
  for (let y = 0; y < H; y += 28) for (let x = (y / 28) % 2 ? 0 : 16; x < W; x += 32){ g.beginPath(); for (let k = 0; k < 6; k++){ const a = Math.PI / 3 * k + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](x + 14 * Math.cos(a), y + 14 * Math.sin(a)); } g.closePath(); g.stroke(); }
  g.setLineDash([8, 7]); g.strokeStyle = hd.danger > 60 ? '#D9533B' : 'rgba(30,22,6,.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(6, hd.top); g.lineTo(W - 6, hd.top); g.stroke(); g.setLineDash([]);
  if (hd.state === 'play'){
    const r = hdR(hd.cur), x = Math.max(r + 4, Math.min(W - r - 4, hd.aim));
    g.strokeStyle = 'rgba(30,22,6,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, hd.top - 40 + r); g.lineTo(x, H); g.stroke();
    if (hd.cool <= 0) hdBall(g, x, hd.top - 40, hd.cur, r);
  }
  for (const b of hd.balls){ if (b.pop) b.pop--; hdBall(g, b.x, b.y, b.lv, b.r, b.pop); }
  g.strokeStyle = '#1E1606'; g.lineWidth = 4; g.beginPath(); g.moveTo(4, hd.top - 20); g.lineTo(4, H - 4); g.lineTo(W - 4, H - 4); g.lineTo(W - 4, hd.top - 20); g.stroke();
}
function hdOver(){
  hd.state = 'over'; cancelAnimationFrame(hd.raf);
  const prev = store.get('drop-best', 0), top = Math.max(...hd.balls.map(b => b.lv), 0);
  if (hd.score > prev) store.set('drop-best', hd.score);
  store.set('pollen', store.get('pollen', 0) + Math.round(hd.score / 5));
  const o = hd.root.querySelector('#hd-over'); o.hidden = false;
  o.innerHTML = `<div style="width:80px;margin:0 auto">${bee(hd.score > prev && prev ? 'party' : 'worried', 80)}</div>
    <h3>${hd.score > prev && prev ? 'New best! 🎉' : 'The jar overflowed!'}</h3>
    <p>Score <b>${hd.score}</b> · you reached <b>${HD_LV[top].e} ${HD_LV[top].n}</b></p>
    <p class="note">${top >= 9 ? 'A Queen?! Bisi bows. 👑' : 'Next goal: ' + HD_LV[Math.min(9, top + 1)].e + ' ' + HD_LV[Math.min(9, top + 1)].n}</p>
    <button class="btn primary" data-hd="go">Play again</button>`;
}

/* ---------------- registry ---------------- */
let active = null, root = null;
const FUN = {
  chess:  { name: 'Bee Chess', icon: '♟️', blurb: 'Bee-themed chess against Bisi, from Larva to Queen. New to chess? There are lessons and a tutor.', start: r => chessView(r) },
  flight: { name: 'Bisi Flight', icon: '🐝', blurb: 'Tap to fly between the flowers and grab nectar. Harder the longer you last.', start: r => flightStart(r) },
  drop:   { name: 'Honey Drop', icon: '🍯', blurb: 'Drop and merge: two of the same become the next one up, from pollen all the way to a crown.', start: r => hdStart(r) },
  pairs:  { name: 'Pollen Pairs', icon: '🃏', blurb: 'Flip cards to match symbols, units and words with their meanings.', start: r => pairsSetup(r) },
};
function onClick(e){
  if (!active) return;
  if (active === 'chess' && chessClick(root, e)) return;
  if (active === 'flight'){ const b = e.target.closest('[data-fl]'); if (b) flightGo(); return; }
  if (active === 'drop'){ const b = e.target.closest('[data-hd]'); if (b) hdGo(); return; }
  if (active === 'pairs'){
    const d = e.target.closest('[data-pp]'); if (d) return pairsGo(root, d.dataset.pp);
    const n = e.target.closest('[data-ppn]'); if (n){ store.set('pairs-n', +n.dataset.ppn); return pairsSetup(root); }
    if (e.target.closest('[data-ppback]')) return pairsSetup(root);
    const c = e.target.closest('[data-ppc]'); if (c) return pairsFlip(+c.dataset.ppc);
  }
}
window.FTFun = {
  list: FUN,
  meta(k){ if (k === 'chess'){ const s = store.get('chess-stats', {}); const w = Object.values(s).reduce((a, x) => a + x.w, 0); const l = store.get('chess-lessons', []).length; return w ? `${w} win${w === 1 ? '' : 's'}` : l ? `${l}/12 lessons` : 'New: lessons'; }
           if (k === 'flight'){ const b = store.get('flight-best', 0); return b ? 'Best ' + b : ''; }
           if (k === 'drop'){ const b = store.get('drop-best', 0); return b ? 'Best ' + b : 'New!'; }
           if (k === 'pairs'){ const b = Object.values(store.get('pairs-best', {})); return b.length ? 'Best ' + Math.min(...b) + ' moves' : ''; } return ''; },
  start(k, el){ stop(); active = k; root = el; if (!el.dataset.funWired){ el.addEventListener('click', onClick); el.dataset.funWired = 1; } FUN[k].start(el); },
  stop,
  _chess: Chess,
};
function stop(){ if (hd){ cancelAnimationFrame(hd.raf); hd.state = 'over'; hd = null; } if (fl){ cancelAnimationFrame(fl.raf); fl.state = 'over'; fl = null; } if (ch) saveChess(); ch = null; pp = null; active = null; }
if (typeof module !== 'undefined') module.exports = { Chess };
})();
