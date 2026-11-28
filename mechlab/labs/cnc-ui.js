// CNC milling workshop: a drawn 3-axis mill, a real-style control panel, and guided lessons that tick themselves off.
import { interpret, checkChallenge, CODE_INFO, LETTER_INFO, EXAMPLES, CHALLENGES } from './gcode.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

const PARTS = {
  tool: ['Spindle & end mill', 'The spindle is the motor that spins the cutter (the end mill) thousands of times a minute. S sets how fast (RPM); M03 starts it, M05 stops it. The cutter is the only thing that touches the metal.'],
  stock: ['Stock (your material)', 'The block of aluminium you are cutting. Its top surface is Z0: positive Z is in the air above it, negative Z is inside the metal.'],
  vise: ['Vise', 'Two steel jaws that clamp the stock so it cannot move while cutting. Real machinists check this twice: a loose part is dangerous.'],
  origin: ['Work origin (X0 Y0)', 'The point every coordinate is measured from, here the front-left corner of the stock. X goes right, Y goes away from you, Z goes up. G54 tells the machine where this point is.'],
  dro: ['DRO (digital readout)', 'Shows exactly where the tool is right now in X, Y and Z, plus spindle speed and feed. Operators watch it like a car speedometer.'],
  panel: ['Control panel', 'Where the program lives. CYCLE START runs it, FEED HOLD pauses the motion, SINGLE BLOCK runs one line at a time, and RESET stops everything.'],
};

const STARTERS = {
  move: '(LESSON 2: MOVE THE TOOL)\nG21 G90\nG00 Z10\n(YOUR TURN: rapid to X50 Y40 at Z5)\n\nM30',
  rules: '(LESSON 3: SET THE RULES)\n(YOUR TURN: add G21 and G90 on the next line)\n\nG00 Z10\nG00 X20 Y20 Z5\nM30',
  spindle: '(LESSON 4: WAKE THE SPINDLE)\nG21 G90\n(YOUR TURN: spindle on at 1200 RPM)\n\nG00 Z5\nG00 X20 Y20\nG01 Z-1 F100\nG01 X40 F200\nG00 Z5\n(YOUR TURN: spindle off)\n\nM30',
  line: '(LESSON 5: FIRST CUT)\nG21 G90\nS1200 M03\nG00 Z5\nG00 X10 Y10\n(YOUR TURN: plunge to Z-1 at F100, then cut to X60)\n\n\nG00 Z5\nM05\nM30',
  rect: '(LESSON 6: RECTANGLE 40 X 30)\nG21 G90\nS1200 M03\nG00 Z5\nG00 X10 Y10\nG01 Z-1.5 F100\n(YOUR TURN: cut to X50, then Y40, then X10, then back to Y10)\n\n\n\n\n(YOUR TURN: lift out safely)\n\nM05\nM30',
  circle: '(LESSON 7: CIRCLE R15 AT X50 Y40)\nG21 G90 G17\nS1500 M03\nG00 Z5\nG00 X65 Y40      (start on the circle: centre X50 + radius 15)\nG01 Z-1 F100\n(YOUR TURN: one G02 back to X65 Y40, centre is 15 to the LEFT: I-15 J0, F200)\n\nG00 Z5\nM05\nM30',
  holes: '(LESSON 8: FOUR HOLES)\nG21 G90\nT2 M06\nS900 M03\nM08\nG00 Z10\n(YOUR TURN: G81 drill at X20 Y20, Z-8, R2, F80)\n\n(then just X80 / Y60 / X20 on their own lines)\n\n\n\nG80\nM09\nM05\nM30',
};
const SOLUTIONS = {
  move: 'G21 G90\nG00 Z10\nG00 X50 Y40 Z5\nM30',
  rules: 'G21 G90\nG00 Z10\nG00 X20 Y20 Z5\nM30',
  spindle: 'G21 G90\nS1200 M03\nG00 Z5\nG00 X20 Y20\nG01 Z-1 F100\nG01 X40 F200\nG00 Z5\nM05\nM30',
  line: 'G21 G90\nS1200 M03\nG00 Z5\nG00 X10 Y10\nG01 Z-1 F100\nG01 X60 F200\nG00 Z5\nM05\nM30',
  rect: 'G21 G90\nS1200 M03\nG00 Z5\nG00 X10 Y10\nG01 Z-1.5 F100\nG01 X50 F250\nY40\nX10\nY10\nG00 Z5\nM05\nM30',
  circle: 'G21 G90 G17\nS1500 M03\nG00 Z5\nG00 X65 Y40\nG01 Z-1 F100\nG02 X65 Y40 I-15 J0 F200\nG00 Z5\nM05\nM30',
  holes: 'G21 G90\nT2 M06\nS900 M03\nM08\nG00 Z10\nG98 G81 X20 Y20 Z-8 R2 F80\nX80\nY60\nX20\nG80\nM09\nM05\nM30',
};

export function mountCncLab(root, { tutor, award, badge, store }) {
  root.innerHTML = `
  <div class="cnc">
    <div class="cnc-top">
      <div>
        <h2 class="cnc-title">CNC milling workshop</h2>
        <p class="muted cnc-lede">Write real G-code, press <b>Cycle Start</b> and watch the mill cut your part. Crashes are safe here, and every mistake explains itself.</p>
      </div>
      <div class="cnc-prog" id="cnProg" aria-label="Lessons"></div>
    </div>
    <div class="cnc-grid">
      <div class="cnc-machine">
        <div class="mframe" id="cnFrame">
          <div class="mhead"><span class="lamp" id="cnLamp"></span><b>MECHLAB VMC-1</b><span class="mhead-sub">3-axis vertical mill</span><button class="chip tiny" id="cnPath" type="button">toolpath: on</button></div>
          <div class="mwin"><canvas id="cnTop" aria-label="Top view through the machine window"></canvas><div class="crash hidden" id="cnCrash"></div></div>
          <canvas id="cnSide" aria-label="Side view showing depth"></canvas>
          <div class="hazard" aria-hidden="true"></div>
        </div>
      </div>
      <aside class="cnc-card" id="cnCard" aria-live="polite"></aside>
      <div class="pendant" data-part="panel">
        <div class="pendant-head">
          <span class="pendant-name">CONTROL PANEL</span>
          <select id="cnExample" aria-label="Load an example program"><option value="">📂 Examples…</option>${Object.keys(EXAMPLES).map((k) => `<option>${esc(k)}</option>`).join('')}</select>
        </div>
        <div class="screen"><div class="gutter" id="cnGutter" aria-hidden="true"></div><textarea id="cnCode" spellcheck="false" autocapitalize="characters" autocomplete="off" aria-label="G-code program"></textarea></div>
        <div class="nowline" id="cnNow">READY. Press CYCLE START.</div>
        <div class="pbtns">
          <button class="pb start" id="cnStart" type="button">▶<small>CYCLE START</small></button>
          <button class="pb hold" id="cnHold" type="button">⏸<small>FEED HOLD</small></button>
          <button class="pb blk" id="cnBlock" type="button">⏭<small>SINGLE BLOCK</small></button>
          <button class="pb reset" id="cnReset" type="button">⟲<small>RESET</small></button>
        </div>
        <label class="override">Speed override <input type="range" id="cnSpeed" min="0" max="100" value="45"><b id="cnSpeedV"></b></label>
        <div class="pmsgs" id="cnMsgs"></div>
        <details class="setup"><summary>Machine setup</summary>
          <div class="row wrap small">
            <label class="row">Stock <input type="number" id="cnW" value="100" min="10" max="1000" class="num"> × <input type="number" id="cnH" value="80" min="10" max="1000" class="num"> mm</label>
            <label class="row">Tool Ø <input type="number" id="cnTool" value="4" min="0.5" max="40" step="0.5" class="num"> mm</label>
          </div>
        </details>
      </div>
    </div>
    <div class="card inner lab-tutor" id="gcTutor"></div>
    <div class="gc-bottom">
      <div class="card inner"><h3>🏆 Free-play challenges</h3><div id="gcChallenges"></div></div>
      <div class="card inner"><h3>📒 Cheat sheet</h3>
        <p class="small"><b>Memory trick:</b> <b>G</b> = <b>G</b>eometry (how it moves). <b>M</b> = <b>M</b>achine switches (spindle, coolant, tools, start/stop).</p>
        <input type="search" id="gcSearch" placeholder="Search codes, e.g. arc, coolant, G91" class="gc-search">
        <div id="gcRef" class="gc-ref"></div>
      </div>
    </div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const code = $('#cnCode'), topC = $('#cnTop'), sideC = $('#cnSide');
  code.value = store.get('gc.code', STARTERS.move);
  let result = interpret(code.value);
  let timeline = [], total = 0, t = 0, playing = false, lastTs = 0, ranToEnd = false, stopAtLine = null;
  let showPath = true, crashed = null, chips = [], drops = [], spin = 0;
  const seen = new Set(store.get('cn.seen', []));
  let lesson = Math.min(store.get('cn.lesson', 0), 8);
  const doneLessons = new Set(store.get('cn.done', []));
  let hintN = 0, activeChallenge = store.get('gc.challenge', null);

  /* ---------- lessons ---------- */
  const noErr = () => !result.msgs.some((m) => m.level === 'error');
  const noWarn = () => !result.msgs.some((m) => m.level === 'warn');
  const warnHas = (re) => result.msgs.some((m) => m.level === 'warn' && re.test(m.text));
  const reached = (x, y) => result.segs.some((s) => s.kind === 'rapid' && s.pts.some((p) => Math.hypot(p.x - x, p.y - y) < 0.01 && p.z > 0));
  const beforeFirstMove = () => { const out = []; for (const l of code.value.toUpperCase().split('\n')) { const s = l.replace(/\([^)]*\)/g, ''); if (/[XYZ]\s*-?[\d.]/.test(s)) break; out.push(s); } return out.join(' '); };
  const hasWord = (txt, w) => new RegExp(`\\b${w[0]}0*${w.slice(1)}(?!\\d)`).test(txt);
  const codeU = () => code.value.toUpperCase().replace(/\([^)]*\)/g, '');
  const LESSONS = [
    { h: 'Meet the machine', p: 'Tap the parts of the mill to learn what each one does: the cutter, the stock, the vise, the origin marker, the DRO readout and the control panel.',
      why: 'G-code is just instructions for these parts. Once you can picture the cutter moving over the metal, every code makes sense: some move it (G), some switch things on and off (M).',
      tasks: () => [['The spindle & cutter', seen.has('tool')], ['The stock (aluminium block)', seen.has('stock')], ['The vise', seen.has('vise')], ['The origin X0 Y0', seen.has('origin')], ['The DRO readout', seen.has('dro')], ['The control panel', seen.has('panel')]],
      hints: ['The cutter is the round thing in the machine window. The vise is the grey steel jaws at the top and bottom of the block.', 'The origin is the pink cross at the corner of the block. The DRO is the X/Y/Z readout on this card, and the control panel is the dark screen with buttons.'] },
    { h: 'Move the tool with G00', p: 'G00 is a rapid move: the cutter flies through the air to a point. Make it travel to <b>X50 Y40</b> while staying at <b>Z5</b> (5 mm above the metal), then press Cycle Start.',
      why: 'Every program begins by positioning the tool. G00 is the fastest move, but it never cuts, so it must always happen in the air (Z above 0).',
      starter: 'move', tasks: () => [['Rapid to X50 Y40 above the metal', reached(50, 40)], ['No errors', noErr()], ['Run it to the end', ranToEnd]],
      hints: ['Type a line like: G00 X__ Y__ Z__', 'The exact line is: G00 X50 Y40 Z5'] },
    { h: 'Set the rules: G21 & G90', p: 'Before any move, tell the machine the units and how to read numbers. <b>G21</b> = millimetres, <b>G90</b> = absolute positions measured from X0 Y0.',
      why: 'If a machine thinks your 50 means 50 inches instead of 50 mm, it will try to move 1.27 metres. G90 vs G91 is like "go to house number 20" vs "walk 20 more steps".',
      starter: 'rules', tasks: () => { const h = beforeFirstMove(); return [['G21 before the first move', hasWord(h, 'G21')], ['G90 before the first move', hasWord(h, 'G90')], ['Run it to the end', ranToEnd]]; },
      hints: ['Both codes can go on the same line, before any X, Y or Z.', 'Put "G21 G90" on the empty line under the comment.'] },
    { h: 'Wake the spindle: S & M03', p: 'A cutter that isn\'t spinning just snaps. Start it with <b>S1200 M03</b> before cutting, and stop it with <b>M05</b> before the end.',
      why: 'S is the speed in RPM, M03 starts the spindle clockwise (the normal cutting direction), M05 stops it. Forgetting M03 is one of the most common exam mistakes.',
      starter: 'spindle', tasks: () => { const c = codeU(); return [['Spindle on (S + M03) before cutting', /M0*3(?!\d)/.test(c) && /S\s*\d/.test(c) && !warnHas(/spindle (OFF|is off)/i)], ['Spindle off with M05', /M0*5(?!\d)/.test(c)], ['Run it without snapping the tool', ranToEnd && !warnHas(/spindle OFF/)]]; },
      hints: ['Speed and start go together on one line: S____ M03', 'Line 3: S1200 M03. Second blank line: M05.'] },
    { h: 'Your first cut: G01 + F', p: 'G01 cuts in a straight line at feed rate F (mm per minute). From X10 Y10, plunge to <b>Z-1</b> and cut a line to <b>X60 Y10</b>.',
      why: 'G00 is for travelling, G01 is for cutting. F tells the machine how fast to push the cutter through the metal: too fast breaks tools, too slow wastes time and rubs.',
      starter: 'line', tasks: () => { const ok = noErr() && checkChallenge({ target: [[10, 10], [60, 10]] }, result).pass; return [['Plunge to Z-1 with G01 and an F', noErr() && result.segs.some((s) => s.kind === 'feed' && s.pts.some((p) => p.z <= -1))], ['Cut the line from X10 to X60', ok], ['Run it to the end', ranToEnd]]; },
      hints: ['Two lines: one G01 going down in Z, one G01 going along X. The first needs an F.', 'G01 Z-1 F100, then G01 X60 F200'] },
    { h: 'Lift before you move', p: 'Cut a <b>40 × 30 rectangle</b> from X10 Y10 to X50 Y40. When you are done, lift out with <b>G00 Z5</b> before moving anywhere.',
      why: 'G01 stays active until you change it (modal), so you only need X or Y on the next lines. Moving fast while still inside the metal is a crash: always lift first.',
      starter: 'rect', tasks: () => [['Cut the full rectangle', checkChallenge(CHALLENGES[0], result).pass], ['No crashes or warnings', noErr() && noWarn()], ['Run it to the end', ranToEnd]],
      hints: ['After the plunge: X50 (bottom edge), Y40 (right edge), X10 (top), Y10 (back home).', 'Lift with G00 Z5 on the empty line after the cut.'] },
    { h: 'Curves: G02 & G03', p: 'G02 cuts a clockwise arc, G03 anticlockwise. Cut a full <b>circle of radius 15</b> centred at X50 Y40.',
      why: 'I and J say where the centre is, measured FROM THE START POINT (not from X0 Y0). Starting at X65 Y40, the centre X50 Y40 is 15 mm to the left, so I-15 J0.',
      starter: 'circle', tasks: () => [['Cut the circle', checkChallenge(CHALLENGES[1], result).pass], ['No errors', noErr()], ['Run it to the end', ranToEnd]],
      hints: ['A full circle ends where it starts, so the end point is X65 Y40 again.', 'G02 X65 Y40 I-15 J0 F200'] },
    { h: 'Drilling cycles: G81', p: 'A canned cycle drills a whole hole from one line. Drill holes at <b>(20,20), (80,20), (80,60), (20,60)</b>, 8 mm deep.',
      why: 'G81 X Y Z R F means: rapid to X Y, rapid down to R, drill down to Z at F, come back up. After the first line, each new X or Y drills another hole until G80 cancels it.',
      starter: 'holes', tasks: () => [['Four holes drilled', checkChallenge(CHALLENGES[2], result).pass], ['Cycle cancelled with G80', /G0*80(?!\d)/.test(codeU())], ['Run it to the end', ranToEnd]],
      hints: ['First line: G81 X20 Y20 Z-8 R2 F80. Then X80, then Y60, then X20.', 'Each new position on its own line drills a hole. The cycle stays on until G80.'] },
    { h: 'Graduation: fix a broken program', p: 'Load the broken program. It has 3 bugs. Fix them so it cuts the triangle with <b>zero</b> errors and warnings.',
      why: 'Finding bugs is what real CNC operators and exam questions test most. Read every red and yellow message in the control panel: it tells you the line and the problem.',
      starter: 'fix', tasks: () => [['Cut the triangle', checkChallenge(CHALLENGES[3], result).pass], ['Zero errors and warnings', noErr() && noWarn()], ['Run it to the end', ranToEnd]],
      hints: ['Bug 1: the spindle never starts. Bug 2: the first G01 has no F.', 'Bug 3: line 8 uses G00 inside the metal. It should be G01, then lift with G00 Z5.'] },
  ];

  /* ---------- timeline ---------- */
  function buildTimeline() {
    timeline = []; total = 0;
    for (const s of result.segs) {
      const speed = s.kind === 'rapid' ? 4000 : Math.max(10, s.feed || 100);
      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1], b = s.pts[i];
        const dur = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / speed * 60;
        const crash = s.kind === 'rapid' && (b.z < -0.001 || (a.z < -0.001 && Math.hypot(b.x - a.x, b.y - a.y) > 1e-6)) ? 'rapid' : s.kind === 'feed' && s.state.spindle === 'off' && (a.z < 0 || b.z < 0) ? 'snap' : null;
        timeline.push({ a, b, t0: total, t1: total + dur, seg: s, crash });
        total += dur;
      }
    }
  }
  function posAt(time) {
    if (!timeline.length) return { p: { x: 0, y: 0, z: 25 }, item: null };
    let lo = 0, hi = timeline.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (timeline[mid].t1 < time) lo = mid + 1; else hi = mid; }
    const it = timeline[lo], f = it.t1 > it.t0 ? Math.min(1, Math.max(0, (time - it.t0) / (it.t1 - it.t0))) : 1;
    return { p: { x: it.a.x + (it.b.x - it.a.x) * f, y: it.a.y + (it.b.y - it.a.y) * f, z: it.a.z + (it.b.z - it.a.z) * f }, item: it };
  }

  /* ---------- drawing ---------- */
  const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  let view = null;
  function draw() {
    const W = +$('#cnW').value || 100, H = +$('#cnH').value || 80, toolD = +$('#cnTool').value || 4;
    const dpr = devicePixelRatio || 1, cw = topC.clientWidth, ch = Math.round(Math.min(cw * 0.66, 460));
    if (!cw) return;
    topC.width = cw * dpr; topC.height = ch * dpr; topC.style.height = ch + 'px';
    const g = topC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let minX = -8, minY = -14, maxX = W + 8, maxY = H + 14;
    for (const s of result.segs) for (const p of s.pts) { minX = Math.min(minX, p.x - 6); minY = Math.min(minY, p.y - 6); maxX = Math.max(maxX, p.x + 6); maxY = Math.max(maxY, p.y + 6); }
    const pad = 18, sc = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY));
    const ox = (cw - (maxX - minX) * sc) / 2, oy = (ch - (maxY - minY) * sc) / 2;
    const X = (x) => ox + (x - minX) * sc, Y = (y) => ch - oy - (y - minY) * sc;
    view = { X, Y, sc, W, H, toolD, minX, minY, ox, oy, ch };
    // machine bed: dark steel with T-slots
    const bed = g.createLinearGradient(0, 0, 0, ch); bed.addColorStop(0, '#5b6068'); bed.addColorStop(1, '#3f434a');
    g.fillStyle = bed; g.fillRect(0, 0, cw, ch);
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (let i = 1; i < 5; i++) g.fillRect(0, ch * i / 5 - 5, cw, 10);
    g.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 1; i < 5; i++) g.fillRect(0, ch * i / 5 + 5, cw, 2);
    // vise jaws
    const jaw = (y0, y1) => { const gr = g.createLinearGradient(0, Y(y1), 0, Y(y0)); gr.addColorStop(0, '#c9ced6'); gr.addColorStop(.5, '#9aa1ab'); gr.addColorStop(1, '#6e757f'); g.fillStyle = gr; g.fillRect(X(-6), Y(y1), (W + 12) * sc, (y1 - y0) * sc); g.strokeStyle = '#4a5058'; g.lineWidth = 1; g.strokeRect(X(-6), Y(y1), (W + 12) * sc, (y1 - y0) * sc); };
    jaw(-12, -1); jaw(H + 1, H + 12);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.font = '700 10px system-ui'; g.fillText('VISE', X(W / 2) - 12, Y(-7) + 4);
    // stock (brushed aluminium)
    const al = g.createLinearGradient(X(0), Y(H), X(W), Y(0)); al.addColorStop(0, '#eef1f4'); al.addColorStop(.55, '#cfd5dc'); al.addColorStop(1, '#b7bec7');
    g.fillStyle = al; g.fillRect(X(0), Y(H), W * sc, H * sc);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (let y = 1.5; y < H; y += 2.2) { g.beginPath(); g.moveTo(X(0), Y(y)); g.lineTo(X(W), Y(y)); g.stroke(); }
    g.strokeStyle = '#8b939d'; g.lineWidth = 1.5; g.strokeRect(X(0), Y(H), W * sc, H * sc);
    // ruler ticks along the stock edges
    g.fillStyle = 'rgba(40,20,45,.55)'; g.font = '600 9px system-ui';
    for (let x = 0; x <= W; x += 10) { g.fillRect(X(x), Y(0) - 5, 1, 5); if (x % 20 === 0 && sc * 20 > 26) g.fillText(x, X(x) + 2, Y(0) - 7); }
    for (let y = 0; y <= H; y += 10) { g.fillRect(X(0), Y(y), 5, 1); if (y % 20 === 0 && y && sc * 20 > 26) g.fillText(y, X(0) + 7, Y(y) + 3); }
    // challenge / lesson target ghost
    const tgt = targetShape();
    if (tgt) {
      g.strokeStyle = '#12966f'; g.lineWidth = 2; g.setLineDash([3, 4]);
      if (tgt.line) { g.beginPath(); tgt.line.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); }
      if (tgt.holes) tgt.holes.forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), 6, 0, 7); g.stroke(); });
      if (tgt.point) { const [x, y] = tgt.point; g.beginPath(); g.arc(X(x), Y(y), 9, 0, 7); g.stroke(); g.beginPath(); g.moveTo(X(x) - 13, Y(y)); g.lineTo(X(x) + 13, Y(y)); g.moveTo(X(x), Y(y) - 13); g.lineTo(X(x), Y(y) + 13); g.stroke(); }
      g.setLineDash([]);
    }
    // milled grooves (cut so far)
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tw = Math.max(2.5, toolD * sc);
    for (const pass of [0, 1]) {
      for (const it of timeline) {
        if (it.t0 > t) break;
        if (it.seg.kind !== 'feed' || Math.min(it.a.z, it.b.z) >= 0) continue;
        const f = it.t1 > it.t0 ? Math.min(1, (t - it.t0) / (it.t1 - it.t0)) : 1;
        const bx = it.a.x + (it.b.x - it.a.x) * f, by = it.a.y + (it.b.y - it.a.y) * f;
        const depth = Math.min(1, -Math.min(it.a.z, it.b.z) / 6);
        g.strokeStyle = pass ? `rgb(${150 - depth * 50},${158 - depth * 50},${170 - depth * 45})` : '#5c636d';
        g.lineWidth = pass ? Math.max(1.5, tw - 2.5) : tw;
        g.beginPath(); g.moveTo(X(it.a.x) + (pass ? 0.8 : 0), Y(it.a.y) + (pass ? 0.8 : 0)); g.lineTo(X(bx) + (pass ? 0.8 : 0), Y(by) + (pass ? 0.8 : 0)); g.stroke();
      }
    }
    // drilled holes
    for (const h of result.holes) {
      const it = timeline.find((q) => q.seg.kind === 'feed' && q.b.x === h.x && q.b.y === h.y && q.b.z === h.z);
      if (!it || it.t1 > t) continue;
      const r = Math.max(3, tw / 2);
      const hg = g.createRadialGradient(X(h.x) - r / 3, Y(h.y) - r / 3, 1, X(h.x), Y(h.y), r);
      hg.addColorStop(0, '#2b2f35'); hg.addColorStop(1, '#6b727c');
      g.fillStyle = hg; g.beginPath(); g.arc(X(h.x), Y(h.y), r, 0, 7); g.fill();
    }
    // toolpath preview
    if (showPath) {
      g.lineWidth = 1.3;
      for (const it of timeline) {
        g.setLineDash(it.seg.kind === 'rapid' ? [5, 5] : []);
        g.strokeStyle = it.crash ? 'rgba(230,40,70,.9)' : it.seg.kind === 'rapid' ? 'rgba(196,170,255,.8)' : 'rgba(255,126,182,.55)';
        g.beginPath(); g.moveTo(X(it.a.x), Y(it.a.y)); g.lineTo(X(it.b.x), Y(it.b.y)); g.stroke();
      }
      g.setLineDash([]);
    }
    // origin marker
    g.strokeStyle = '#ff4f9a'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(X(0) - 9, Y(0)); g.lineTo(X(0) + 9, Y(0)); g.moveTo(X(0), Y(0) - 9); g.lineTo(X(0), Y(0) + 9); g.stroke();
    g.fillStyle = '#ff4f9a'; roundRect(g, X(0) + 6, Y(0) + 6, 44, 16, 8); g.fill();
    g.fillStyle = '#fff'; g.font = '800 10px system-ui'; g.fillText('X0 Y0', X(0) + 11, Y(0) + 17);
    // axis arrows
    g.strokeStyle = '#ffd6ea'; g.fillStyle = '#ffd6ea'; g.lineWidth = 2; const ax = 12, ay = ch - 12;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 30, ay); g.moveTo(ax, ay); g.lineTo(ax, ay - 30); g.stroke();
    g.font = '800 10px system-ui'; g.fillText('X', ax + 33, ay + 4); g.fillText('Y', ax - 3, ay - 34);
    // coolant + chips
    const { p, item } = posAt(t);
    const st = item?.seg.state || { spindle: 'off', speed: 0, coolant: false };
    const cutting = playing && item?.seg.kind === 'feed' && p.z < 0 && st.spindle !== 'off';
    if (playing && st.coolant) for (let k = 0; k < 3; k++) drops.push({ x: X(p.x) - 40 + Math.random() * 8, y: Y(p.y) - 40 + Math.random() * 8, vx: 2.4 + Math.random(), vy: 2.4 + Math.random(), life: 22 });
    if (cutting) for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; chips.push({ x: X(p.x), y: Y(p.y), vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3), r: 1.5 + Math.random() * 2, life: 30 + Math.random() * 20, rot: Math.random() * 6 }); }
    drops = drops.filter((d) => d.life-- > 0); chips = chips.filter((c) => c.life-- > 0);
    g.fillStyle = 'rgba(120,190,255,.7)'; for (const d of drops) { d.x += d.vx; d.y += d.vy; g.beginPath(); g.arc(d.x, d.y, 1.6, 0, 7); g.fill(); }
    for (const c of chips) { c.x += c.vx; c.y += c.vy; c.vx *= .94; c.vy *= .94; c.rot += .3; g.strokeStyle = '#e3e7ec'; g.lineWidth = 1.4; g.beginPath(); g.arc(c.x, c.y, c.r, c.rot, c.rot + 4); g.stroke(); }
    // tool seen from above: shadow distance shows height
    const r = Math.max(5, tw / 2), lift = Math.max(0, Math.min(25, p.z));
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(X(p.x) + 3 + lift * 1.1, Y(p.y) + 3 + lift * 1.1, r + 2, r + 2, 0, 0, 7); g.fill();
    const tg = g.createRadialGradient(X(p.x) - r / 3, Y(p.y) - r / 3, 1, X(p.x), Y(p.y), r + 3);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#8e97a3');
    g.fillStyle = tg; g.beginPath(); g.arc(X(p.x), Y(p.y), r + 3, 0, 7); g.fill();
    g.strokeStyle = p.z < 0 ? '#ff4f9a' : '#6d4fc4'; g.lineWidth = 2; g.stroke();
    if (st.spindle !== 'off' && playing) spin += 0.5;
    g.strokeStyle = '#4b525c'; g.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 2; g.beginPath(); g.moveTo(X(p.x), Y(p.y)); g.lineTo(X(p.x) + Math.cos(a) * (r + 1), Y(p.y) + Math.sin(a) * (r + 1)); g.stroke(); }
    drawSide(p, st, minX, maxX, W);
    updateDro(p, st, item);
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawSide(p, st, minX, maxX, W) {
    const dpr = devicePixelRatio || 1, cw = sideC.clientWidth, ch = 150;
    if (!cw) return;
    sideC.width = cw * dpr; sideC.height = ch * dpr; sideC.style.height = ch + 'px';
    const g = sideC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let minZ = -10, maxZ = 30;
    const pad = 16, sx = (cw - pad * 2) / (maxX - minX), sz = (ch - 72) / (maxZ - minZ);
    const X = (x) => pad + (x - minX) * sx, Z = (z) => ch - 6 - (Math.min(z, maxZ) - minZ) * sz;
    g.fillStyle = '#2a1d33'; g.fillRect(0, 0, cw, ch);
    const al = g.createLinearGradient(0, Z(0), 0, Z(minZ)); al.addColorStop(0, '#e3e7ec'); al.addColorStop(1, '#a9b1bb');
    g.fillStyle = al; g.fillRect(X(0), Z(0), W * sx, Z(-10) - Z(0));
    // grooves in side view
    g.fillStyle = '#2a1d33';
    for (const it of timeline) { if (it.t0 > t) break; if (it.seg.kind !== 'feed') continue; const z = Math.min(it.a.z, it.b.z); if (z < 0) { const x0 = Math.min(it.a.x, it.b.x), x1 = Math.max(it.a.x, it.b.x); g.fillRect(X(x0) - 1.5, Z(0), Math.max(3, (x1 - x0) * sx), Z(z) - Z(0)); } }
    g.strokeStyle = '#ff7eb6'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, Z(0)); g.lineTo(cw, Z(0)); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffd6ea'; g.font = '700 10px system-ui'; g.fillText('Z0 = top of the metal', 8, Z(0) - 4); g.fillText('SIDE VIEW', 8, 12);
    // spindle head, collet, cutter
    const tx = X(p.x), tz = Z(p.z), tw = 7;
    g.fillStyle = '#9aa3ad'; g.fillRect(tx - tw / 2, tz - 22, tw, 22);
    g.strokeStyle = '#5c636d'; g.lineWidth = 1;
    for (let k = 0; k < 5; k++) { const yy = tz - 20 + k * 4 + ((spin * 6) % 4); g.beginPath(); g.moveTo(tx - tw / 2, yy); g.lineTo(tx + tw / 2, yy + 3); g.stroke(); }
    g.fillStyle = '#c6ccd4'; g.fillRect(tx - 6, tz - 30, 12, 8);
    const hg = g.createLinearGradient(tx - 22, 0, tx + 22, 0); hg.addColorStop(0, '#ff9cc7'); hg.addColorStop(1, '#c9a8ff');
    g.fillStyle = hg; roundRect(g, tx - 22, tz - 62, 44, 33, 8); g.fill();
    g.fillStyle = st.spindle !== 'off' ? '#3ce38a' : '#6b6f76'; g.beginPath(); g.arc(tx + 13, tz - 52, 3.5, 0, 7); g.fill();
  }
  function updateDro(p, st, item) {
    const set = (id, v) => { const el = root.querySelector(id); if (el && el.textContent !== v) el.textContent = v; };
    set('#dX', fmt(p.x)); set('#dY', fmt(p.y)); set('#dZ', fmt(p.z));
    set('#dS', st.spindle !== 'off' ? `${st.speed} rpm ${st.spindle === 'cw' ? '↻' : '↺'}` : 'off');
    set('#dF', st.feed ? `${Math.round(st.feed)} mm/min` : '-');
    set('#dC', st.coolant ? 'on 💧' : 'off');
    $('#cnLamp').className = 'lamp ' + (crashed ? 'red' : playing ? 'green' : st.spindle !== 'off' ? 'amber' : '');
    if (item) {
      const ln = item.seg.line, raw = (code.value.split('\n')[ln - 1] || '').trim();
      $('#cnNow').innerHTML = `<b>N${ln}</b> <code>${esc(raw)}</code><span>${esc(result.explain[ln - 1] || '')}</span>`;
      markLine(ln);
    }
  }
  function targetShape() {
    const L = LESSONS[lesson];
    if (L.starter === 'move') return { point: [50, 40] };
    if (L.starter === 'line') return { line: [[10, 10], [60, 10]] };
    const chal = L.starter === 'rect' ? CHALLENGES[0] : L.starter === 'circle' ? CHALLENGES[1] : L.starter === 'holes' ? CHALLENGES[2] : L.starter === 'fix' ? CHALLENGES[3] : CHALLENGES.find((c) => c.id === activeChallenge);
    return chal ? { line: chal.target, holes: chal.holes } : null;
  }

  /* ---------- editor gutter ---------- */
  let curLine = 0;
  function renderGutter() {
    const n = code.value.split('\n').length, errs = new Map();
    for (const m of result.msgs) if (m.level !== 'info') errs.set(m.line, errs.get(m.line) === 'error' ? 'error' : m.level);
    $('#cnGutter').innerHTML = Array.from({ length: n }, (_, i) => `<div class="${i + 1 === curLine ? 'cur ' : ''}${errs.get(i + 1) || ''}">${i + 1}</div>`).join('');
    $('#cnGutter').scrollTop = code.scrollTop;
  }
  function markLine(ln) { if (ln === curLine) return; curLine = ln; renderGutter(); }
  code.addEventListener('scroll', () => { $('#cnGutter').scrollTop = code.scrollTop; });

  /* ---------- messages ---------- */
  function renderMsgs() {
    const order = { error: 0, warn: 1, info: 2 };
    const ms = [...result.msgs].sort((a, b) => order[a.level] - order[b.level] || a.line - b.line);
    $('#cnMsgs').innerHTML = ms.length
      ? ms.map((m) => `<div class="pm ${m.level}" data-line="${m.line}">${m.level === 'error' ? '✖' : m.level === 'warn' ? '⚠' : 'ℹ'} <b>N${m.line}</b> ${esc(m.text)}</div>`).join('')
      : '<div class="pm ok">✔ PROGRAM OK. Press CYCLE START.</div>';
  }
  let cardMsg = { type: '', head: 'Ready.', body: 'Tap a part of the machine, or follow the lesson.' };
  function say(type, head, body) { cardMsg = { type, head, body }; const m = $('#cnSay'); if (m) { m.className = 'csay ' + type; m.innerHTML = `<b>${esc(head)}</b>${esc(body || '')}`; } }

  /* ---------- lesson card ---------- */
  function renderProg() {
    $('#cnProg').innerHTML = LESSONS.map((L, i) => `<button type="button" data-ls="${i}" class="${doneLessons.has(i) ? 'done' : ''} ${i === lesson ? 'cur' : ''}" title="${esc(L.h)}" aria-label="Lesson ${i + 1}: ${esc(L.h)}">${doneLessons.has(i) ? '✓' : i + 1}</button>`).join('');
  }
  let lastAllDone = false;
  function renderCard() {
    const L = LESSONS[lesson], tasks = L.tasks(), all = tasks.every((x) => x[1]);
    $('#cnCard').innerHTML = `
      <div class="stepno">Lesson ${lesson + 1} of ${LESSONS.length}</div>
      <h3 class="step-h">${esc(L.h)}</h3>
      <p>${L.p}</p>
      <ul class="ctasks">${tasks.map(([txt, ok]) => `<li class="${ok ? 'ok' : ''}"><span class="ctick">${ok ? '✓' : ''}</span><span>${esc(txt)}</span></li>`).join('')}</ul>
      <details class="cwhy"><summary>Why this step?</summary><div>${esc(L.why)}</div></details>
      <div class="csay ${cardMsg.type}" id="cnSay"><b>${esc(cardMsg.head)}</b>${esc(cardMsg.body || '')}</div>
      <div class="cbtns">
        <button class="btn small" id="cnHint" type="button">💡 ${hintN < L.hints.length ? 'Hint' : 'Show answer'}</button>
        ${L.starter && STARTERS[L.starter] ? '<button class="btn small" id="cnStarterBtn" type="button">📝 Starter code</button>' : L.starter === 'fix' ? '<button class="btn small" id="cnStarterBtn" type="button">🐞 Load broken program</button>' : ''}
        <button class="btn small primary" id="cnNext" type="button" ${all ? '' : 'disabled'}>${lesson + 1 < LESSONS.length ? 'Next lesson →' : 'Finish 🎓'}</button>
      </div>
      <div class="dro" data-part="dro">
        <div><small>X</small><strong id="dX">0.00</strong></div><div><small>Y</small><strong id="dY">0.00</strong></div><div><small>Z</small><strong id="dZ">25.00</strong></div>
        <div><small>Spindle</small><strong id="dS">off</strong></div><div><small>Feed</small><strong id="dF">-</strong></div><div><small>Coolant</small><strong id="dC">off</strong></div>
      </div>`;
    { const { p, item } = posAt(t); updateDro(p, item?.seg.state || { spindle: 'off' }, item); }
    if (all && !doneLessons.has(lesson)) {
      doneLessons.add(lesson); store.set('cn.done', [...doneLessons]);
      award?.(15, `lesson ${lesson + 1} done`);
      if (lesson >= 1) badge?.('gcode-first');
      if (doneLessons.size === LESSONS.length) badge?.('gcode-queen');
      say('ok', 'Lesson complete! ✨', ' Press Next lesson when you are ready.');
      renderCard(); renderProg(); return;
    }
    if (all && !lastAllDone) say('ok', 'All done here! ✨', ' Press Next lesson when you are ready.');
    lastAllDone = all;
    $('#cnHint').onclick = () => {
      if (hintN < L.hints.length) { say('', `Hint ${hintN + 1}:`, ' ' + L.hints[hintN]); hintN++; renderCard(); return; }
      if (L.starter && SOLUTIONS[L.starter]) { loadCode(SOLUTIONS[L.starter]); say('warn', 'Answer loaded.', ' Read each line in the control panel (it explains them as they run), then press CYCLE START.'); }
      else say('', 'Hint:', ' ' + L.hints.at(-1));
    };
    $('#cnStarterBtn')?.addEventListener('click', () => {
      if (L.starter === 'fix') { loadCode(EXAMPLES['Broken program 🐞 (fix me)']); say('warn', 'Broken program loaded.', ' Read the red and yellow messages in the control panel. Each one names a line.'); }
      else { loadCode(STARTERS[L.starter]); say('', 'Starter loaded.', ' Fill in the lines marked YOUR TURN, then press CYCLE START.'); }
    });
    $('#cnNext').onclick = () => { if (lesson + 1 < LESSONS.length) { lesson++; store.set('cn.lesson', lesson); hintN = 0; lastAllDone = false; say('', 'New lesson!', ' Read the card, then load the starter code.'); renderProg(); renderCard(); draw(); } else { say('ok', 'You graduated! 🎓', ' Try the free-play challenges below, or ask Gigi for harder exercises.'); } };
  }
  $('#cnProg').addEventListener('click', (e) => { const b = e.target.closest('[data-ls]'); if (!b) return; lesson = +b.dataset.ls; store.set('cn.lesson', lesson); hintN = 0; lastAllDone = false; say('', 'Ready.', ''); renderProg(); renderCard(); draw(); });

  /* ---------- tapping parts ---------- */
  function tapPart(k) {
    if (!PARTS[k]) return;
    seen.add(k); store.set('cn.seen', [...seen]);
    say('ok', PARTS[k][0] + '.', ' ' + PARTS[k][1]);
    renderCard();
  }
  topC.addEventListener('click', (e) => {
    if (!view) return;
    const r = topC.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const wx = view.minX + (px - view.ox) / view.sc, wy = view.minY + (view.ch - view.oy - py) / view.sc;
    const { p } = posAt(t);
    if (Math.hypot(wx - p.x, wy - p.y) * view.sc < Math.max(14, view.toolD * view.sc / 2 + 8)) tapPart('tool');
    else if (Math.hypot(wx, wy) * view.sc < 18) tapPart('origin');
    else if (wx >= 0 && wx <= view.W && wy >= 0 && wy <= view.H) tapPart('stock');
    else if (wx > -7 && wx < view.W + 7 && (wy < 0 || wy > view.H)) tapPart('vise');
  });
  sideC.addEventListener('click', () => tapPart('tool'));
  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-part]');
    if (!d || e.target.closest('button,select,textarea,input,summary')) return;
    tapPart(d.dataset.part);
  });
  code.addEventListener('focus', () => { if (!seen.has('panel')) tapPart('panel'); });

  /* ---------- running ---------- */
  let parseT;
  function reparse() {
    result = interpret(code.value);
    store.set('gc.code', code.value);
    buildTimeline();
    t = Math.min(t, total);
    renderMsgs(); renderGutter(); renderCard(); draw();
  }
  function loadCode(txt) { code.value = txt; stop(); t = 0; ranToEnd = false; crashed = null; $('#cnCrash').classList.add('hidden'); reparse(); }
  code.addEventListener('input', () => { clearTimeout(parseT); parseT = setTimeout(() => { stop(); t = 0; ranToEnd = false; crashed = null; $('#cnCrash').classList.add('hidden'); reparse(); }, 350); });
  function stop() { playing = false; }
  function crash(it) {
    playing = false; crashed = it.crash;
    const box = $('#cnCrash');
    box.innerHTML = it.crash === 'rapid' ? '💥 CRASH!<small>Rapid move inside the metal</small>' : '💥 SNAP!<small>Cut with the spindle off</small>';
    box.classList.remove('hidden');
    $('#cnFrame').classList.remove('shake'); void $('#cnFrame').offsetWidth; $('#cnFrame').classList.add('shake');
    if (it.crash === 'rapid') say('bad', `Crash on line N${it.seg.line}!`, ' G00 is a rapid travel move. It must never happen with the tool inside the metal (Z below 0). Lift with G00 Z5 first, or use G01 to cut.');
    else say('bad', `The cutter snapped on line N${it.seg.line}!`, ' The spindle was not spinning. Start it with S1200 M03 before cutting into the metal.');
  }
  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(0.1, (ts - (lastTs || ts)) / 1000); lastTs = ts;
    const mult = Math.pow(10, (+$('#cnSpeed').value - 20) / 40);
    const before = t;
    t = Math.min(total, t + dt * mult * 6);
    const hit = timeline.find((it) => it.crash && it.t0 >= before - 1e-9 && it.t0 <= t);
    if (hit) { t = hit.t0 + Math.min(0.3, (hit.t1 - hit.t0) * 0.4); draw(); crash(hit); return; }
    if (stopAtLine != null) { const nxt = timeline.find((it) => it.t0 >= t - 1e-9 && it.seg.line > stopAtLine); if (!nxt || t >= nxt.t0) { t = nxt ? nxt.t0 : total; playing = false; stopAtLine = null; draw(); return; } }
    draw();
    if (t >= total) { playing = false; ranToEnd = true; draw(); award?.(3, 'program ran'); say(noWarn() ? 'ok' : 'warn', noWarn() ? 'Program finished. ✔' : 'Finished, with warnings.', noWarn() ? ' Check the lesson card.' : ' Read the yellow messages in the control panel.'); renderCard(); return; }
    requestAnimationFrame(loop);
  }
  function start() {
    if (result.msgs.some((m) => m.level === 'error')) { say('bad', 'The control refused to start.', ' Fix the ✖ errors in the control panel first. Tap one to jump to its line.'); return; }
    if (crashed) { crashed = null; $('#cnCrash').classList.add('hidden'); t = 0; }
    if (t >= total) { t = 0; chips = []; }
    playing = true; lastTs = 0;
    requestAnimationFrame(loop);
  }
  $('#cnStart').onclick = () => { stopAtLine = null; start(); };
  $('#cnHold').onclick = () => { if (playing) { playing = false; say('', 'Feed hold.', ' Motion paused. Press CYCLE START to continue.'); draw(); } };
  $('#cnBlock').onclick = () => {
    if (playing) return;
    if (result.msgs.some((m) => m.level === 'error')) { say('bad', 'Fix the errors first.', ''); return; }
    if (crashed) { crashed = null; $('#cnCrash').classList.add('hidden'); t = 0; }
    if (t >= total) t = 0;
    const cur = posAt(t).item;
    stopAtLine = t === 0 ? 0 : cur?.seg.line ?? 0;
    start();
  };
  $('#cnReset').onclick = () => { playing = false; stopAtLine = null; t = 0; crashed = null; chips = []; drops = []; $('#cnCrash').classList.add('hidden'); curLine = 0; renderGutter(); $('#cnNow').textContent = 'RESET. Press CYCLE START.'; say('', 'Reset.', ' The program is back at the top.'); draw(); };
  $('#cnSpeed').addEventListener('input', () => { $('#cnSpeedV').textContent = Math.round(Math.pow(10, (+$('#cnSpeed').value - 20) / 40) * 100) + '%'; });
  $('#cnSpeed').dispatchEvent(new Event('input'));
  $('#cnPath').onclick = () => { showPath = !showPath; $('#cnPath').textContent = 'toolpath: ' + (showPath ? 'on' : 'off'); draw(); };
  $('#cnMsgs').addEventListener('click', (e) => {
    const l = +e.target.closest('[data-line]')?.dataset.line; if (!l) return;
    const lines = code.value.split('\n'), s0 = lines.slice(0, l - 1).join('\n').length + (l > 1 ? 1 : 0);
    code.focus(); code.setSelectionRange(s0, s0 + (lines[l - 1] || '').length);
  });
  $('#cnExample').addEventListener('change', (e) => { if (!e.target.value) return; loadCode(EXAMPLES[e.target.value]); e.target.value = ''; });
  ['#cnW', '#cnH', '#cnTool'].forEach((s) => $(s).addEventListener('input', draw));

  /* ---------- free play + cheat sheet ---------- */
  function renderChallenges() {
    const done = new Set(store.get('gc.done', []));
    $('#gcChallenges').innerHTML = CHALLENGES.map((c) => `
      <div class="chal ${activeChallenge === c.id ? 'active' : ''}">
        <div><b>${done.has(c.id) ? '🏅' : '🎯'} ${esc(c.title)}</b><div class="small muted">${esc(c.desc)}</div></div>
        <div class="row">${activeChallenge === c.id ? `<button class="btn small primary" data-check="${c.id}" type="button">Check ✓</button>` : `<button class="btn small" data-start="${c.id}" type="button">${done.has(c.id) ? 'Again' : 'Try'}</button>`}</div>
      </div>`).join('') + '<div id="gcVerdict" class="small"></div>';
  }
  $('#gcChallenges').addEventListener('click', (e) => {
    const s = e.target.closest('[data-start]')?.dataset.start, c = e.target.closest('[data-check]')?.dataset.check;
    if (s) { activeChallenge = s; store.set('gc.challenge', s); if (s === 'fix') loadCode(EXAMPLES['Broken program 🐞 (fix me)']); renderChallenges(); draw(); topC.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (c) {
      const ch = CHALLENGES.find((x) => x.id === c), v = checkChallenge(ch, result);
      if (v.pass) {
        const done = new Set(store.get('gc.done', [])); const fresh = !done.has(c); done.add(c); store.set('gc.done', [...done]);
        renderChallenges(); $('#gcVerdict').innerHTML = '<div class="verdict pass">🎉 Challenge complete! You just wrote a working CNC program.</div>';
        if (fresh) { award?.(20, 'CNC challenge'); badge?.('gcode-challenge'); }
      } else $('#gcVerdict').innerHTML = `<div class="verdict">Not yet: ${esc(v.why)}</div>`;
    }
  });
  function renderRef(q = '') {
    q = q.toLowerCase();
    const rows = Object.entries(CODE_INFO).filter(([k, [n, d]]) => !q || (k + ' ' + n + ' ' + d).toLowerCase().includes(q));
    const letters = Object.entries(LETTER_INFO).filter(([k, d]) => !q || (k + ' ' + d).toLowerCase().includes(q));
    $('#gcRef').innerHTML = rows.map(([k, [n, d]]) => `<div class="ref-row"><code>${k}</code><div><b>${esc(n)}</b>${d ? `<div class="small muted">${esc(d)}</div>` : ''}</div></div>`).join('')
      + (letters.length ? '<h4>Letters</h4>' + letters.map(([k, d]) => `<div class="ref-row"><code>${k}</code><div class="small">${esc(d)}</div></div>`).join('') : '');
  }
  $('#gcSearch').addEventListener('input', (e) => renderRef(e.target.value));

  /* ---------- Gigi ---------- */
  tutor?.($('#gcTutor'), {
    key: 'gcode', title: 'CNC milling workshop', courseMatch: /automation/i,
    intro: "Hi! I'm **Gigi**, your CNC tutor ⚙️💗 I can see your program, the machine's messages and which lesson you're on. Stuck? Tap **✅ Check my work** or ask me anything, like *why do I need F?*",
    starters: [
      ['✅ Check my work', 'Check my current program against the lesson I am on. Tell me what is right, what is wrong, and what to change. Give hints first, not the full answer.'],
      ['🐣 Explain this lesson simply', 'Explain the idea of the lesson I am on in the simplest way, with an everyday analogy, then tell me exactly what to type.'],
      ['🔍 Explain my code', 'Explain my current program line by line in a table (line | code | what it does in plain English), then tell me what the part will look like.'],
      ['🐞 Why did it crash?', 'Look at the simulator messages and any crash. Explain each problem simply: what it means, why it would be dangerous on a real machine, and how to fix it.'],
      ['🎯 Extra exercise', 'Give me one extra practice exercise for the lesson I am on, a bit different from the card.'],
      ['📝 Exam question', 'Give me one exam-style question on G-codes and M-codes like a Nigerian university test would ask, wait for my answer, then mark it.'],
    ],
    getContext: () => {
      const L = LESSONS[lesson], msgs = result.msgs.map((m) => `- line ${m.line} ${m.level}: ${m.text}`).join('\n') || '- none (program is valid)';
      return `Lesson ${lesson + 1}/${LESSONS.length}: "${L.h}". Card says: ${L.p.replace(/<[^>]+>/g, '')}\nLesson tasks: ${L.tasks().map(([x, ok]) => `${ok ? '[done]' : '[todo]'} ${x}`).join('; ')}\nEditor contents:\n\`\`\`gcode\n${code.value}\n\`\`\`\nSimulator messages:\n${msgs}\nRan to the end: ${ranToEnd}. Crash during last run: ${crashed || 'none'}. Moves: ${result.segs.length} segments, ${result.holes.length} holes.`;
    },
    onCode: (txt) => { loadCode(txt); topC.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  });

  const ro = new ResizeObserver(() => draw());
  ro.observe(topC);
  renderRef(); renderChallenges(); renderProg(); buildTimeline(); renderMsgs(); renderGutter(); renderCard(); draw();
  return { destroy() { playing = false; ro.disconnect(); } };
}
