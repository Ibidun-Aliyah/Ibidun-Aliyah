/* Puzzles (v6.8): Circuit Bloom · Robo Path · Hive Sudoku · Word Ladder · Nectar Sort · Daily Buzzle.
 * All offline and original. Every generator takes a seeded random function, so the Daily Buzzle is the same
 * puzzle for everyone on the same day. Levels and bests are kept in localStorage (ftg-pz-…). */
(() => {
const store = {
  get(k, d){ try { const v = localStorage.getItem('ftg-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('ftg-' + k, JSON.stringify(v)); } catch(e){} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function seeded(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (rng, n) => Math.floor(rng() * n);
const shuf = (rng, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = ri(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bee = (m, s) => window.bisiSvg ? bisiSvg(m, s, true) : '🐝';
const fmtT = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

let root = null, ctx = {}, active = null, S = null, daily = null;
const top = (k, extra) => `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>${PZ[k].icon} ${daily ? 'Daily Buzzle' : PZ[k].name}</b>${extra || ''}</div>`;
const lvOf = k => store.get('pz-lv-' + k, 1);

/* ============ Circuit Bloom: rotate wires so power reaches every flower ============ */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // N E S W  (bits 1 2 4 8)
const rot = m => ((m << 1) | (m >> 3)) & 15;
function circuitGen(rng, n){
  const N = n * n, m = new Array(N).fill(0), seen = new Array(N).fill(false), src = Math.floor(n / 2) * n + Math.floor(n / 2);
  const stack = [src]; seen[src] = true;
  while (stack.length){
    const c = stack[stack.length - 1], x = c % n, y = Math.floor(c / n);
    const opts = [0, 1, 2, 3].filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]; });
    if (!opts.length){ stack.pop(); continue; }
    const d = opts[ri(rng, opts.length)], nb = (y + DY[d]) * n + x + DX[d];
    m[c] |= 1 << d; m[nb] |= 1 << ((d + 2) % 4); seen[nb] = true; stack.push(nb);
  }
  const cur = m.map(v => { let r = v; for (let k = ri(rng, 4); k > 0; k--) r = rot(r); return r; });
  return { n, src, sol: m, cur };
}
function circuitPower(s){
  const { n, cur, src } = s, on = new Array(n * n).fill(false), q = [src]; on[src] = true;
  while (q.length){ const c = q.shift(), x = c % n, y = Math.floor(c / n);
    for (let d = 0; d < 4; d++){ if (!(cur[c] & (1 << d))) continue; const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const nb = ny * n + nx; if (!on[nb] && (cur[nb] & (1 << ((d + 2) % 4)))){ on[nb] = true; q.push(nb); } } }
  return on;
}
const deg = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
const CIRC_SIZES = [4, 4, 5, 5, 6, 6, 7, 7];
function circuitStart(seed, lv){
  const rng = seeded(seed), n = CIRC_SIZES[Math.min(lv, 8) - 1];
  S = circuitGen(rng, n); S.moves = 0; S.t0 = Date.now(); S.lv = lv;
  if (circuitPower(S).every(Boolean)) S.cur[0] = rot(S.cur[0]);
  circuitDraw();
}
function circuitDraw(){
  const on = circuitPower(S), flowers = S.sol.map((v, i) => i !== S.src && deg(v) === 1), total = flowers.filter(Boolean).length, lit = flowers.filter((f, i) => f && on[i]).length;
  root.innerHTML = top('circuit', `<span class="pill">L${S.lv}</span>`) + `
    <div class="g-stats"><span>🌸 ${lit}/${total} blooming</span><span>${S.moves} turns</span></div>
    <div class="pz-circ" style="grid-template-columns:repeat(${S.n},1fr)">${S.cur.map((v, i) => {
      const c = on[i] ? '#F5B700' : '#B8A98A', seg = [0, 1, 2, 3].filter(d => v & (1 << d)).map(d => `M20 20L${20 + DX[d] * 20} ${20 + DY[d] * 20}`).join('');
      let mid = '';
      if (i === S.src) mid = `<rect x="11" y="9" width="18" height="22" rx="4" fill="#1E1606"/><rect x="16" y="5" width="8" height="5" rx="1.5" fill="#1E1606"/><path d="M15 20h10M20 15v10" stroke="#FFD23F" stroke-width="3"/>`;
      else if (flowers[i]) mid = on[i] ? [0, 1, 2, 3, 4].map(k => { const a = k * 1.2566; return `<circle cx="${(20 + Math.sin(a) * 7).toFixed(1)}" cy="${(20 - Math.cos(a) * 7).toFixed(1)}" r="5.5" fill="${['#F7B6C8', '#C9A0F0', '#F08068', '#7FAEDD'][i % 4]}" stroke="#1E1606" stroke-width="1.5"/>`; }).join('') + '<circle cx="20" cy="20" r="4.5" fill="#FFD23F" stroke="#1E1606" stroke-width="1.5"/>'
        : '<circle cx="20" cy="20" r="6" fill="#8FB98A" stroke="#1E1606" stroke-width="1.5"/>';
      return `<button class="pz-cell" data-cc="${i}" aria-label="tile ${i + 1}${on[i] ? ', powered' : ''}"><svg viewBox="0 0 40 40"><path d="${seg}" stroke="#1E1606" stroke-width="10" stroke-linecap="round"/><path d="${seg}" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/>${mid}</svg></button>`; }).join('')}</div>
    <p class="g-intro">Tap a tile to turn it. Connect every wire to the battery so all the flowers bloom.</p>`;
  if (on.every(Boolean)) setTimeout(() => win('circuit', { moves: S.moves, ms: Date.now() - S.t0, line: `${S.moves} turns` }), 350);
}

/* ============ Nectar Sort: pour until each jar holds one colour ============ */
const HONEY = ['#F5B700', '#E0393E', '#7FAEDD', '#5FA04E', '#C9A0F0', '#F7B6C8', '#8C5A2B', '#2A9D8F', '#EDEAE6'];
const CAP = 4;
function sortSolvable(jars){
  const seen = new Set(); let nodes = 0;
  const key = js => js.map(j => j.join('')).sort().join('|');
  const done = js => js.every(j => !j.length || (j.length === CAP && j.every(x => x === j[0])));
  function dfs(js){
    if (done(js)) return true;
    if (++nodes > 40000) return false;
    const k = key(js); if (seen.has(k)) return false; seen.add(k);
    for (let a = 0; a < js.length; a++){ const A = js[a]; if (!A.length) continue; const c = A[A.length - 1];
      if (A.length === CAP && A.every(x => x === c)) continue;
      for (let b = 0; b < js.length; b++){ if (a === b) continue; const B = js[b];
        if (B.length >= CAP || (B.length && B[B.length - 1] !== c)) continue;
        if (!B.length && A.every(x => x === c)) continue;
        const nj = js.map(j => j.slice()); let n = 0;
        while (nj[a].length && nj[a][nj[a].length - 1] === c && nj[b].length < CAP){ nj[b].push(nj[a].pop()); n++; }
        if (n && dfs(nj)) return true; } }
    return false;
  }
  return dfs(jars);
}
function sortGen(rng, colors){
  for (let t = 0; t < 40; t++){
    const units = shuf(rng, Array.from({ length: colors * CAP }, (_, i) => i % colors));
    const jars = Array.from({ length: colors + 2 }, (_, j) => j < colors ? units.slice(j * CAP, j * CAP + CAP) : []);
    if (jars.some(j => j.length === CAP && j.every(x => x === j[0]))) continue;
    if (sortSolvable(jars)) return jars;
  }
  return Array.from({ length: colors + 2 }, (_, j) => j < colors ? [j, j, (j + 1) % colors, (j + 1) % colors] : []);
}
function sortStart(seed, lv){
  const colors = Math.min(2 + lv, 9);
  S = { jars: sortGen(seeded(seed), colors), sel: -1, moves: 0, undo: [], t0: Date.now(), lv };
  S.start = S.jars.map(j => j.slice());
  sortDraw();
}
function sortDraw(){
  root.innerHTML = top('sort', `<span class="pill">L${S.lv}</span>`) + `
    <div class="g-stats"><span>${S.moves} pours</span><span><button class="btn small" data-so="undo" ${S.undo.length ? '' : 'disabled'}>↶ Undo</button> <button class="btn small" data-so="reset">Restart</button></span></div>
    <div class="pz-jars">${S.jars.map((j, i) => `<button class="pz-jar ${S.sel === i ? 'sel' : ''}" data-jar="${i}" aria-label="jar ${i + 1}">${j.map(c => `<i style="background:${HONEY[c]}"></i>`).join('')}</button>`).join('')}</div>
    <p class="g-intro">Tap a jar, then tap where to pour. Honey only pours onto the same colour or into an empty jar.</p>`;
}
function sortTap(i){
  if (S.sel < 0){ if (S.jars[i].length) S.sel = i; return sortDraw(); }
  if (S.sel === i){ S.sel = -1; return sortDraw(); }
  const A = S.jars[S.sel], B = S.jars[i], c = A[A.length - 1];
  if (B.length >= CAP || (B.length && B[B.length - 1] !== c)){ ctx.toast && ctx.toast('That honey won\'t mix. 🍯'); S.sel = -1; return sortDraw(); }
  S.undo.push(S.jars.map(j => j.slice()));
  while (A.length && A[A.length - 1] === c && B.length < CAP) B.push(A.pop());
  S.moves++; S.sel = -1; sortDraw();
  if (S.jars.every(j => !j.length || (j.length === CAP && j.every(x => x === j[0])))) setTimeout(() => win('sort', { moves: S.moves, ms: Date.now() - S.t0, line: `${S.moves} pours` }), 300);
}

/* ============ Hive Sudoku (6×6 then 9×9) ============ */
function sdBox(n){ return n === 6 ? [2, 3] : [3, 3]; }
function sdOk(g, n, i, v){
  const r = Math.floor(i / n), c = i % n, [bh, bw] = sdBox(n), br = r - r % bh, bc = c - c % bw;
  for (let k = 0; k < n; k++){ if (g[r * n + k] === v || g[k * n + c] === v) return false; }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (g[(br + y) * n + bc + x] === v) return false;
  return true;
}
function sdFill(g, n, rng){
  const i = g.indexOf(0); if (i < 0) return true;
  for (const v of shuf(rng, Array.from({ length: n }, (_, k) => k + 1))){ if (sdOk(g, n, i, v)){ g[i] = v; if (sdFill(g, n, rng)) return true; g[i] = 0; } }
  return false;
}
function sdCount(g, n, limit){
  let best = -1, bestC = null;
  for (let i = 0; i < g.length; i++){ if (g[i]) continue; const c = []; for (let v = 1; v <= n; v++) if (sdOk(g, n, i, v)) c.push(v);
    if (!c.length) return 0; if (!bestC || c.length < bestC.length){ best = i; bestC = c; if (c.length === 1) break; } }
  if (best < 0) return 1;
  let total = 0;
  for (const v of bestC){ g[best] = v; total += sdCount(g, n, limit - total); g[best] = 0; if (total >= limit) break; }
  return total;
}
const SD_GIVENS = [[6, 20], [6, 15], [9, 40], [9, 34], [9, 30], [9, 27]];
function sudokuGen(rng, lv){
  const [n, givens] = SD_GIVENS[Math.min(lv, 6) - 1];
  const sol = new Array(n * n).fill(0); sdFill(sol, n, rng);
  const g = sol.slice(); let left = n * n;
  for (const i of shuf(rng, Array.from({ length: n * n }, (_, k) => k))){
    if (left <= givens) break;
    const v = g[i]; g[i] = 0;
    if (sdCount(g.slice(), n, 2) !== 1) g[i] = v; else left--;
  }
  return { n, sol, given: g.map(v => v > 0), cur: g.slice() };
}
function sudokuStart(seed, lv){ S = Object.assign(sudokuGen(seeded(seed), lv), { sel: -1, mistakes: 0, hints: 3, t0: Date.now(), lv }); sudokuDraw(); }
function sudokuDraw(){
  const { n, cur, given, sol, sel } = S, [bh, bw] = sdBox(n), sv = sel >= 0 ? cur[sel] : 0;
  root.innerHTML = top('sudoku', `<span class="pill">${n}×${n} · L${S.lv}</span>`) + `
    <div class="g-stats"><span>Mistakes ${S.mistakes}</span><span><button class="btn small" data-sd="hint" ${S.hints ? '' : 'disabled'}>💡 Hint (${S.hints})</button></span></div>
    <div class="pz-sd n${n}" style="grid-template-columns:repeat(${n},1fr)">${cur.map((v, i) => { const r = Math.floor(i / n), c = i % n;
      const cls = [given[i] ? 'gv' : '', i === sel ? 'sel' : '', v && v === sv ? 'same' : '', v && !given[i] && v !== sol[i] ? 'bad' : '',
        (c + 1) % bw === 0 && c < n - 1 ? 'br' : '', (r + 1) % bh === 0 && r < n - 1 ? 'bb' : ''].join(' ');
      return `<button class="pz-hex ${cls}" data-sc="${i}" aria-label="row ${r + 1} column ${c + 1}${v ? ': ' + v : ''}">${v || ''}</button>`; }).join('')}</div>
    <div class="pz-pad">${Array.from({ length: n }, (_, k) => `<button class="btn" data-sn="${k + 1}">${k + 1}</button>`).join('')}<button class="btn ghost" data-sn="0">⌫</button></div>
    <p class="g-intro">Fill every row, column and ${bh}×${bw} box with 1–${n}, each once. Tap a cell, then a number.</p>`;
}
function sudokuPut(v){
  if (S.sel < 0 || S.given[S.sel]) return;
  S.cur[S.sel] = v; if (v && v !== S.sol[S.sel]) S.mistakes++;
  sudokuDraw();
  if (S.cur.every((x, i) => x === S.sol[i])) setTimeout(() => win('sudoku', { moves: S.mistakes, ms: Date.now() - S.t0, line: `${S.mistakes} mistake${S.mistakes === 1 ? '' : 's'}` }), 300);
}

/* ============ Word Ladder: change one letter at a time ============ */
const W4 = ('able acid aged also area army away baby back bake ball band bank bare bark barn base bath bead beak beam bean bear beat beef been beer bell belt bend bent best bike bill bind bird bite blow blue boat body boil bold bolt bond bone book boom boot bore born boss both bowl bulk bull burn bush busy cake call calm came camp cane cape card care cart case cash cast cave cell chat chin chip cite city clap claw clay clip club coal coat code coil coin cold come cone cook cool cope copy cord core cork corn cost cozy crab crew crop crow cube cure curl cute dale dame damp dare dark dart dash data date dawn days dead deaf deal dean dear debt deck deed deep deer desk dial dice diet dime dine dirt dish disk dive dock does doll dome done door dose dove down drag draw drew drip drop drum dual duck dude dull dune dusk dust duty each earn ease east easy edge else even ever exam exit face fact fade fail fair fake fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish fist five flag flap flat flaw fled flew flip flow foam fold folk fond font food fool foot ford fork form fort foul four free frog from fuel full fund fuse gain gale game gate gave gaze gear gift girl give glad glow glue goal goat goes gold golf gone good gown grab gram gray grew grid grin grip grow gulf gust hair half hall halt hand hang hard hare harm hate have hawk head heal heap hear heat held helm help herb herd here hero hide high hike hill hint hire hold hole home hood hook hope horn hose host hour huge hull hung hunt hurt idea inch into iron item jail jazz jeep join joke jump june jury just keen keep kept kick kind king kite knee knew knit knot know lace lack lady laid lake lamb lamp land lane last late lawn lazy lead leaf leak lean leap left lend lens less life lift like lily limb lime line link lion list live load loaf loan lock loft logo long look loop lord lose loss lost loud love luck lump lung made mail main make male mall many mare mark mask mass mast mate maze meal mean meat meet melt memo mend menu mere mesh mild mile milk mill mind mine mint miss mist moan mode mold mole mood moon more moss most moth move much mule must name navy near neat neck need nest news next nice nine node none noon norm nose note noun oath odds once only open oval oven over pace pack page paid pail pain pair pale palm pane park part pass past path peak pear peel pick pile pill pine pink pipe plan play plot plug plum poem poet pole poll pond pony pool poor pope pork port pose post pour pray prey pull pump pure push race rack raft rage raid rail rain rake ramp rang rank rare rash rate rave read real rear reed rely rent rest rice rich ride ring rise risk road roam roar robe rock rode role roll roof room root rope rose ruby rude rule rung rush rust safe sage said sail sake sale salt same sand sang save seal seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut sick side sigh sign silk sing sink site size skin skip slab slam slap sled slid slim slip slot slow snap snow soak soap soar sock soda sofa soft soil sold sole some song soon sort soul soup sour spin spot star stay stem step stir stop such suit sung sunk sure swan swap swim tack tail take tale talk tall tame tank tape task team tear tell tend tent term test text than that them then they thin this tide tidy tied tile till time tiny tire toad toes told toll tone took tool tops tore torn tour town trap tray tree trim trip true tube tune turn twin type unit upon used user vase vast verb very vest view vine visa void vote wade wage wait wake walk wall want ward warm warn wash wave wavy weak wear weed week well went were west what when whip wide wife wild will wind wine wing wink wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn year yell your zero zone ' +
  'bane bare bate bead bite bode bole bone bore bowl bump bunk bust cage cane cart cave core cove cute dive dole dome dote dune fang fare fine fume gaze gild gill gist gnat gull hail haze hilt hymn jade jest jolt keel kiln lard lash lice lime lure mace mane mate meek mint mole mope mule mute nape newt pact pang pave peck pelt perk pest pity plea pore puff pull punt rake rasp reap rind rink ripe rite rove sack sane sash scar seam sear sect shin sift silt slay slug smog snag sore span spar spur stab stag tart tilt toil tome trot tusk vane veil vent wail wand wane wart weld welt whim wick wilt wily womb yawn yelp zest bait bade bags beds bees bets bins bits boar bows cars cats cups dams dogs fees fins gems hats hens jars keys kids lids maps mats nets pans pens pets pigs pins pots rats rays rugs tabs tins toys vans wigs').split(' ').filter(w => /^[a-z]{4}$/.test(w));
let LADDER = null;
function ladderGraph(){
  if (LADDER) return LADDER;
  const set = new Set(W4), buckets = {};
  set.forEach(w => { for (let i = 0; i < 4; i++){ const k = w.slice(0, i) + '_' + w.slice(i + 1); (buckets[k] = buckets[k] || []).push(w); } });
  const nb = w => { const out = new Set(); for (let i = 0; i < 4; i++) (buckets[w.slice(0, i) + '_' + w.slice(i + 1)] || []).forEach(x => { if (x !== w) out.add(x); }); return [...out]; };
  return LADDER = { set, nb };
}
function bfs(from){ const { nb } = ladderGraph(), dist = { [from]: 0 }, prev = {}, q = [from];
  while (q.length){ const w = q.shift(); for (const x of nb(w)) if (!(x in dist)){ dist[x] = dist[w] + 1; prev[x] = w; q.push(x); } } return { dist, prev }; }
const LADDER_LEN = [3, 3, 4, 4, 5, 5, 6];
function ladderGen(rng, lv){
  const { set } = ladderGraph(), words = [...set].sort(), want = LADDER_LEN[Math.min(lv, 7) - 1];
  for (let t = 0; t < 200; t++){
    const a = words[ri(rng, words.length)], { dist } = bfs(a);
    const far = Object.keys(dist).filter(w => dist[w] === want);
    if (far.length) return { from: a, to: far[ri(rng, far.length)], best: want };
  }
  return { from: 'cold', to: 'warm', best: 4 };
}
function ladderStart(seed, lv){ S = Object.assign(ladderGen(seeded(seed), lv), { path: [], hints: 0, t0: Date.now(), lv, msg: '' }); S.path = [S.from]; ladderDraw(); }
function ladderDraw(){
  const last = S.path[S.path.length - 1];
  root.innerHTML = top('ladder', `<span class="pill">L${S.lv}</span>`) + `
    <div class="g-stats"><span>Best possible: ${S.best} steps</span><span>${S.path.length - 1} so far</span></div>
    <div class="pz-lad">${S.path.map((w, i) => `<div class="rung ${i === 0 ? 'from' : ''}">${w.toUpperCase().split('').map((ch, k) => `<b class="${i && S.path[i - 1][k] !== ch.toLowerCase() ? 'chg' : ''}">${ch}</b>`).join('')}</div>`).join('')}
      <form class="rung in" data-lf><input id="pz-lw" maxlength="4" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${'_'.repeat(4)}" aria-label="Next word"><button class="btn primary small">Go</button></form>
      <div class="rung to">${S.to.toUpperCase().split('').map((ch, k) => `<b class="${last[k] === ch.toLowerCase() ? 'hit' : ''}">${ch}</b>`).join('')}</div></div>
    <div class="note pz-msg">${S.msg || `Change one letter at a time to turn <b>${S.from.toUpperCase()}</b> into <b>${S.to.toUpperCase()}</b>. Every step must be a real word.`}</div>
    <div class="row" style="justify-content:center"><button class="btn small" data-ld="undo" ${S.path.length > 1 ? '' : 'disabled'}>↶ Undo</button><button class="btn small" data-ld="hint">💡 Hint</button></div>`;
  const inp = root.querySelector('#pz-lw'); if (inp && !('ontouchstart' in window)) inp.focus();
}
function ladderTry(w){
  w = String(w || '').trim().toLowerCase();
  const last = S.path[S.path.length - 1], { set } = ladderGraph();
  if (w.length !== 4){ S.msg = 'Four letters, please.'; return ladderDraw(); }
  const diff = [...w].filter((c, i) => c !== last[i]).length;
  if (diff !== 1){ S.msg = `Change exactly <b>one</b> letter of ${last.toUpperCase()}.`; return ladderDraw(); }
  if (!set.has(w)){ S.msg = `Bisi doesn't know "${esc(w.toUpperCase())}". Try a more common word.`; return ladderDraw(); }
  S.path.push(w); S.msg = '';
  if (w === S.to){ const steps = S.path.length - 1; ladderDraw(); setTimeout(() => win('ladder', { moves: steps, ms: Date.now() - S.t0, line: `${steps} steps${steps === S.best ? ' (perfect!)' : ` (best: ${S.best})`}${S.hints ? ` · ${S.hints} hint${S.hints > 1 ? 's' : ''}` : ''}` }), 300); return; }
  ladderDraw();
}
function ladderHint(){
  const last = S.path[S.path.length - 1], { dist } = bfs(S.to), { nb } = ladderGraph();
  const nx = nb(last).filter(w => dist[w] !== undefined).sort((a, b) => dist[a] - dist[b])[0];
  S.hints++; S.msg = nx ? `Try changing a letter to make <b>${nx.toUpperCase()}</b>.` : 'Hmm, dead end. Undo a step.'; ladderDraw();
}

/* ============ Robo Path: program a robot bee ============ */
// S start, G flower, # hedge, o pollen (collect all before the flower counts)
const ROBO = [
  { map: ['.....', 'S..G.', '.....'], dir: 1, slots: 3, loop: false, tip: '▲ moves one square forward. Program the bee to reach the flower.' },
  { map: ['...G.', '.....', 'S....'], dir: 1, slots: 6, loop: false, tip: '↰ and ↱ turn the bee on the spot. They don\'t move it.' },
  { map: ['S.#..', '..#.G', '.....'], dir: 1, slots: 10, loop: false, tip: 'Hedges block the way. Go around.' },
  { map: ['S.......G'], dir: 1, slots: 2, loop: true, tip: 'Only 2 blocks! Use Repeat: the whole program runs again.' },
  { map: ['S....', '#....', '##...', '###..', '####G'], dir: 1, slots: 4, loop: true, tip: 'A staircase. Find the pattern for one step, then repeat it.' },
  { map: ['S.o..', '.....', '..o.G'], dir: 1, slots: 8, loop: false, tip: 'Collect all the pollen (●) before landing on the flower.' },
  { map: ['S..o', '....', '....', 'o..o', ], dir: 1, slots: 4, loop: true, tip: 'Pollen in three corners and the flower… somewhere you\'ll pass. Loop it.', goal: [1, 0] },
  { map: ['S...', '###.', '....', '.###', '...G'], dir: 1, slots: 17, loop: false, tip: 'A long zigzag. Plan it out, then press Run.' },
];
function roboParse(lv){
  const L = ROBO[lv - 1], grid = L.map.map(r => r.split(''));
  if (L.goal) grid[L.goal[0]][L.goal[1]] = 'G';
  let s = null; const pollen = [];
  grid.forEach((row, y) => row.forEach((ch, x) => { if (ch === 'S') s = [y, x]; if (ch === 'o') pollen.push(y + ',' + x); }));
  return { L, grid, s, pollen };
}
function roboStart(lv){
  lv = Math.min(lv, ROBO.length);
  const p = roboParse(lv);
  S = { lv, ...p, prog: [], rep: 1, run: null, t0: Date.now(), tries: 0, msg: '' };
  roboDraw();
}
function roboDraw(pos, dir, got, bump){
  const { grid, L } = S, R = grid.length, C = grid[0].length;
  pos = pos || S.s; dir = dir ?? L.dir; got = got || new Set();
  const ARW = ['▲', '▶', '▼', '◀'], CMD = { F: '▲', L: '↰', R: '↱' };
  root.innerHTML = top('robo', `<span class="pill">L${S.lv}/${ROBO.length}</span>`) + `
    <div class="pz-robo" style="grid-template-columns:repeat(${C},1fr)">${grid.map((row, y) => row.map((ch, x) => {
      const here = pos[0] === y && pos[1] === x;
      return `<div class="rc ${ch === '#' ? 'hedge' : ''} ${here && bump ? 'bump' : ''}">${ch === 'G' ? '🌸' : ch === 'o' && !got.has(y + ',' + x) ? '<i class="pol"></i>' : ''}${here ? `<span class="robee" style="transform:rotate(${dir * 90}deg)">${bee('happy', 30)}<em>${ARW[0]}</em></span>` : ''}</div>`; }).join('')).join('')}</div>
    <div class="note pz-msg">${S.msg || esc(L.tip)}</div>
    <div class="pz-prog" aria-label="Your program">${S.prog.map((c, i) => `<button class="pz-blk" data-rb="${i}" aria-label="remove step ${i + 1}">${CMD[c]}</button>`).join('')}${Array.from({ length: Math.max(0, L.slots - S.prog.length) }, () => '<span class="pz-blk empty"></span>').join('')}</div>
    <div class="row pz-cmds"><button class="btn" data-ra="F">▲ Forward</button><button class="btn" data-ra="L">↰ Left</button><button class="btn" data-ra="R">↱ Right</button></div>
    ${L.loop ? `<div class="row pz-cmds"><span class="note">Repeat</span>${[1, 2, 3, 4].map(n => `<button class="btn small ${S.rep === n ? 'primary' : ''}" data-rr="${n}">${n}×</button>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:center"><button class="btn primary" data-rg="run" ${S.prog.length && !S.run ? '' : 'disabled'}>▶ Run</button><button class="btn" data-rg="clear">Clear</button></div>`;
}
function roboRun(){
  const { grid, L } = S, steps = []; for (let r = 0; r < (L.loop ? S.rep : 1); r++) steps.push(...S.prog);
  let pos = S.s.slice(), dir = L.dir, got = new Set(), i = 0; S.tries++;
  const DY4 = [-1, 0, 1, 0], DX4 = [0, 1, 0, -1];
  S.run = setInterval(() => {
    if (!S || !S.run) return;
    if (i >= steps.length){ clearInterval(S.run); S.run = null; S.msg = got.size < S.pollen.length ? `Out of steps: ${S.pollen.length - got.size} pollen left to collect.` : 'Out of steps before the flower. Tweak it and run again.'; return roboDraw(pos, dir, got); }
    const c = steps[i++];
    if (c === 'L') dir = (dir + 3) % 4; else if (c === 'R') dir = (dir + 1) % 4;
    else { const ny = pos[0] + DY4[dir], nx = pos[1] + DX4[dir];
      if (ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0].length || grid[ny][nx] === '#'){ clearInterval(S.run); S.run = null; S.msg = 'Bonk! 🌿 The bee hit a hedge or the edge. Fix the program and run again.'; return roboDraw(pos, dir, got, true); }
      pos = [ny, nx]; if (grid[ny][nx] === 'o') got.add(ny + ',' + nx); }
    roboDraw(pos, dir, got);
    if (grid[pos[0]][pos[1]] === 'G' && got.size === S.pollen.length){ clearInterval(S.run); S.run = null;
      const blocks = S.prog.length; setTimeout(() => win('robo', { moves: blocks, ms: Date.now() - S.t0, line: `${blocks} block${blocks === 1 ? '' : 's'}${S.tries > 1 ? ` · ${S.tries} tries` : ' · first try!'}` }), 350); }
  }, 380);
}

/* ============ shared: win screen, hub cards, daily ============ */
const PZ = {
  circuit: { name: 'Circuit Bloom', icon: '🔌', blurb: 'Turn the wires so power reaches every flower. Gets bigger as you go.', start: (lv, seed) => circuitStart(seed, lv) },
  robo:    { name: 'Robo Path', icon: '🤖', blurb: 'Program a robot bee with arrows and loops. Coding logic without typing.', start: lv => roboStart(lv) },
  sudoku:  { name: 'Hive Sudoku', icon: '🍯', blurb: 'Honeycomb sudoku: 6×6 to warm up, then the full 9×9.', start: (lv, seed) => sudokuStart(seed, lv) },
  ladder:  { name: 'Word Ladder', icon: '🪜', blurb: 'COLD → CORD → CARD → WARD → WARM. One letter at a time.', start: (lv, seed) => ladderStart(seed, lv) },
  sort:    { name: 'Nectar Sort', icon: '🫙', blurb: 'Pour honey between jars until every jar is one colour. Calm and satisfying.', start: (lv, seed) => sortStart(seed, lv) },
};
const MAXLV = { circuit: 8, robo: ROBO.length, sudoku: 6, ladder: 7, sort: 7 };
function start(k, el, c){
  stop(); root = el; ctx = c || ctx; active = k; daily = null;
  wire();
  PZ[k].start(lvOf(k), (Date.now() ^ (Math.random() * 1e9)) >>> 0);
}
function win(k, r){
  if (!S || active !== k) return;
  const lv = S.lv, isDaily = !!daily;
  if (isDaily){ store.set('pz-daily', { d: daily.key, k, line: r.line, ms: r.ms }); const st = store.get('pz-daily-streak', { last: '', n: 0 });
    const y = new Date(); y.setDate(y.getDate() - 1); const yk = dayKey(y); store.set('pz-daily-streak', { last: daily.key, n: st.last === yk ? st.n + 1 : st.last === daily.key ? st.n : 1 }); }
  else { const best = store.get('pz-best-' + k, {}); if (!best[lv] || r.moves < best[lv]) best[lv] = r.moves; store.set('pz-best-' + k, best);
    if (lv >= lvOf(k) && lv < MAXLV[k]) store.set('pz-lv-' + k, lv + 1); }
  store.set('pollen', store.get('pollen', 0) + 20 * lv);
  S = null;
  root.innerHTML = top(k) + `<div class="card g-end"><div class="g-bisi">${bee('party', 96)}</div>
    <div class="g-score">${isDaily ? 'Solved!' : lv >= MAXLV[k] ? 'All done!' : 'Level ' + lv + ' ✓'}</div><div>${esc(r.line)} · ${fmtT(r.ms)}</div>
    ${isDaily ? `<p>Come back tomorrow for a new one. 🔥 ${store.get('pz-daily-streak', { n: 1 }).n}-day Buzzle streak.</p><div class="row" style="justify-content:center"><button class="btn primary" data-pzshare>Share my result</button><button class="btn" data-gback>Other games</button></div>`
      : `<p>${['Big brain. Bisi is impressed.', 'Clean. Like a freshly waxed comb.', 'Look at you go. 🐝'][lv % 3]}</p>
      <div class="row" style="justify-content:center">${lv < MAXLV[k] ? `<button class="btn primary" data-pzgo="${k}">Next level →</button>` : `<button class="btn primary" data-pzgo="${k}">Play again</button>`}<button class="btn" data-gback>Other games</button></div>`}
  </div>`;
  if (ctx.confetti) ctx.confetti();
}
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAILY_KINDS = ['ladder', 'circuit', 'sort', 'sudoku'];
function todayDaily(){
  const d = new Date(), key = dayKey(d), n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  let seed = 0; for (const ch of 'buzzle' + key) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return { key, seed, kind: DAILY_KINDS[n % DAILY_KINDS.length], lv: [3, 4, 4, 2][n % 4] };
}
function dailyCard(){
  const t = todayDaily(), done = store.get('pz-daily', {}), solved = done.d === t.key, st = store.get('pz-daily-streak', { n: 0, last: '' });
  return `<button class="card pz-daily" data-pzdaily><span class="g-ico">📅</span><span><b>Daily Buzzle</b>
    <small>${solved ? `Solved today: ${esc(done.line)} · ${fmtT(done.ms)}. New one tomorrow!` : `Today: ${PZ[t.kind].icon} ${PZ[t.kind].name}. Same puzzle for everyone, so you can compare with friends.`}</small></span>
    <span class="pill">${st.n ? '🔥 ' + st.n : solved ? '✓' : 'Play'}</span></button>`;
}
function startDaily(el, c){
  stop(); root = el; ctx = c || ctx; wire();
  const t = todayDaily(), done = store.get('pz-daily', {});
  if (done.d === t.key){ active = t.kind; daily = t; root.innerHTML = top(t.kind) + `<div class="card g-end"><div class="g-bisi">${bee('happy', 80)}</div><div class="g-score">Done for today</div><div>${esc(done.line)} · ${fmtT(done.ms)}</div><div class="row" style="justify-content:center"><button class="btn primary" data-pzshare>Share my result</button><button class="btn" data-gback>Other games</button></div></div>`; return; }
  active = t.kind; daily = t;
  PZ[t.kind].start(t.lv, t.seed);
}
function share(){
  const done = store.get('pz-daily', {}), t = todayDaily(), st = store.get('pz-daily-streak', { n: 1 });
  const text = `🐝 Daily Buzzle ${t.key}\n${PZ[done.k || t.kind].icon} ${PZ[done.k || t.kind].name}: ${done.line} in ${fmtT(done.ms || 0)}\n🔥 ${st.n}-day streak · Follow-Through`;
  if (window.Android && Android.share && !Android.web) Android.share(text, '');
  else if (navigator.share) navigator.share({ text }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => ctx.toast && ctx.toast('Copied your result.'));
}
function hubCards(){
  return Object.entries(PZ).map(([k, x]) => { const lv = lvOf(k);
    return `<button class="card g-card" data-pz="${k}"><span class="g-ico">${x.icon}</span><b>${x.name}</b><small>${x.blurb}</small>
      <span class="g-meta"><span class="pill">Level ${lv}/${MAXLV[k]}</span></span></button>`; }).join('');
}
function stop(){ if (S && S.run){ clearInterval(S.run); } S = null; active = null; daily = null; }

/* ---------- input ---------- */
function onClick(e){
  if (!active && !e.target.closest('[data-pzshare]')) return;
  const t = e.target;
  if (t.closest('[data-pzshare]')) return share();
  const go = t.closest('[data-pzgo]'); if (go){ const k = go.dataset.pzgo; return start(k, root, ctx); }
  if (!S) return;
  if (active === 'circuit'){ const c = t.closest('[data-cc]'); if (c){ const i = +c.dataset.cc; S.cur[i] = rot(S.cur[i]); S.moves++; circuitDraw(); } return; }
  if (active === 'sort'){ const j = t.closest('[data-jar]'); if (j) return sortTap(+j.dataset.jar);
    const so = t.closest('[data-so]'); if (so){ if (so.dataset.so === 'undo' && S.undo.length){ S.jars = S.undo.pop(); S.moves++; } if (so.dataset.so === 'reset'){ S.jars = S.start.map(x => x.slice()); S.undo = []; S.moves = 0; } S.sel = -1; return sortDraw(); } return; }
  if (active === 'sudoku'){ const c = t.closest('[data-sc]'); if (c){ S.sel = +c.dataset.sc; return sudokuDraw(); }
    const n = t.closest('[data-sn]'); if (n) return sudokuPut(+n.dataset.sn);
    if (t.closest('[data-sd]') && S.hints){ const empty = S.cur.map((v, i) => i).filter(i => S.cur[i] !== S.sol[i]); const i = S.sel >= 0 && S.cur[S.sel] !== S.sol[S.sel] ? S.sel : empty[Math.floor(Math.random() * empty.length)];
      if (i !== undefined){ S.hints--; S.sel = i; sudokuPut(S.sol[i]); } } return; }
  if (active === 'ladder'){ const l = t.closest('[data-ld]'); if (l){ if (l.dataset.ld === 'undo' && S.path.length > 1){ S.path.pop(); S.msg = ''; ladderDraw(); } else if (l.dataset.ld === 'hint') ladderHint(); } return; }
  if (active === 'robo'){ if (S.run) return;
    const a = t.closest('[data-ra]'); if (a){ if (S.prog.length < S.L.slots){ S.prog.push(a.dataset.ra); S.msg = ''; } else S.msg = `Only ${S.L.slots} blocks fit.${S.L.loop ? ' Try Repeat!' : ''}`; return roboDraw(); }
    const b = t.closest('[data-rb]'); if (b){ S.prog.splice(+b.dataset.rb, 1); return roboDraw(); }
    const r = t.closest('[data-rr]'); if (r){ S.rep = +r.dataset.rr; return roboDraw(); }
    const g = t.closest('[data-rg]'); if (g){ if (g.dataset.rg === 'run') roboRun(); else { S.prog = []; S.msg = ''; roboDraw(); } } }
}
function onSubmit(e){ if (active === 'ladder' && e.target.closest('[data-lf]')){ e.preventDefault(); ladderTry(root.querySelector('#pz-lw').value); } }
function wire(){ if (root && !root.dataset.pzWired){ root.addEventListener('click', onClick); root.addEventListener('submit', onSubmit); root.dataset.pzWired = 1; } }

const STYLE = `
.pz-daily{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:var(--ink);background:var(--sun-soft);margin-bottom:14px;cursor:pointer}
.pz-daily small{display:block;color:var(--muted)}.pz-daily>span:nth-child(2){flex:1}
.pz-circ{display:grid;gap:0;max-width:420px;margin:8px auto;background:var(--sunk);border:2.5px solid var(--stroke);border-radius:14px;overflow:hidden}
.pz-cell{border:0;padding:0;background:transparent;aspect-ratio:1;cursor:pointer}.pz-cell svg{width:100%;height:100%;display:block}
.pz-jars{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:14px 0}
.pz-jar{width:52px;height:150px;display:flex;flex-direction:column-reverse;gap:2px;padding:4px;border:3px solid var(--stroke);border-top-width:6px;border-radius:6px 6px 22px 22px;background:var(--card);cursor:pointer;transition:transform .15s}
.pz-jar i{display:block;height:33px;border-radius:5px}.pz-jar i:first-child{border-radius:5px 5px 16px 16px}.pz-jar.sel{transform:translateY(-14px);box-shadow:0 6px 0 var(--sun)}
.pz-sd{display:grid;gap:3px;max-width:420px;margin:10px auto}
.pz-hex{aspect-ratio:1;border:0;font:inherit;font-weight:800;font-size:18px;color:var(--accent);background:var(--card);clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);cursor:pointer;padding:0}
.pz-sd.n9 .pz-hex{font-size:15px}.pz-hex.gv{color:#1E1606;background:#F2C94C}.pz-hex.same{background:#FFE9A8;color:#1E1606}.pz-hex.gv.same{background:#E3A82B}.pz-hex.sel{background:var(--sun);color:#1E1606}
.pz-hex.bad{color:#fff;background:var(--rose)}.pz-hex.br{margin-right:7px}.pz-hex.bb{margin-bottom:9px}
.pz-sd{background:transparent}
.pz-pad{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0}.pz-pad .btn{min-width:44px}
.pz-lad{display:flex;flex-direction:column;align-items:center;gap:6px;margin:12px 0}
.rung{display:flex;gap:5px}.rung b{width:40px;height:44px;display:grid;place-items:center;border:2.5px solid var(--stroke);border-radius:8px;background:var(--card);font-size:22px}
.rung b.chg{background:var(--sun-soft)}.rung.from b{background:var(--sunk)}.rung.to b{background:var(--accent-soft);border-style:dashed}.rung.to b.hit{background:var(--sun);border-style:solid}
.rung.in input{width:150px;text-transform:uppercase;letter-spacing:.5em;font-size:22px;text-align:center;font-weight:800}
.pz-msg{text-align:center;min-height:2.4em}
.pz-robo{display:grid;gap:3px;max-width:380px;margin:10px auto}
.pz-robo .rc{aspect-ratio:1;background:#DDEFCF;border-radius:8px;display:grid;place-items:center;position:relative;font-size:22px}
.pz-robo .rc.hedge{background:#2F6B3A;box-shadow:inset 0 0 0 3px #1F4A28}.pz-robo .rc.bump{animation:pz-shake .3s}
.pz-robo .pol{width:12px;height:12px;border-radius:50%;background:#F5B700;border:2px solid #1E1606}
.robee{position:absolute;inset:0;display:grid;place-items:center;transition:transform .2s}.robee svg{width:30px;height:30px}
.robee em{position:absolute;top:-4px;font-style:normal;font-size:11px;color:#1E1606}
@keyframes pz-shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.pz-prog{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:10px 0;min-height:42px}
.pz-blk{width:38px;height:38px;border:2.5px solid var(--stroke);border-radius:9px;background:var(--sun-soft);font-size:18px;font-weight:800;color:var(--ink);cursor:pointer}
.pz-blk.empty{border-style:dashed;background:transparent;cursor:default}.pz-cmds{justify-content:center;align-items:center}
`;
(() => { const s = document.createElement('style'); s.textContent = STYLE; (document.head || document.documentElement).appendChild(s); })();

window.FTPuzzles = { list: PZ, start, startDaily, stop, isActive: () => !!active, hubCards, dailyCard,
  _gen: { circuitGen, circuitPower, sortGen, sortSolvable, sudokuGen, sdCount, ladderGen, ladderGraph, bfs, ROBO, roboParse, seeded } };
if (typeof module !== 'undefined') module.exports = window.FTPuzzles;
})();
