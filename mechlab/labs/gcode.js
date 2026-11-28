// CNC G-code Studio: a small G-code interpreter + 2D/side-view milling simulator.
// Supports the codes taught in a typical intro CNC course (Fanuc-style milling).

/* ============ reference data ============ */
export const CODE_INFO = {
  G00: ['Rapid move', 'Moves as fast as possible, NOT cutting. Like walking to the kitchen: you just get there.'],
  G01: ['Straight-line cut', 'Cuts in a straight line at feed rate F. Like drawing a line with a ruler, at a steady speed.'],
  G02: ['Clockwise arc', 'Cuts a curve going clockwise (looking down on the part). Needs I/J (centre offset) or R (radius).'],
  G03: ['Anticlockwise arc', 'Same as G02 but counter-clockwise.'],
  G04: ['Dwell (pause)', 'Waits for P seconds, e.g. to let a drill clean the bottom of a hole.'],
  G17: ['XY plane', 'Arcs are drawn on the XY plane (the normal top view). Default for milling.'],
  G18: ['XZ plane', 'Arcs on the XZ plane (not simulated here).'],
  G19: ['YZ plane', 'Arcs on the YZ plane (not simulated here).'],
  G20: ['Inch units', 'All numbers after this are inches.'],
  G21: ['Millimetre units', 'All numbers after this are millimetres.'],
  G28: ['Return home', 'Sends the machine back to its home/reference position.'],
  G40: ['Cutter comp OFF', 'Tool centre follows the path exactly.'],
  G41: ['Cutter comp LEFT', 'Offsets the tool to the left of the path by its radius (not simulated here: the tool centre follows the path).'],
  G42: ['Cutter comp RIGHT', 'Offsets the tool to the right of the path (not simulated here).'],
  G43: ['Tool length comp', 'Applies the tool length offset H (accepted, no effect in this sim).'],
  G49: ['Cancel tool length comp', ''],
  G54: ['Work offset 1', 'Uses work coordinate system 1, i.e. where X0 Y0 Z0 sits on the part.'],
  G80: ['Cancel canned cycle', 'Stops the drilling cycle so later XY moves are normal moves again.'],
  G81: ['Drilling cycle', 'At each X Y: rapid to R, drill down to Z, rapid back up. One line = one hole.'],
  G82: ['Drill with dwell', 'Like G81 but pauses P seconds at the bottom (counterbores, spot faces).'],
  G83: ['Peck drilling', 'Drills Q mm at a time, backing out to clear chips. For deep holes.'],
  G90: ['Absolute mode', 'Coordinates are positions from the origin. Like a house address: "go to number 20".'],
  G91: ['Incremental mode', 'Coordinates are distances from where you are now. Like directions: "walk 20 more steps".'],
  G94: ['Feed per minute', 'F is in mm/min (default).'],
  G98: ['Return to initial plane', 'After each drilled hole, go back up to where you started.'],
  G99: ['Return to R plane', 'After each hole, only go back up to R (faster).'],
  M00: ['Program stop', 'Pauses until the operator presses cycle start.'],
  M01: ['Optional stop', 'Pauses only if the operator turned on "optional stop".'],
  M02: ['Program end', 'Ends the program.'],
  M03: ['Spindle ON clockwise', 'Starts the cutter spinning (normal cutting direction). Needs a speed S.'],
  M04: ['Spindle ON anticlockwise', 'Spins the other way (e.g. left-hand taps).'],
  M05: ['Spindle STOP', 'Stops the cutter spinning.'],
  M06: ['Tool change', 'Swaps in tool number T.'],
  M08: ['Coolant ON', 'Sprays coolant to cool the tool and wash away chips.'],
  M09: ['Coolant OFF', ''],
  M30: ['Program end & rewind', 'Ends the program, stops everything, goes back to the top, ready for the next part.'],
};
export const LETTER_INFO = {
  N: 'Line number (just a label)', X: 'X position', Y: 'Y position', Z: 'Z height (0 = top of the material, negative = inside it)',
  I: 'Arc centre X distance from the start point', J: 'Arc centre Y distance from the start point', K: 'Arc centre Z distance',
  R: 'Radius (for arcs) or retract plane (for drilling cycles)', F: 'Feed rate: cutting speed in mm/min', S: 'Spindle speed in RPM',
  T: 'Tool number', P: 'Dwell time in seconds', Q: 'Peck depth for G83', H: 'Tool length offset number', D: 'Cutter radius offset number',
};

export const EXAMPLES = {
  'Hello square 💗': `%
O0001 (HELLO SQUARE)
G21 G90 G17      (mm, absolute, XY plane)
T1 M06           (load tool 1)
S1200 M03        (spindle on, 1200 RPM)
G00 Z5           (lift to a safe height)
G00 X10 Y10      (rapid to the start corner)
G01 Z-2 F100     (plunge 2 mm into the material)
G01 X60 F250     (cut along the bottom edge)
Y50              (cut up: G01 is still active)
X10              (cut along the top)
Y10              (back to the start)
G00 Z5           (lift out)
M05              (spindle off)
G28              (go home)
M30              (end of program)
%`,
  'Heart with arcs 🎀': `(HEART: two G02 arcs + two lines)
G21 G90 G17
T1 M06
S1500 M03
G00 Z5
G00 X50 Y15          (bottom tip of the heart)
G01 Z-1.5 F80
G01 X25 Y50 F200     (left side)
G02 X50 Y50 I12.5 J0 (left bump, clockwise)
G02 X75 Y50 I12.5 J0 (right bump, clockwise)
G01 X50 Y15          (right side back to the tip)
G00 Z5
M05
M30`,
  'Drilling cycle (G81)': `(FOUR HOLES WITH A CANNED CYCLE)
G21 G90 G17
T2 M06 (5 mm drill)
S900 M03
M08              (coolant on)
G00 Z10
G98 G81 X20 Y20 Z-8 R2 F80   (first hole)
X80              (second hole: same cycle)
Y60              (third)
X20              (fourth)
G80              (cancel the cycle)
M09
M05
G28
M30`,
  'Incremental (G91) steps': `(STAIRCASE USING G91)
G21 G90
S1000 M03
G00 Z5
G00 X10 Y10
G01 Z-1 F100
G91              (switch to incremental)
G01 X15 F250     (move 15 to the right)
Y10              (10 up)
X15
Y10
X15
Y10
G90              (back to absolute!)
G00 Z5
M05
M30`,
  'Broken program 🐞 (fix me)': `(THIS PROGRAM HAS 3 BUGS. CAN YOU FIX THEM?)
G21 G90
G00 Z5
G00 X20 Y10
G01 Z-2
G01 X70 F200
G01 X45 Y50
G00 X20 Y10 Z-2
G00 Z5
M30`,
};

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const circle = (cx, cy, r) => Array.from({ length: 73 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 36), cy + r * Math.sin(i * Math.PI / 36)]);
export const CHALLENGES = [
  { id: 'rect', title: 'Cut a 40 × 30 rectangle', desc: 'Corner at X10 Y10, opposite corner at X50 Y40, at least 1 mm deep. End with M30.', target: rect(10, 10, 50, 40) },
  { id: 'circle', title: 'Cut a circle', desc: 'Centre X50 Y40, radius 15, at least 1 mm deep. Hint: start at X65 Y40 and use one G02 with I-15 J0.', target: circle(50, 40, 15) },
  { id: 'holes', title: 'Drill 4 holes', desc: 'Holes at (20,20), (80,20), (80,60), (20,60), each at least 5 mm deep. Hint: G81.', holes: [[20, 20], [80, 20], [80, 60], [20, 60]], holeDepth: -5 },
  { id: 'fix', title: 'Fix the broken program', desc: 'Load "Broken program 🐞", then fix it until it cuts the triangle (20,10) → (70,10) → (45,50) → back, with zero errors and warnings.', target: [[20, 10], [70, 10], [45, 50], [20, 10]], strict: true },
];

/* ============ interpreter ============ */
const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

export function interpret(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const msgs = [];          // {line, level: 'error'|'warn'|'info', text}
  const segs = [];          // {kind, pts:[{x,y,z}], line, feed, state}
  const holes = [];
  const explain = [];       // per line plain-English
  const st = { x: 0, y: 0, z: 25, units: 'mm', abs: true, motion: null, feed: null, speed: 0, spindle: 'off', coolant: false, tool: null, pendingTool: null, plane: 17, cycle: null, cycR: null, cycZ: null, cycQ: null, retInit: true, ended: false };
  const SAFE_Z = 25;
  const add = (line, level, text) => msgs.push({ line, level, text });
  const snapshot = () => ({ spindle: st.spindle, speed: st.speed, coolant: st.coolant, tool: st.tool, feed: st.feed, units: st.units, abs: st.abs });
  const pushSeg = (kind, pts, line, feed) => segs.push({ kind, pts, line, feed, state: snapshot() });

  lines.forEach((raw, i) => {
    const ln = i + 1;
    let s = raw.replace(/\([^)]*\)/g, ' ').replace(/;.*/, '').toUpperCase().trim();
    const comment = (raw.match(/\(([^)]*)\)/) || raw.match(/;(.*)/) || [])[1];
    if (!s || s === '%') { explain[i] = comment ? `💬 Comment: "${comment.trim()}"` : (s === '%' ? 'Start/end of tape marker (%)' : ''); return; }
    if (/^O\d+/.test(s)) { explain[i] = `📛 Program number ${s.match(/^O\d+/)[0]}${comment ? ` (${comment.trim()})` : ''}`; s = s.replace(/^O\d+/, '').trim(); if (!s) return; }
    if (st.ended) { add(ln, 'warn', 'This line comes after the program already ended (M30/M02), so the machine ignores it.'); explain[i] = 'Ignored: after program end'; return; }
    const words = [];
    const leftover = s.replace(/([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g, (m, L, v) => { words.push([L, parseFloat(v), v]); return ''; }).replace(/\s+/g, '');
    if (leftover) add(ln, 'error', `I can't read "${leftover}". Every word is a letter followed by a number, like G01 or X25.5.`);
    const G = [], M = [], V = {};
    for (const [L, v, rawV] of words) {
      if (L === 'G') G.push(Math.round(v * 10) / 10);
      else if (L === 'M') M.push(Math.round(v));
      else {
        if (V[L] !== undefined) add(ln, 'error', `${L} appears twice on one line.`);
        V[L] = v;
        if ('XYZIJKR'.includes(L) && !rawV.includes('.') && Math.abs(v) >= 1000) add(ln, 'warn', `${L}${rawV} has no decimal point. Some real controllers read "X1000" as 1.000 mm. Write it as ${L}${rawV}.0 to be safe.`);
      }
    }
    const sc = st.units === 'in' ? 25.4 : 1;
    const parts = [];

    // --- settings first (like a real controller) ---
    for (const g of G) {
      if (g === 20) { st.units = 'in'; parts.push('units = inches'); }
      else if (g === 21) { st.units = 'mm'; parts.push('units = millimetres'); }
      else if (g === 90) { st.abs = true; parts.push('absolute coordinates'); }
      else if (g === 91) { st.abs = false; parts.push('incremental coordinates'); }
      else if (g === 17) { st.plane = 17; parts.push('XY plane'); }
      else if (g === 18 || g === 19) { st.plane = g; add(ln, 'warn', `G${g} changes the arc plane; this simulator only draws XY (G17) arcs.`); }
      else if ([40, 41, 42, 43, 49, 94, 54, 55, 56, 57, 58, 59].includes(g)) { parts.push(CODE_INFO['G' + String(g).padStart(2, '0')]?.[0] || `G${g}`); if (g === 41 || g === 42) add(ln, 'info', 'Cutter compensation is accepted but not simulated: the drawing shows the tool centre.'); }
      else if (g === 98) { st.retInit = true; parts.push('drill cycles return to the initial height'); }
      else if (g === 99) { st.retInit = false; parts.push('drill cycles return to R'); }
      else if (g === 80) { st.cycle = null; parts.push('cancel drilling cycle'); }
      else if (![0, 1, 2, 3, 4, 28, 81, 82, 83].includes(g)) add(ln, 'warn', `G${g} isn't supported in this simulator (or it's a typo).`);
    }
    if (V.F !== undefined) { if (V.F <= 0) add(ln, 'error', 'Feed rate F must be more than 0.'); st.feed = V.F * sc; parts.push(`feed ${fmt(V.F)} ${st.units}/min`); }
    if (V.S !== undefined) { st.speed = V.S; parts.push(`spindle speed ${fmt(V.S)} RPM`); }
    if (V.T !== undefined) { st.pendingTool = V.T; parts.push(`select tool ${V.T}`); }
    for (const m of M) {
      if (m === 6) { if (st.pendingTool == null) add(ln, 'error', 'M06 (tool change) needs a tool number, e.g. T1 M06.'); st.tool = st.pendingTool; if (st.spindle !== 'off') add(ln, 'warn', 'Changing tools while the spindle is spinning! Real machines stop it first (M05).'); parts.push(`change to tool ${st.tool}`); }
      else if (m === 3 || m === 4) { st.spindle = m === 3 ? 'cw' : 'ccw'; if (!st.speed) add(ln, 'warn', 'Spindle started with no speed. Add S, e.g. S1200 M03.'); parts.push(`spindle ON ${m === 3 ? 'clockwise' : 'anticlockwise'}`); }
      else if (m === 5) { st.spindle = 'off'; parts.push('spindle STOP'); }
      else if (m === 8) { st.coolant = true; parts.push('coolant ON'); }
      else if (m === 9) { st.coolant = false; parts.push('coolant OFF'); }
      else if (m === 0 || m === 1) parts.push(m === 0 ? 'program stop (pause)' : 'optional stop');
      else if (m === 2 || m === 30) { /* handled after motion */ }
      else add(ln, 'warn', `M${m} isn't supported in this simulator (or it's a typo).`);
    }

    // --- motion ---
    const has = (L) => V[L] !== undefined;
    const tgt = () => ({
      x: has('X') ? (st.abs ? V.X * sc : st.x + V.X * sc) : st.x,
      y: has('Y') ? (st.abs ? V.Y * sc : st.y + V.Y * sc) : st.y,
      z: has('Z') ? (st.abs ? V.Z * sc : st.z + V.Z * sc) : st.z,
    });
    const motionG = G.find((g) => [0, 1, 2, 3, 81, 82, 83].includes(g));
    if (motionG !== undefined) {
      if (motionG >= 81) {
        st.cycle = motionG;
        st.cycStartZ = st.z;
        if (has('R')) st.cycR = st.abs ? V.R * sc : st.z + V.R * sc;
        if (has('Z')) st.cycZ = st.abs ? V.Z * sc : (st.cycR ?? st.z) + V.Z * sc;
        if (has('Q')) st.cycQ = V.Q * sc;
      } else { st.motion = motionG; st.cycle = null; }
    }
    if (G.includes(4)) { parts.push(`pause ${V.P ?? 0} s`); }
    else if (G.includes(28)) {
      const pts = [{ x: st.x, y: st.y, z: st.z }];
      if (has('X') || has('Y') || has('Z')) { const t = tgt(); pts.push(t); }
      pts.push({ x: pts.at(-1).x, y: pts.at(-1).y, z: SAFE_Z }, { x: 0, y: 0, z: SAFE_Z });
      pushSeg('rapid', pts, ln);
      Object.assign(st, { x: 0, y: 0, z: SAFE_Z });
      parts.push('return to machine home (lift up, then go to X0 Y0)');
    } else if (st.cycle && (has('X') || has('Y'))) {
      // canned drilling cycle: one hole per line
      if (st.cycR == null || st.cycZ == null) add(ln, 'error', `The drilling cycle needs both R (where to start drilling) and Z (how deep). Example: G81 X20 Y20 Z-8 R2 F80`);
      else {
        if (st.spindle === 'off') add(ln, 'warn', 'Drilling with the spindle OFF. The drill would snap! Add M03 first.');
        if (!st.feed) add(ln, 'error', 'Drilling needs a feed rate F.');
        const t = tgt();
        const top = Math.max(st.z, st.cycR);
        pushSeg('rapid', [{ x: st.x, y: st.y, z: st.z }, { x: st.x, y: st.y, z: top }, { x: t.x, y: t.y, z: top }, { x: t.x, y: t.y, z: st.cycR }], ln);
        if (st.cycle === 83 && st.cycQ > 0) {
          let d = st.cycR;
          while (d > st.cycZ) {
            const nd = Math.max(st.cycZ, d - st.cycQ);
            pushSeg('feed', [{ x: t.x, y: t.y, z: d }, { x: t.x, y: t.y, z: nd }], ln, st.feed);
            pushSeg('rapid', [{ x: t.x, y: t.y, z: nd }, { x: t.x, y: t.y, z: st.cycR }, { x: t.x, y: t.y, z: Math.min(nd + 0.5, st.cycR) }], ln);
            d = nd;
          }
        } else pushSeg('feed', [{ x: t.x, y: t.y, z: st.cycR }, { x: t.x, y: t.y, z: st.cycZ }], ln, st.feed);
        const back = st.retInit ? top : st.cycR;
        pushSeg('rapid', [{ x: t.x, y: t.y, z: st.cycZ }, { x: t.x, y: t.y, z: back }], ln);
        holes.push({ x: t.x, y: t.y, z: st.cycZ });
        Object.assign(st, { x: t.x, y: t.y, z: back });
        parts.push(`drill a hole at X${fmt(t.x)} Y${fmt(t.y)} down to Z${fmt(st.cycZ)}`);
      }
    } else if (has('X') || has('Y') || has('Z')) {
      const t = tgt();
      const from = { x: st.x, y: st.y, z: st.z };
      const m = st.motion;
      if (m == null) add(ln, 'error', 'Coordinates given but no move type yet. Start with G00 (rapid) or G01 (cut).');
      else if (m === 0) {
        if (t.z < 0 || (from.z < 0 && (t.x !== from.x || t.y !== from.y))) add(ln, 'warn', 'Rapid move (G00) inside the material: that is a crash! Lift Z above 0 first, or use G01 to cut.');
        pushSeg('rapid', [from, t], ln);
        parts.push(`rapid to X${fmt(t.x)} Y${fmt(t.y)} Z${fmt(t.z)}`);
      } else if (m === 1) {
        if (!st.feed) add(ln, 'error', 'G01 needs a feed rate. Add F (e.g. F150) so the machine knows how fast to cut.');
        if (st.spindle === 'off' && (t.z < 0 || from.z < 0)) add(ln, 'warn', 'Cutting with the spindle OFF. The tool would just rub and break. Add S1200 M03 before cutting.');
        pushSeg('feed', [from, t], ln, st.feed);
        parts.push(`cut in a straight line to X${fmt(t.x)} Y${fmt(t.y)} Z${fmt(t.z)}`);
      } else {
        const cw = m === 2;
        if (!st.feed) add(ln, 'error', `G0${m} needs a feed rate F.`);
        if (st.spindle === 'off' && (t.z < 0 || from.z < 0)) add(ln, 'warn', 'Cutting an arc with the spindle OFF. Add M03 before cutting.');
        if (st.plane !== 17) add(ln, 'warn', 'Arc drawn on XY anyway (only G17 is simulated).');
        let cx, cy, ok = true;
        if (has('I') || has('J')) {
          cx = from.x + (V.I ?? 0) * sc; cy = from.y + (V.J ?? 0) * sc;
          const r0 = Math.hypot(from.x - cx, from.y - cy), r1 = Math.hypot(t.x - cx, t.y - cy);
          if (r0 < 1e-6) { add(ln, 'error', 'I and J put the arc centre exactly on the start point (radius 0).'); ok = false; }
          else if (Math.abs(r0 - r1) > 0.05 * sc + 0.01) { add(ln, 'error', `The end point isn't on the circle: start is ${fmt(r0)} from the centre but the end is ${fmt(r1)} away. Check I/J (they're measured from the START point).`); ok = false; }
        } else if (has('R')) {
          const R = V.R * sc, dx = t.x - from.x, dy = t.y - from.y, d = Math.hypot(dx, dy);
          if (d < 1e-6) { add(ln, 'error', 'R can\'t draw a full circle (start = end). Use I/J instead.'); ok = false; }
          else if (Math.abs(R) < d / 2 - 1e-6) { add(ln, 'error', `Radius ${fmt(Math.abs(R))} is too small to reach a point ${fmt(d)} away. R must be at least ${fmt(d / 2)}.`); ok = false; }
          else {
            const h = Math.sqrt(Math.max(0, R * R - (d / 2) ** 2));
            const sign = (cw ? -1 : 1) * (R < 0 ? -1 : 1);
            cx = (from.x + t.x) / 2 + sign * h * (-dy / d); cy = (from.y + t.y) / 2 + sign * h * (dx / d);
          }
        } else { add(ln, 'error', `G0${m} needs either I/J (centre offset) or R (radius).`); ok = false; }
        if (ok) {
          const r = Math.hypot(from.x - cx, from.y - cy);
          const a0 = Math.atan2(from.y - cy, from.x - cx), a1 = Math.atan2(t.y - cy, t.x - cx);
          let sweep = cw ? a0 - a1 : a1 - a0;
          while (sweep <= 1e-9) sweep += 2 * Math.PI;
          if (Math.hypot(t.x - from.x, t.y - from.y) < 1e-6) sweep = 2 * Math.PI;
          const n = Math.max(8, Math.ceil(sweep * r / 0.5));
          const pts = [];
          for (let k = 0; k <= n; k++) {
            const a = a0 + (cw ? -1 : 1) * sweep * k / n;
            pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), z: from.z + (t.z - from.z) * k / n });
          }
          pts[n] = { ...t };
          pushSeg('feed', pts, ln, st.feed);
          parts.push(`cut a ${cw ? 'clockwise' : 'anticlockwise'} arc to X${fmt(t.x)} Y${fmt(t.y)} around centre (${fmt(cx)}, ${fmt(cy)}), radius ${fmt(r)}`);
        }
      }
      Object.assign(st, t);
    } else if (motionG !== undefined && motionG < 81) {
      parts.push(`${CODE_INFO['G0' + motionG][0]} mode (no move on this line)`);
    }
    if (M.includes(2) || M.includes(30)) { st.ended = true; st.spindle = 'off'; st.coolant = false; parts.push(M.includes(30) ? 'END of program (and rewind)' : 'END of program'); }
    explain[i] = parts.length ? '➡️ ' + parts.join(', ') : '';
  });

  if (!st.ended) add(lines.length, 'info', 'Programs normally finish with M30 (or M02).');
  if (!segs.length) add(1, 'info', 'No moves yet. Try loading an example.');
  return { segs, msgs, holes, explain, endState: st };
}

/* ============ challenge checking ============ */
function sampleTarget(poly, step = 1) {
  const out = [];
  for (let i = 1; i < poly.length; i++) {
    const [x0, y0] = poly[i - 1], [x1, y1] = poly[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}
function cutPoints(segs) {
  const out = [];
  for (const s of segs) {
    if (s.kind !== 'feed') continue;
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1], b = s.pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
      for (let k = 0; k <= n; k++) {
        const z = a.z + (b.z - a.z) * k / n;
        if (z < 0) out.push([a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n, z]);
      }
    }
  }
  return out;
}
export function checkChallenge(ch, result) {
  const errs = result.msgs.filter((m) => m.level === 'error').length;
  const warns = result.msgs.filter((m) => m.level === 'warn').length;
  if (errs) return { pass: false, why: 'Fix the errors first (red messages).' };
  if (!result.endState.ended) return { pass: false, why: 'End the program with M30.' };
  if (ch.strict && warns) return { pass: false, why: 'Almost! There are still warnings (yellow messages) to fix.' };
  if (ch.holes) {
    for (const [hx, hy] of ch.holes) {
      const h = result.holes.find((q) => Math.hypot(q.x - hx, q.y - hy) < 0.5);
      if (!h) return { pass: false, why: `No hole found at (${hx}, ${hy}).` };
      if (h.z > ch.holeDepth) return { pass: false, why: `The hole at (${hx}, ${hy}) is only ${Math.abs(h.z)} mm deep.` };
    }
    return { pass: true };
  }
  const cuts = cutPoints(result.segs);
  if (!cuts.length) return { pass: false, why: 'Nothing was cut: Z never went below 0 while feeding.' };
  const target = sampleTarget(ch.target);
  const near = (x, y) => cuts.filter(([cx, cy]) => Math.hypot(cx - x, cy - y) < 1);
  const miss = target.find(([x, y]) => !near(x, y).length);
  if (miss) return { pass: false, why: `The shape isn't complete: nothing was cut near (${fmt(miss[0])}, ${fmt(miss[1])}).` };
  const stray = cuts.filter(([cx, cy]) => !target.some(([x, y]) => Math.hypot(cx - x, cy - y) < 1.5)).length;
  if (stray > cuts.length * 0.1) return { pass: false, why: 'Extra cuts outside the shape. Make sure you lift Z (G00 Z5) before moving away.' };
  const shallow = target.filter(([x, y]) => Math.min(...near(x, y).map((c) => c[2])) > -1 + 1e-6).length;
  if (shallow > target.length * 0.1) return { pass: false, why: 'Cut at least 1 mm deep (Z-1 or lower).' };
  return { pass: true };
}

/* ============ UI ============ */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountGcodeLab(root, { tutor, award, badge, store }) {
  root.innerHTML = `
  <div class="lab-head">
    <div><h2>⚙️ CNC G-code Studio</h2><p class="muted small">Write G-code, press ▶ and watch the cutter make your part. Red = errors, yellow = things that would go wrong on a real machine.</p></div>
  </div>
  <div class="gc-grid">
    <div class="gc-left">
      <div class="row wrap gc-tools">
        <select id="gcExample" aria-label="Load example"><option value="">📂 Load an example…</option>${Object.keys(EXAMPLES).map((k) => `<option>${esc(k)}</option>`).join('')}</select>
        <button class="btn small" id="gcAsk" type="button">🤖 Ask Gigi about my code</button>
      </div>
      <textarea id="gcCode" class="gc-code" spellcheck="false" autocapitalize="characters" autocomplete="off"></textarea>
      <div id="gcMsgs" class="gc-msgs"></div>
    </div>
    <div class="gc-right">
      <div class="gc-screen">
        <canvas id="gcTop" aria-label="Top view of the part"></canvas>
        <div class="gc-dro" id="gcDro"></div>
      </div>
      <canvas id="gcSide" class="gc-side" aria-label="Side view (depth)"></canvas>
      <div class="row wrap gc-ctrl">
        <button class="btn primary" id="gcPlay" type="button">▶ Run</button>
        <button class="btn" id="gcStep" type="button">⏭ Step line</button>
        <button class="btn" id="gcReset" type="button">↺ Reset</button>
        <label class="row">Speed <input type="range" id="gcSpeed" min="0" max="100" value="45"></label>
      </div>
      <div class="gc-now" id="gcNow">Press ▶ Run to start the machine.</div>
      <div class="row wrap small muted">
        <label class="row">Stock <input type="number" id="gcW" value="100" min="10" max="1000" class="num"> × <input type="number" id="gcH" value="80" min="10" max="1000" class="num"> mm</label>
        <label class="row">Tool Ø <input type="number" id="gcTool" value="4" min="0.5" max="40" step="0.5" class="num"> mm</label>
      </div>
    </div>
  </div>
  <div class="card inner lab-tutor" id="gcTutor"></div>
  <div class="gc-bottom">
    <div class="card inner">
      <h3>🏆 Challenges</h3>
      <div id="gcChallenges"></div>
    </div>
    <div class="card inner">
      <h3>📒 Cheat sheet</h3>
      <p class="small"><b>Memory trick:</b> <b>G</b> = <b>G</b>eometry (how it moves). <b>M</b> = <b>M</b>achine switches (spindle, coolant, tools, start/stop).</p>
      <input type="search" id="gcSearch" placeholder="Search codes, e.g. arc, coolant, G91" class="gc-search">
      <div id="gcRef" class="gc-ref"></div>
    </div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const code = $('#gcCode'), top = $('#gcTop'), side = $('#gcSide');
  code.value = store.get('gc.code', EXAMPLES['Hello square 💗']);
  let result = interpret(code.value);
  let timeline = [], total = 0, t = 0, playing = false, lastTs = 0, activeChallenge = store.get('gc.challenge', null);

  function buildTimeline() {
    timeline = []; total = 0;
    for (const s of result.segs) {
      const speed = s.kind === 'rapid' ? 4000 : Math.max(10, s.feed || 100); // mm/min
      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1], b = s.pts[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const dur = len / speed * 60; // seconds of machine time
        timeline.push({ a, b, t0: total, t1: total + dur, seg: s });
        total += dur;
      }
    }
  }
  function posAt(time) {
    if (!timeline.length) return { p: { x: 0, y: 0, z: 25 }, item: null };
    let lo = 0, hi = timeline.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (timeline[mid].t1 < time) lo = mid + 1; else hi = mid; }
    const it = timeline[lo];
    const f = it.t1 > it.t0 ? Math.min(1, Math.max(0, (time - it.t0) / (it.t1 - it.t0))) : 1;
    return { p: { x: it.a.x + (it.b.x - it.a.x) * f, y: it.a.y + (it.b.y - it.a.y) * f, z: it.a.z + (it.b.z - it.a.z) * f }, item: it };
  }

  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function draw() {
    const W = +$('#gcW').value || 100, H = +$('#gcH').value || 80, tool = +$('#gcTool').value || 4;
    const dpr = window.devicePixelRatio || 1;
    const cw = top.clientWidth, ch = Math.round(cw * 0.72);
    top.width = cw * dpr; top.height = ch * dpr; top.style.height = ch + 'px';
    const g = top.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // bounds include stock + path
    let minX = 0, minY = 0, maxX = W, maxY = H;
    for (const s of result.segs) for (const p of s.pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    const pad = 22, sc = Math.min((cw - pad * 2) / (maxX - minX || 1), (ch - pad * 2) / (maxY - minY || 1));
    const X = (x) => pad + (x - minX) * sc, Y = (y) => ch - pad - (y - minY) * sc;
    g.fillStyle = css('--lab-bg'); g.fillRect(0, 0, cw, ch);
    // grid
    g.strokeStyle = css('--lab-grid'); g.lineWidth = 1;
    for (let x = Math.ceil(minX / 10) * 10; x <= maxX; x += 10) { g.beginPath(); g.moveTo(X(x), Y(minY)); g.lineTo(X(x), Y(maxY)); g.stroke(); }
    for (let y = Math.ceil(minY / 10) * 10; y <= maxY; y += 10) { g.beginPath(); g.moveTo(X(minX), Y(y)); g.lineTo(X(maxX), Y(y)); g.stroke(); }
    // stock
    g.fillStyle = css('--lab-stock'); g.strokeStyle = css('--lab-stock-edge'); g.lineWidth = 1.5;
    g.fillRect(X(0), Y(H), W * sc, H * sc); g.strokeRect(X(0), Y(H), W * sc, H * sc);
    // origin
    g.fillStyle = css('--accent'); g.font = '600 11px system-ui';
    g.beginPath(); g.arc(X(0), Y(0), 4, 0, 7); g.fill(); g.fillText('X0 Y0', X(0) + 6, Y(0) - 6);
    g.fillStyle = css('--muted'); g.fillText('X →', cw - pad - 22, ch - 6); g.fillText('↑ Y', 4, pad - 6);

    const upto = t;
    // cuts: thick, tool-width
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const it of timeline) {
      if (it.t0 > upto) break;
      const f = it.t1 > it.t0 ? Math.min(1, (upto - it.t0) / (it.t1 - it.t0)) : 1;
      const bx = it.a.x + (it.b.x - it.a.x) * f, by = it.a.y + (it.b.y - it.a.y) * f, bz = it.a.z + (it.b.z - it.a.z) * f;
      const cutting = it.seg.kind === 'feed' && Math.min(it.a.z, bz) < 0;
      if (it.seg.kind === 'rapid') { g.setLineDash([5, 5]); g.strokeStyle = css('--lab-rapid'); g.lineWidth = 1.5; }
      else if (cutting) { g.setLineDash([]); g.strokeStyle = css('--lab-cut'); g.lineWidth = Math.max(2, tool * sc); }
      else { g.setLineDash([]); g.strokeStyle = css('--lab-air'); g.lineWidth = 1.5; }
      g.beginPath(); g.moveTo(X(it.a.x), Y(it.a.y)); g.lineTo(X(bx), Y(by)); g.stroke();
    }
    g.setLineDash([]);
    // holes already drilled
    g.fillStyle = css('--lab-hole');
    for (const h of result.holes) { const it = timeline.find((q) => q.seg.kind === 'feed' && q.b.z === h.z && q.b.x === h.x && q.b.y === h.y); if (it && it.t1 <= upto) { g.beginPath(); g.arc(X(h.x), Y(h.y), Math.max(3, tool * sc / 2), 0, 7); g.fill(); } }
    // challenge target ghost
    const chal = CHALLENGES.find((c) => c.id === activeChallenge);
    if (chal) {
      g.strokeStyle = css('--lab-target'); g.lineWidth = 2; g.setLineDash([2, 4]);
      if (chal.target) { g.beginPath(); chal.target.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); }
      if (chal.holes) chal.holes.forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), 6, 0, 7); g.stroke(); });
      g.setLineDash([]);
    }
    // tool
    const { p, item } = posAt(upto);
    const st = item?.seg.state || { spindle: 'off' };
    g.fillStyle = p.z < 0 ? css('--lab-cut') : css('--lab-tool');
    g.globalAlpha = 0.35; g.beginPath(); g.arc(X(p.x), Y(p.y), Math.max(6, tool * sc / 2 + 4), 0, 7); g.fill();
    g.globalAlpha = 1; g.beginPath(); g.arc(X(p.x), Y(p.y), Math.max(4, tool * sc / 2), 0, 7); g.fill();
    if (st.spindle !== 'off' && playing) {
      const a = performance.now() / 60;
      g.fillStyle = '#fff';
      for (let k = 0; k < 3; k++) { const aa = a + k * 2.09; g.beginPath(); g.arc(X(p.x) + Math.cos(aa) * Math.max(3, tool * sc / 3), Y(p.y) + Math.sin(aa) * Math.max(3, tool * sc / 3), 1.6, 0, 7); g.fill(); }
    }
    drawSide(p, minX, maxX);
    // DRO
    $('#gcDro').innerHTML = `X <b>${fmt(p.x).padStart(7)}</b><br>Y <b>${fmt(p.y).padStart(7)}</b><br>Z <b>${fmt(p.z).padStart(7)}</b>
      <div class="dro-flags">${st.spindle !== 'off' ? `🌀 ${st.speed} rpm` : '⏹ spindle off'}${st.coolant ? ' · 💧' : ''}${st.tool != null ? ` · T${st.tool}` : ''}${st.feed ? ` · F${fmt(st.feed)}` : ''}${st.abs === false ? ' · G91' : ''}</div>`;
    if (item) {
      const ln = item.seg.line;
      const rawLine = code.value.split('\n')[ln - 1] || '';
      $('#gcNow').innerHTML = `<span class="ln">Line ${ln}</span> <code>${esc(rawLine.trim())}</code><br>${esc(result.explain[ln - 1] || '')}`;
    }
  }
  function drawSide(p, minX, maxX) {
    const dpr = window.devicePixelRatio || 1;
    const cw = side.clientWidth, ch = 90;
    side.width = cw * dpr; side.height = ch * dpr; side.style.height = ch + 'px';
    const g = side.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let minZ = -5, maxZ = 10;
    for (const s of result.segs) for (const q of s.pts) { minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, Math.min(q.z, 30)); }
    const pad = 14, sx = (cw - pad * 2) / (maxX - minX || 1), sz = (ch - pad * 2) / (maxZ - minZ || 1);
    const X = (x) => pad + (x - minX) * sx, Z = (z) => ch - pad - (Math.min(z, 30) - minZ) * sz;
    g.fillStyle = css('--lab-bg'); g.fillRect(0, 0, cw, ch);
    g.fillStyle = css('--lab-stock'); g.fillRect(X(Math.max(0, minX)), Z(0), Math.min(+$('#gcW').value || 100, maxX) * sx, Z(minZ) - Z(0));
    g.strokeStyle = css('--lab-stock-edge'); g.beginPath(); g.moveTo(0, Z(0)); g.lineTo(cw, Z(0)); g.stroke();
    g.fillStyle = css('--muted'); g.font = '600 10px system-ui'; g.fillText('SIDE VIEW · Z0 = top of material', pad, 11);
    for (const it of timeline) {
      if (it.t0 > t) break;
      g.strokeStyle = it.seg.kind === 'rapid' ? css('--lab-rapid') : css('--lab-cut'); g.lineWidth = 1.5; g.setLineDash(it.seg.kind === 'rapid' ? [4, 4] : []);
      g.beginPath(); g.moveTo(X(it.a.x), Z(it.a.z)); g.lineTo(X(it.b.x), Z(it.b.z)); g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = p.z < 0 ? css('--lab-cut') : css('--lab-tool');
    g.fillRect(X(p.x) - 3, Z(p.z) - 26, 6, 26);
  }

  function renderMsgs() {
    const order = { error: 0, warn: 1, info: 2 };
    const ms = [...result.msgs].sort((a, b) => order[a.level] - order[b.level] || a.line - b.line);
    $('#gcMsgs').innerHTML = ms.length
      ? ms.map((m) => `<div class="gc-msg ${m.level}" data-line="${m.line}">${m.level === 'error' ? '❌' : m.level === 'warn' ? '⚠️' : '💡'} <b>Line ${m.line}:</b> ${esc(m.text)}</div>`).join('')
      : '<div class="gc-msg ok">✅ No problems found. Press ▶ Run!</div>';
  }
  function renderChallenges() {
    const done = new Set(store.get('gc.done', []));
    $('#gcChallenges').innerHTML = CHALLENGES.map((c) => `
      <div class="chal ${activeChallenge === c.id ? 'active' : ''}">
        <div><b>${done.has(c.id) ? '🏅' : '🎯'} ${esc(c.title)}</b><div class="small muted">${esc(c.desc)}</div></div>
        <div class="row">${activeChallenge === c.id ? `<button class="btn small primary" data-check="${c.id}" type="button">Check ✓</button>` : `<button class="btn small" data-start="${c.id}" type="button">${done.has(c.id) ? 'Again' : 'Try'}</button>`}</div>
      </div>`).join('') + '<div id="gcVerdict" class="small"></div>';
  }
  function renderRef(q = '') {
    q = q.toLowerCase();
    const rows = Object.entries(CODE_INFO).filter(([k, [n, d]]) => !q || (k + ' ' + n + ' ' + d).toLowerCase().includes(q));
    const letters = Object.entries(LETTER_INFO).filter(([k, d]) => !q || (k + ' ' + d).toLowerCase().includes(q));
    $('#gcRef').innerHTML = rows.map(([k, [n, d]]) => `<div class="ref-row"><code>${k}</code><div><b>${esc(n)}</b>${d ? `<div class="small muted">${esc(d)}</div>` : ''}</div></div>`).join('')
      + (letters.length ? '<h4>Letters</h4>' + letters.map(([k, d]) => `<div class="ref-row"><code>${k}</code><div class="small">${esc(d)}</div></div>`).join('') : '');
  }

  let parseT;
  function reparse() {
    result = interpret(code.value);
    store.set('gc.code', code.value);
    buildTimeline();
    t = Math.min(t, total);
    renderMsgs();
    draw();
  }
  code.addEventListener('input', () => { clearTimeout(parseT); parseT = setTimeout(() => { t = 0; playing = false; $('#gcPlay').textContent = '▶ Run'; reparse(); }, 350); });
  $('#gcMsgs').addEventListener('click', (e) => {
    const l = +e.target.closest('[data-line]')?.dataset.line;
    if (!l) return;
    const lines = code.value.split('\n');
    const start = lines.slice(0, l - 1).join('\n').length + (l > 1 ? 1 : 0);
    code.focus(); code.setSelectionRange(start, start + (lines[l - 1] || '').length);
  });
  $('#gcExample').addEventListener('change', (e) => { if (!e.target.value) return; code.value = EXAMPLES[e.target.value]; e.target.value = ''; t = 0; reparse(); });
  ['#gcW', '#gcH', '#gcTool'].forEach((s) => $(s).addEventListener('input', draw));
  $('#gcSearch').addEventListener('input', (e) => renderRef(e.target.value));
  let ranToEnd = false;
  const T = tutor?.($('#gcTutor'), {
    key: 'gcode', title: 'CNC G-code Studio', courseMatch: /automation/i,
    intro: "Hi! I'm **Gigi**, your CNC tutor ⚙️💗 I can see your program, the machine's messages and your challenge. New to G-code? Tap **🐣 Teach me from zero** and we'll go one small step at a time, practising each one right here in the simulator.",
    starters: [
      ['🐣 Teach me from zero', 'I am confused about G-code and M-code. Teach me from zero, one small idea at a time, using this simulator. Start with what a CNC machine is and how X, Y, Z work, then give me my first tiny task to type in the editor.'],
      ['✅ Check my work', 'Check my current program against the last task you gave me (or the active challenge). Tell me what is right, what is wrong, and what I should change. Do not just give me the full answer unless I am really stuck.'],
      ['🔍 Explain my code', 'Explain my current program line by line in a table (line | code | what it does in plain English), then tell me what the part will look like.'],
      ['🐞 Why is it wrong?', 'Look at the red/yellow messages from the simulator and explain each problem simply: what it means, why it would be dangerous or wrong on a real machine, and how to fix it. Give me hints first.'],
      ['🎯 Give me an exercise', 'Give me one small practical exercise I can do in this simulator right now, at my level. Tell me what the finished shape should look like.'],
      ['📝 Exam question', 'Give me one exam-style question on G-codes and M-codes like a Nigerian university test would ask, wait for my answer, then mark it.'],
    ],
    getContext: () => {
      const msgs = result.msgs.map((m) => `- line ${m.line} ${m.level}: ${m.text}`).join('\n') || '- none (program is valid)';
      const ch = CHALLENGES.find((c) => c.id === activeChallenge);
      return `Editor contents:\n\`\`\`gcode\n${code.value}\n\`\`\`\nSimulator messages:\n${msgs}\nMoves: ${result.segs.length} segments, ${result.holes.length} drilled holes. Program ended properly: ${result.endState.ended}. Has run to the end: ${ranToEnd}.\nActive challenge: ${ch ? ch.title + ' (' + ch.desc + ')' : 'none'}.\nStock ${$('#gcW').value}×${$('#gcH').value} mm, tool Ø${$('#gcTool').value} mm.`;
    },
    onCode: (txt) => { code.value = txt; t = 0; reparse(); top.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  });
  $('#gcAsk').addEventListener('click', () => { T?.focus(); T?.ask('Explain my current program line by line in a table (line | code | what it does in plain English), point out anything wrong, and tell me what the part will look like.', '🔍 Explain my code'); });

  let firstRun = true;
  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(0.1, (ts - (lastTs || ts)) / 1000); lastTs = ts;
    const mult = Math.pow(10, (+$('#gcSpeed').value - 20) / 40); // ~0.3x to ~30x
    t = Math.min(total, t + dt * mult * 6);
    draw();
    if (t >= total) {
      playing = false; ranToEnd = true; $('#gcPlay').textContent = '▶ Run again';
      if (firstRun) { firstRun = false; award?.(5, 'ran a G-code program'); badge?.('gcode-first'); }
      return;
    }
    requestAnimationFrame(loop);
  }
  $('#gcPlay').addEventListener('click', () => {
    if (result.msgs.some((m) => m.level === 'error')) { $('#gcNow').innerHTML = '❌ Fix the red errors first. Tap one to jump to its line.'; return; }
    if (t >= total) t = 0;
    playing = !playing;
    $('#gcPlay').textContent = playing ? '⏸ Pause' : '▶ Resume';
    lastTs = 0;
    if (playing) requestAnimationFrame(loop);
  });
  $('#gcStep').addEventListener('click', () => {
    playing = false; $('#gcPlay').textContent = '▶ Resume';
    const cur = posAt(t).item;
    const curLine = t === 0 ? 0 : cur?.seg.line ?? 0;
    const next = timeline.find((it) => it.seg.line > curLine);
    if (!next) { t = total; draw(); return; }
    const last = [...timeline].reverse().find((it) => it.seg.line === next.seg.line);
    t = last.t1; draw();
  });
  $('#gcReset').addEventListener('click', () => { playing = false; t = 0; $('#gcPlay').textContent = '▶ Run'; draw(); $('#gcNow').textContent = 'Press ▶ Run to start the machine.'; });
  $('#gcChallenges').addEventListener('click', (e) => {
    const s = e.target.closest('[data-start]')?.dataset.start, c = e.target.closest('[data-check]')?.dataset.check;
    if (s) { activeChallenge = s; store.set('gc.challenge', s); if (s === 'fix') { code.value = EXAMPLES['Broken program 🐞 (fix me)']; reparse(); } renderChallenges(); draw(); }
    if (c) {
      const ch = CHALLENGES.find((x) => x.id === c), v = checkChallenge(ch, result);
      const box = root.querySelector('#gcVerdict');
      if (v.pass) {
        const done = new Set(store.get('gc.done', []));
        const fresh = !done.has(c);
        done.add(c); store.set('gc.done', [...done]);
        renderChallenges();
        root.querySelector('#gcVerdict').innerHTML = '<div class="verdict pass">🎉 Challenge complete! You just wrote a working CNC program.</div>';
        if (fresh) { award?.(20, 'CNC challenge'); badge?.('gcode-challenge'); if (done.size === CHALLENGES.length) badge?.('gcode-queen'); }
      } else box.innerHTML = `<div class="verdict">Not yet: ${esc(v.why)}</div>`;
    }
  });
  const ro = new ResizeObserver(() => draw());
  ro.observe(top);

  renderRef(); renderChallenges(); reparse();
  return { destroy() { playing = false; ro.disconnect(); } };
}
