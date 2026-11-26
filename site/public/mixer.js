/*
  The style mixer.
  On every page load it picks colours, type, pattern and shapes at random
  from the six directions, so each visit is a little surprise.
  It never repeats the exact mix you saw last time.

  To drop a direction, delete it from DIRECTIONS below.
*/
(function () {
  var DIRECTIONS = [
    {
      id: 'toy', name: 'Toy Robot Workshop',
      palette: { bg: '#FFF1CC', surface: '#FFFFFF', ink: '#1E1B4B', a1: '#F2453D', a2: '#2D6FF2', a3: '#FFC531', btnInk: '#FFFFFF', tagInk: '#1E1B4B', a2Text: '#2D6FF2' },
      type: { fonts: ['Bagel+Fat+One', 'Nunito:wght@400;700;800'], display: "'Bagel Fat One', 'Arial Rounded MT Bold', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", scale: 1, bodyScale: 1, weight: 400, case: 'none', lh: 1.02, track: '0' },
      shape: { radius: '16px', btnRadius: '999px', border: '3px solid var(--p-ink)', thin: '2px solid var(--p-ink)', shadow: '4px 4px 0 var(--p-ink)', hover: 'translate(2px, 2px)', shadowHover: '2px 2px 0 var(--p-ink)', tilt: '0deg' }
    },
    {
      id: 'note', name: 'Sticker Notebook',
      palette: { bg: '#FCFBF4', surface: '#FFFFFF', ink: '#2A2A33', a1: '#E8507A', a2: '#4FB389', a3: '#FFD84D', btnInk: '#FFFFFF', tagInk: '#2A2A33', a2Text: '#2E8C63' },
      type: { fonts: ['Gochi+Hand', 'Patrick+Hand'], display: "'Gochi Hand', 'Comic Sans MS', cursive", body: "'Patrick Hand', 'Comic Sans MS', cursive", scale: 1.1, bodyScale: 1.12, weight: 400, case: 'none', lh: 1.0, track: '0' },
      shape: { radius: '255px 14px 225px 14px / 14px 225px 14px 255px', btnRadius: '255px 14px 225px 14px / 14px 225px 14px 255px', border: '2px solid var(--p-ink)', thin: '1.5px solid var(--p-ink)', shadow: 'none', hover: 'rotate(-2deg) scale(1.04)', shadowHover: 'none', tilt: '-1.2deg' }
    },
    {
      id: 'ankara', name: 'Ankara Pop',
      palette: { bg: '#FFC400', surface: '#FFF6DA', ink: '#16062E', a1: '#D7192E', a2: '#00855A', a3: '#6A3CF0', btnInk: '#FFFFFF', tagInk: '#FFFFFF', a2Text: '#00704C' },
      type: { fonts: ['Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800', 'Outfit:wght@400;600;700'], display: "'Bricolage Grotesque', 'Arial Black', system-ui, sans-serif", body: "'Outfit', system-ui, sans-serif", scale: 1, bodyScale: 1, weight: 800, case: 'none', lh: .95, track: '-0.03em' },
      shape: { radius: '0', btnRadius: '0', border: '0 solid transparent', thin: '0 solid transparent', shadow: '6px 6px 0 var(--p-ink)', hover: 'translate(-2px, -2px)', shadowHover: '9px 9px 0 var(--p-ink)', tilt: '0deg' }
    },
    {
      id: 'arcade', name: 'Pixel Arcade',
      palette: { bg: '#15102E', surface: '#251C52', ink: '#F4F0FF', a1: '#FF4FD8', a2: '#3CF0C5', a3: '#FFE14D', btnInk: '#15102E', tagInk: '#15102E', a2Text: '#3CF0C5' },
      type: { fonts: ['Press+Start+2P', 'VT323'], display: "'Press Start 2P', ui-monospace, monospace", body: "'VT323', ui-monospace, monospace", scale: .62, bodyScale: 1.35, weight: 400, case: 'uppercase', lh: 1.35, track: '0' },
      shape: { radius: '0', btnRadius: '0', border: '3px solid var(--p-ink)', thin: '2px solid var(--p-ink)', shadow: '0 4px 0 var(--p-a3), 4px 0 0 var(--p-a3), 4px 4px 0 var(--p-a3)', hover: 'translateY(2px)', shadowHover: '0 2px 0 var(--p-a3), 2px 0 0 var(--p-a3), 2px 2px 0 var(--p-a3)', tilt: '0deg' }
    },
    {
      id: 'cloud', name: 'Cotton Cloud',
      palette: { bg: '#F2EDFF', surface: '#FFFFFF', ink: '#3A2C63', a1: '#FF94C2', a2: '#8FD3FF', a3: '#C6B3FF', btnInk: '#3A2C63', tagInk: '#3A2C63', a2Text: '#2B7FB8' },
      type: { fonts: ['Cherry+Bomb+One', 'Quicksand:wght@400;600;700'], display: "'Cherry Bomb One', 'Arial Rounded MT Bold', system-ui, sans-serif", body: "'Quicksand', system-ui, sans-serif", scale: 1.02, bodyScale: 1.02, weight: 400, case: 'none', lh: 1.05, track: '0' },
      shape: { radius: '26px', btnRadius: '999px', border: '0 solid transparent', thin: '0 solid transparent', shadow: '0 10px 30px -12px color-mix(in srgb, var(--p-ink) 40%, transparent)', hover: 'translateY(-3px) scale(1.03)', shadowHover: '0 16px 36px -12px color-mix(in srgb, var(--p-ink) 45%, transparent)', tilt: '0deg' }
    },
    {
      id: 'blue', name: 'Blueprint Storybook',
      palette: { bg: '#1B4C87', surface: '#215A9C', ink: '#EAF4FF', a1: '#FFD166', a2: '#9AD1FF', a3: '#FF8C69', btnInk: '#14365F', tagInk: '#14365F', a2Text: '#9AD1FF' },
      type: { fonts: ['Architects+Daughter', 'IBM+Plex+Mono:wght@400;500;600'], display: "'Architects Daughter', 'Comic Sans MS', cursive", body: "'IBM Plex Mono', ui-monospace, monospace", scale: 1, bodyScale: .92, weight: 400, case: 'none', lh: 1.12, track: '0' },
      shape: { radius: '3px', btnRadius: '3px', border: '1.5px dashed var(--p-ink)', thin: '1.5px dashed var(--p-ink)', shadow: 'none', hover: 'translate(0, -2px)', shadowHover: '0 0 0 3px color-mix(in srgb, var(--p-a1) 45%, transparent)', tilt: '0deg' }
    }
  ];
  var PATTERN_NAMES = { toy: 'gears', note: 'notebook doodles', ankara: 'Ankara print', arcade: 'pixel stars', cloud: 'cloud blobs', blue: 'blueprint grid' };
  var byId = {};
  DIRECTIONS.forEach(function (d) { byId[d.id] = d; });

  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  function pick() { return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)].id; }
  function newMix() {
    var last = store('mix-last') || {}, mix, tries = 0;
    do { mix = { palette: pick(), type: pick(), pattern: pick(), shape: pick() }; tries++; }
    while (tries < 20 && mix.palette === last.palette && mix.type === last.type && mix.pattern === last.pattern && mix.shape === last.shape);
    store('mix-last', mix);
    return mix;
  }

  var loadedFonts = {};
  function loadFonts(list) {
    var fresh = list.filter(function (f) { return !loadedFonts[f]; });
    if (!fresh.length) return;
    fresh.forEach(function (f) { loadedFonts[f] = true; });
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + fresh.join('&family=') + '&display=swap';
    document.head.appendChild(link);
  }

  function apply(mix) {
    var p = byId[mix.palette].palette, t = byId[mix.type].type, s = byId[mix.shape].shape;
    var v = {
      '--p-bg': p.bg, '--p-surface': p.surface, '--p-ink': p.ink, '--p-a1': p.a1, '--p-a2': p.a2, '--p-a3': p.a3,
      '--p-btn-ink': p.btnInk, '--p-tag-ink': p.tagInk, '--p-a2-text': p.a2Text,
      '--f-display': t.display, '--f-body': t.body, '--f-scale': t.scale, '--f-body-scale': t.bodyScale,
      '--f-weight': t.weight, '--f-case': t.case, '--f-lh': t.lh, '--f-track': t.track,
      '--s-radius': s.radius, '--s-btn-radius': s.btnRadius, '--s-border': s.border, '--s-border-thin': s.thin,
      '--s-shadow': s.shadow, '--s-hover': s.hover, '--s-shadow-hover': s.shadowHover, '--s-tilt': s.tilt
    };
    var root = document.documentElement;
    Object.keys(v).forEach(function (k) { root.style.setProperty(k, v[k]); });
    root.setAttribute('data-pattern', mix.pattern);
    root.setAttribute('data-palette', mix.palette);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.bg);
    var fonts = t.fonts.slice();
    if (mix.pattern === 'blue') fonts.push('IBM+Plex+Mono:wght@400;500;600');
    loadFonts(fonts);
  }

  /* ---------- decorations ---------- */
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function gearPath(teeth, ro, ri, hole) {
    var c = 50, step = Math.PI * 2 / teeth, pts = [];
    for (var i = 0; i < teeth; i++) {
      var a = i * step;
      [[ri, 0], [ro, .18], [ro, .42], [ri, .6]].forEach(function (rf) {
        var th = a + step * rf[1];
        pts.push((c + rf[0] * Math.cos(th)).toFixed(1) + ' ' + (c + rf[0] * Math.sin(th)).toFixed(1));
      });
    }
    return 'M' + pts.join('L') + 'Z M' + (c + hole) + ' ' + c + 'a' + hole + ' ' + hole + ' 0 1 0 ' + (-2 * hole) + ' 0a' + hole + ' ' + hole + ' 0 1 0 ' + (2 * hole) + ' 0Z';
  }
  var G = gearPath(12, 47, 38, 12), G2 = gearPath(9, 46, 35, 10);
  var ROBOT = ['.....A......', '.....A......', '...BBBBBB...', '..BBBBBBBB..', '..BEEBBEEB..', '..BBBBBBBB..',
    '..BBCCCCBB..', '...BBBBBB...', '.BBBBBBBBBB.', 'B.BBBBBBBB.B', '..BB....BB..', '..BB....BB..'];
  var COL = { A: 'var(--p-a3)', B: 'var(--p-a2)', E: 'var(--p-bg)', C: 'var(--p-a1)' };
  var BOT = '<svg class="bot" viewBox="0 0 12 12" shape-rendering="crispEdges">' + ROBOT.map(function (row, y) {
    return row.split('').map(function (ch, x) { return ch === '.' ? '' : '<rect x="' + x + '" y="' + y + '" width="1" height="1" style="fill:' + COL[ch] + '"/>'; }).join('');
  }).join('') + '</svg>';
  function stars(seed) {
    var s = seed, out = [];
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 40; i++) out.push(Math.round(rnd() * 1200) + 'px ' + Math.round(rnd() * 600) + 'px 0 ' + (rnd() > .8 ? '1px' : '0') + ' var(--p-' + (rnd() > .7 ? 'a3' : 'ink') + ')');
    return out.join(',');
  }
  var SPARK = '<path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/>';
  var DECOR = {
    toy: '<svg class="gear g1" viewBox="0 0 100 100"><path d="' + G + '" style="fill:var(--p-a2)" fill-rule="evenodd"/></svg>' +
         '<svg class="gear g2" viewBox="0 0 100 100"><path d="' + G2 + '" style="fill:var(--p-a3)" fill-rule="evenodd"/></svg>' +
         '<svg class="gear g3" viewBox="0 0 100 100"><path d="' + G2 + '" style="fill:var(--p-a1)" fill-rule="evenodd"/></svg>',
    note: '<svg class="doodle d-spiral" viewBox="0 0 60 60"><path d="M30 30c0-3 4-3 4 0s-5 6-8 3-1-10 5-10 10 5 9 11-8 11-15 9-11-10-8-17 12-11 19-9"/></svg>' +
          '<svg class="doodle d-star" viewBox="0 0 50 50"><path d="M25 4l6 14 15 1-12 9 4 15-13-8-13 8 4-15L4 19l15-1z"/></svg>' +
          '<svg class="doodle d-heart" viewBox="0 0 40 36"><path d="M20 33S3 22 3 11a8 8 0 0 1 17-3 8 8 0 0 1 17 3c0 11-17 22-17 22z"/></svg>' +
          '<svg class="doodle d-arrow" viewBox="0 0 90 60"><path d="M85 6C70 30 45 48 10 50M10 50l12-10M10 50l14 6"/></svg>',
    ankara: '<div class="sun"></div><div class="strip"></div>',
    arcade: '<div class="stars" style="box-shadow:' + stars(7) + '"></div><div class="stars b" style="box-shadow:' + stars(42) + '"></div>' + BOT,
    cloud: '<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>' +
           '<svg class="spark s1" viewBox="0 0 24 24">' + SPARK + '</svg><svg class="spark s2" viewBox="0 0 24 24">' + SPARK + '</svg><svg class="spark s3" viewBox="0 0 24 24">' + SPARK + '</svg>',
    blue: '<svg class="plan" viewBox="0 0 200 180"><circle cx="90" cy="90" r="22"/><circle cx="90" cy="90" r="4"/>' +
          '<path class="dash" d="M90 50v80M50 90h80"/><g class="arm"><path class="acc" d="M90 90L160 60"/><circle class="acc" cx="160" cy="60" r="8"/></g>' +
          '<path d="M60 150h60M60 145v10M120 145v10"/><text x="70" y="168">42 mm</text><text x="8" y="20">FIG. 1: SERVO ARM</text></svg>'
  };
  DECOR.arcade = DECOR.arcade.replace('<svg class="bot"', RM ? '<svg class="bot still"' : '<svg class="bot"');

  function paintDecor(mix) {
    var nodes = document.querySelectorAll('[data-decor]');
    for (var i = 0; i < nodes.length; i++) nodes[i].innerHTML = DECOR[mix.pattern];
  }

  function paintBadge(mix) {
    var el = document.getElementById('mix-badge-text');
    if (!el) return;
    el.innerHTML =
      '<b>Today’s mix</b>' +
      '<span>Colours: ' + byId[mix.palette].name + '</span>' +
      '<span>Type: ' + byId[mix.type].name + '</span>' +
      '<span>Pattern: ' + PATTERN_NAMES[mix.pattern] + '</span>' +
      '<span>Shapes: ' + byId[mix.shape].name + '</span>';
  }

  var current = newMix();
  apply(current);

  function ready() {
    paintDecor(current);
    paintBadge(current);
    var btn = document.getElementById('remix');
    if (btn) btn.addEventListener('click', function () {
      current = newMix(); apply(current); paintDecor(current); paintBadge(current);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
