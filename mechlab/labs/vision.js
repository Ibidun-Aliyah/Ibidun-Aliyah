// Vision Lab: image filters you can poke at pixel by pixel + a tiny image classifier you train with your camera.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const OPS = {
  original: { name: 'Original', what: 'The raw image. Every pixel is 3 numbers: Red, Green, Blue, each from 0 to 255.', where: 'Everything starts here: a camera on a factory line just gives the computer a grid of numbers.' },
  gray: { name: 'Grayscale', what: 'Each pixel becomes ONE brightness number: 0.299·R + 0.587·G + 0.114·B (our eyes are most sensitive to green). Tap a pixel to see the maths.', where: 'Most inspection algorithms work on grayscale because it is 3× less data and shape matters more than colour.' },
  bc: { name: 'Brightness & contrast', what: 'new = contrast × (old − 128) + 128 + brightness. Contrast stretches values away from mid-grey; brightness shifts them all.', where: 'Fixing images from a poorly lit production line before inspection.' },
  threshold: { name: 'Threshold', what: 'Every pixel brighter than T becomes white (255), the rest black (0). The image becomes a yes/no map.', where: 'Counting bottle caps on a conveyor, checking if a label is present, reading barcodes.' },
  box: { name: 'Blur (box)', what: 'Each pixel becomes the AVERAGE of its neighbours. This is a convolution with a kernel full of 1/9s.', where: 'Removing camera noise before edge detection.' },
  gauss: { name: 'Blur (Gaussian)', what: 'A weighted average: the centre pixel counts most, kernel [1 2 1; 2 4 2; 1 2 1] ÷ 16. Smoother than a box blur.', where: 'The standard first step in almost every vision pipeline (e.g. Canny edge detection).' },
  sharpen: { name: 'Sharpen', what: 'Kernel [0 −1 0; −1 5 −1; 0 −1 0]: boosts a pixel relative to its neighbours, so edges pop.', where: 'Making text and fine features clearer for OCR (reading serial numbers).' },
  sobel: { name: 'Edge detection (Sobel)', what: 'Two kernels measure how fast brightness changes left↔right (Gx) and up↕down (Gy). Edge strength = √(Gx² + Gy²).', where: 'Measuring part dimensions, finding the outline of an object for a robot to pick it up.' },
  custom: { name: 'Custom kernel', what: 'Type your own 3×3 kernel. Output pixel = sum of (neighbour × kernel weight). Try the presets!', where: 'This is exactly what one filter in a Convolutional Neural Network (CNN) does, except a CNN LEARNS the numbers.' },
};
const PRESETS = {
  Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0], 'Box blur': [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  Sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0], 'Edge (Laplacian)': [0, 1, 0, 1, -4, 1, 0, 1, 0], Emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
  'Sobel X': [-1, 0, 1, -2, 0, 2, -1, 0, 1], 'Sobel Y': [-1, -2, -1, 0, 0, 0, 1, 2, 1],
};
const GAUSS = [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16);
const BOX = Array(9).fill(1 / 9);
const SHARP = PRESETS.Sharpen, SX = PRESETS['Sobel X'], SY = PRESETS['Sobel Y'];

function toGray(img) {
  const { data, width: w, height: h } = img, g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return g;
}
function conv(g, w, h, k) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const xx = Math.min(w - 1, Math.max(0, x + i)), yy = Math.min(h - 1, Math.max(0, y + j));
      s += g[yy * w + xx] * k[(j + 1) * 3 + (i + 1)];
    }
    out[y * w + x] = s;
  }
  return out;
}
function grayToImage(g, w, h, abs = false) {
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, abs ? Math.abs(g[i]) : g[i]));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  return img;
}

export function mountVisionLab(root, { award, badge, tutor }) {
  root.innerHTML = `
  <div class="lab-head"><div><h2>👁️ Vision Lab</h2><p class="muted small">See what a computer "sees": numbers. Filter images pixel by pixel, then train your own image classifier with your camera.</p></div></div>
  <div class="seg" role="tablist"><button class="on" data-pane="filters" type="button">🎨 Filter playground</button><button data-pane="classify" type="button">🧠 Teach a classifier</button></div>
  <video id="cvVideo" playsinline muted class="hidden"></video>

  <div data-panel="filters">
    <div class="row wrap">
      <button class="btn small" id="cvSample" type="button">✨ Sample image</button>
      <button class="btn small" id="cvCam" type="button">📷 Use camera</button>
      <button class="btn small hidden" id="cvSnap" type="button">📸 Snap</button>
      <label class="btn small filebtn">🖼 Upload<input type="file" id="cvUpload" accept="image/*"></label>
    </div>
    <p class="cam-note small muted" hidden></p>
    <div class="row wrap cv-ops">
      <label>Filter <select id="cvOp">${Object.entries(OPS).map(([k, o]) => `<option value="${k}">${o.name}</option>`).join('')}</select></label>
      <label id="cvP1w" class="row hidden"><span id="cvP1l"></span> <input type="range" id="cvP1"><b id="cvP1v"></b></label>
      <label id="cvP2w" class="row hidden"><span id="cvP2l"></span> <input type="range" id="cvP2"><b id="cvP2v"></b></label>
    </div>
    <div id="cvKernelBox" class="hidden">
      <div class="row wrap"><span class="small">Presets:</span>${Object.keys(PRESETS).map((p) => `<button class="chip" data-preset="${p}" type="button">${p}</button>`).join('')}</div>
      <div class="kernel" id="cvKernel">${Array.from({ length: 9 }, (_, i) => `<input type="number" step="0.1" data-k="${i}" aria-label="kernel ${i}">`).join('')}</div>
    </div>
    <div class="cv-pair">
      <figure><canvas id="cvIn"></canvas><figcaption>Input</figcaption></figure>
      <figure><canvas id="cvOut"></canvas><figcaption>Output · <b>tap a pixel</b> to see the maths</figcaption></figure>
    </div>
    <div class="cv-info">
      <div class="card inner"><h3 id="cvOpName"></h3><p id="cvWhat"></p><p class="small"><b>🏭 Real life:</b> <span id="cvWhere"></span></p></div>
      <div class="card inner"><h3>🔍 Pixel inspector</h3><div id="cvInspect" class="small muted">Tap the output image.</div></div>
      <div class="card inner"><h3>📊 Brightness histogram</h3><canvas id="cvHist" class="cv-hist"></canvas><p class="small muted">How many pixels have each brightness (dark → bright). Thresholding picks a cut-off on this axis.</p></div>
    </div>
  </div>

  <div data-panel="classify" class="hidden">
    <div class="card inner">
      <p class="small">1) Name 2–4 things (e.g. <i>pen</i>, <i>phone</i>, <i>nothing</i>). 2) Hold <b>📷 Hold to record</b> while pointing the camera at each one (20+ photos each), or upload photos. 3) Turn on <b>Live predict</b> and watch it guess.</p>
      <div class="row wrap"><button class="btn small" id="clCam" type="button">📷 Start camera</button><button class="btn small" id="clAdd" type="button">+ Add class</button><label class="row small"><input type="checkbox" id="clLive"> Live predict</label><label class="btn small filebtn">🖼 Test a photo<input type="file" id="clTest" accept="image/*"></label></div>
    </div>
    <div class="cl-grid">
      <div class="cl-view"><div class="cl-video-wrap"><canvas id="clPreview"></canvas></div><div class="small muted" id="clCamNote">Camera off. You can still upload photos.</div><p class="cam-note small muted" hidden></p></div>
      <div><div id="clClasses"></div></div>
    </div>
    <div class="card inner">
      <h3>🔮 Prediction</h3>
      <div id="clBars" class="small muted">Add at least 2 classes with 5+ examples each.</div>
      <div class="row wrap" style="margin-top:.6rem;align-items:flex-start">
        <figure class="cl-seen"><canvas id="clSeen" width="24" height="24"></canvas><figcaption class="small muted">What the computer sees (24×24)</figcaption></figure>
        <p class="small"><b>How it works:</b> every photo is shrunk to 24×24 pixels × 3 colours = <b>1,728 numbers</b> (its <i>feature vector</i>). For a new image, we find the 5 training photos whose numbers are closest (<b>k-Nearest Neighbours</b>) and let them vote. Real systems use a CNN, which learns better features (edges → shapes → objects) instead of raw pixels. That's why ours gets confused by lighting and background. Try it and see!</p>
      </div>
    </div>
  </div>
  <div class="card inner lab-tutor" id="cvTutor"></div>`;

  const $ = (s) => root.querySelector(s);
  const video = $('#cvVideo');
  let stream = null;
  async function startCam() {
    if (stream) return true;
    try {
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 } }, audio: false }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('no answer from the camera')), 8000)),
      ]);
      video.srcObject = stream; await video.play();
      return true;
    } catch (e) {
      stream = null;
      const msg = '📷 Camera unavailable here (' + e.message + '). Use 🖼 Upload / Photos instead: they work everywhere.';
      root.querySelectorAll('.cam-note').forEach((n) => { n.textContent = msg; n.hidden = false; });
      return false;
    }
  }
  function stopCam() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }

  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pane]'); if (!b) return;
    root.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    root.querySelectorAll('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.pane));
    if (b.dataset.pane === 'filters') drawFilter();
  });

  /* ---------- filter playground ---------- */
  const cin = $('#cvIn'), cout = $('#cvOut');
  let src = null; // ImageData
  let kernel = [...PRESETS.Sharpen];
  function setSource(drawFn, w0, h0) {
    const W = Math.min(320, w0), H = Math.round(h0 * W / w0);
    cin.width = W; cin.height = H;
    const g = cin.getContext('2d', { willReadFrequently: true });
    drawFn(g, W, H);
    src = g.getImageData(0, 0, W, H);
    drawFilter();
  }
  function sample() {
    setSource((g, W, H) => {
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#ffd6e8'); gr.addColorStop(1, '#c9b8ff');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff5c9a'; g.beginPath(); g.arc(W * 0.25, H * 0.4, H * 0.2, 0, 7); g.fill();
      g.fillStyle = '#3b2140'; g.fillRect(W * 0.5, H * 0.18, W * 0.3, H * 0.35);
      g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(W * 0.65, H * 0.75, H * 0.13, 0, 7); g.stroke();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.fillStyle = '#ffffff'; g.fillRect(W * 0.65 + Math.cos(a) * H * 0.17 - 4, H * 0.75 + Math.sin(a) * H * 0.17 - 4, 8, 8); }
      g.fillStyle = '#3b2140'; g.font = `700 ${Math.round(H * 0.12)}px system-ui`; g.fillText('MechLab', W * 0.06, H * 0.88);
      const id = g.getImageData(0, 0, W, H);
      for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 24; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
      g.putImageData(id, 0, 0);
    }, 320, 220);
  }
  const P = {
    bc: [['Brightness', -100, 100, 0], ['Contrast ×', 2, 30, 10, 0.1]],
    threshold: [['T', 0, 255, 128]],
    box: [['Passes', 1, 6, 1]],
    gauss: [['Passes', 1, 6, 1]],
  };
  function setupParams() {
    const op = $('#cvOp').value, ps = P[op] || [];
    ['1', '2'].forEach((n, i) => {
      const w = $('#cvP' + n + 'w'), p = ps[i];
      w.classList.toggle('hidden', !p);
      if (!p) return;
      const r = $('#cvP' + n);
      r.min = p[1]; r.max = p[2]; r.value = p[3]; r.dataset.mul = p[4] || 1;
      $('#cvP' + n + 'l').textContent = p[0];
    });
    $('#cvKernelBox').classList.toggle('hidden', op !== 'custom');
    root.querySelectorAll('[data-k]').forEach((inp, i) => { inp.value = +kernel[i].toFixed(3); });
    const o = OPS[op];
    $('#cvOpName').textContent = o.name; $('#cvWhat').textContent = o.what; $('#cvWhere').textContent = o.where;
  }
  const pv = (n) => +$('#cvP' + n).value * +($('#cvP' + n).dataset.mul || 1);
  let lastGray = null, lastOutGray = null;
  function drawFilter() {
    if (!src) return;
    const op = $('#cvOp').value, w = src.width, h = src.height;
    ['1', '2'].forEach((n) => { if (!$('#cvP' + n + 'w').classList.contains('hidden')) $('#cvP' + n + 'v').textContent = (+pv(n).toFixed(1)).toString(); });
    cin.getContext('2d').putImageData(src, 0, 0);
    const gray = toGray(src); lastGray = gray;
    let out;
    if (op === 'original') { out = src; lastOutGray = gray; }
    else if (op === 'bc') {
      const b = pv(1), c = pv(2); out = new ImageData(w, h);
      for (let i = 0; i < src.data.length; i++) out.data[i] = (i % 4 === 3) ? 255 : Math.max(0, Math.min(255, c * (src.data[i] - 128) + 128 + b));
      lastOutGray = toGray(out);
    } else {
      let g = gray;
      if (op === 'threshold') { const T = pv(1); g = g.map((v) => (v >= T ? 255 : 0)); }
      else if (op === 'box' || op === 'gauss') for (let k = 0; k < pv(1); k++) g = conv(g, w, h, op === 'box' ? BOX : GAUSS);
      else if (op === 'sharpen') g = conv(g, w, h, SHARP);
      else if (op === 'sobel') { const gx = conv(g, w, h, SX), gy = conv(g, w, h, SY); g = gx.map((v, i) => Math.hypot(v, gy[i])); }
      else if (op === 'custom') g = conv(g, w, h, kernel);
      lastOutGray = g;
      out = grayToImage(g, w, h, op === 'custom');
    }
    cout.width = w; cout.height = h; cout.getContext('2d').putImageData(out, 0, 0);
    drawHist(lastOutGray);
  }
  function drawHist(g) {
    const c = $('#cvHist'), dpr = devicePixelRatio || 1, W = c.clientWidth || 280, H = 90;
    c.width = W * dpr; c.height = H * dpr; c.style.height = H + 'px';
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bins = new Array(64).fill(0);
    for (const v of g) bins[Math.max(0, Math.min(63, Math.floor(v / 4)))]++;
    const mx = Math.max(...bins);
    const cs = getComputedStyle(document.documentElement);
    x.fillStyle = cs.getPropertyValue('--lab-bg'); x.fillRect(0, 0, W, H);
    bins.forEach((b, i) => { x.fillStyle = cs.getPropertyValue('--accent'); const bh = (b / mx) * (H - 6); x.fillRect(i * W / 64, H - bh, W / 64 - 1, bh); });
    if ($('#cvOp').value === 'threshold') { x.fillStyle = cs.getPropertyValue('--text'); x.fillRect(pv(1) / 255 * W, 0, 2, H); }
  }
  cout.addEventListener('click', (e) => {
    if (!src) return;
    const r = cout.getBoundingClientRect();
    const px = Math.floor((e.clientX - r.left) / r.width * src.width), py = Math.floor((e.clientY - r.top) / r.height * src.height);
    const op = $('#cvOp').value, w = src.width, h = src.height;
    const at = (x, y) => lastGray[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    const i = (py * w + px) * 4, R = src.data[i], G = src.data[i + 1], B = src.data[i + 2];
    const k = { box: BOX, gauss: GAUSS, sharpen: SHARP, custom: kernel, sobel: SX }[op];
    let html = `<div>Pixel (x=${px}, y=${py}) · RGB = (${R}, ${G}, ${B})</div>`;
    if (op === 'original') html += '<div>Three numbers per pixel. That is ALL the camera gives the computer.</div>';
    else if (op === 'gray') html += `<div>0.299×${R} + 0.587×${G} + 0.114×${B} = <b>${at(px, py).toFixed(1)}</b></div>`;
    else if (op === 'threshold') html += `<div>gray = ${at(px, py).toFixed(0)} ${at(px, py) >= pv(1) ? '≥' : '<'} T=${pv(1)} → <b>${at(px, py) >= pv(1) ? '255 (white)' : '0 (black)'}</b></div>`;
    else if (op === 'bc') html += `<div>${pv(2).toFixed(1)} × (${R} − 128) + 128 + ${pv(1)} = <b>${Math.max(0, Math.min(255, pv(2) * (R - 128) + 128 + pv(1))).toFixed(0)}</b> (red channel)</div>`;
    else if (k) {
      const nb = [], terms = [];
      let sum = 0;
      for (let j = -1; j <= 1; j++) for (let ii = -1; ii <= 1; ii++) { const v = at(px + ii, py + j), kw = k[(j + 1) * 3 + ii + 1]; nb.push(v); sum += v * kw; terms.push(`${v.toFixed(0)}×${+kw.toFixed(2)}`); }
      const grid = (arr, f) => `<table class="mini">${[0, 1, 2].map((r2) => `<tr>${[0, 1, 2].map((c2) => `<td>${f(arr[r2 * 3 + c2])}</td>`).join('')}</tr>`).join('')}</table>`;
      html += `<div class="row wrap" style="align-items:center;gap:.4rem">${grid(nb, (v) => v.toFixed(0))}<b>⊛</b>${grid(k, (v) => +v.toFixed(2))}<b>=</b><b>${sum.toFixed(1)}</b></div>`;
      html += `<div class="muted">${terms.join(' + ')}</div>`;
      if (op === 'sobel') html += `<div>That's Gx. Edge strength = √(Gx² + Gy²) = <b>${lastOutGray[py * w + px].toFixed(1)}</b></div>`;
      if (op === 'box' || op === 'gauss') html += `<div class="muted">(Shown for one pass. More passes = blur the blur.)</div>`;
    }
    $('#cvInspect').innerHTML = html;
    lastInspect = $('#cvInspect').textContent;
    $('#cvInspect').classList.remove('muted');
  });
  $('#cvOp').addEventListener('change', () => { setupParams(); drawFilter(); });
  ['#cvP1', '#cvP2'].forEach((s) => $(s).addEventListener('input', drawFilter));
  $('#cvKernelBox').addEventListener('click', (e) => { const p = e.target.closest('[data-preset]'); if (!p) return; kernel = [...PRESETS[p.dataset.preset]]; setupParams(); drawFilter(); });
  $('#cvKernel').addEventListener('input', () => { kernel = [...root.querySelectorAll('[data-k]')].map((i) => +i.value || 0); drawFilter(); });
  $('#cvSample').addEventListener('click', sample);
  $('#cvCam').addEventListener('click', async () => { if (await startCam()) { $('#cvSnap').classList.remove('hidden'); snap(); } });
  function snap() { setSource((g, W, H) => g.drawImage(video, 0, 0, W, H), video.videoWidth || 320, video.videoHeight || 240); }
  $('#cvSnap').addEventListener('click', snap);
  const loadFile = (file, cb) => { const im = new Image(); im.onload = () => { cb(im); URL.revokeObjectURL(im.src); }; im.src = URL.createObjectURL(file); };
  $('#cvUpload').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) loadFile(f, (im) => setSource((g, W, H) => g.drawImage(im, 0, 0, W, H), im.naturalWidth, im.naturalHeight)); e.target.value = ''; });

  /* ---------- classifier ---------- */
  const N = 24;
  const fcan = document.createElement('canvas'); fcan.width = fcan.height = N;
  const fctx = fcan.getContext('2d', { willReadFrequently: true });
  let classes = [{ name: 'Thing 1', ex: [], thumbs: [] }, { name: 'Thing 2', ex: [], thumbs: [] }];
  function features(source, sw, sh) {
    const s = Math.min(sw, sh); // centre square crop
    fctx.drawImage(source, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, N, N);
    const d = fctx.getImageData(0, 0, N, N).data, f = new Float32Array(N * N * 3);
    let mean = 0;
    for (let i = 0, j = 0; i < d.length; i += 4) { f[j++] = d[i] / 255; f[j++] = d[i + 1] / 255; f[j++] = d[i + 2] / 255; }
    for (const v of f) mean += v; mean /= f.length;
    for (let i = 0; i < f.length; i++) f[i] -= mean * 0.5; // soften lighting changes a little
    return f;
  }
  function thumb() { const c = document.createElement('canvas'); c.width = c.height = 40; c.getContext('2d').drawImage(fcan, 0, 0, 40, 40); return c.toDataURL('image/jpeg', 0.7); }
  function renderClasses() {
    $('#clClasses').innerHTML = classes.map((c, i) => `
      <div class="cl-class">
        <div class="row"><input type="text" value="${esc(c.name)}" data-name="${i}" aria-label="Class name"><span class="tag">${c.ex.length}</span>${classes.length > 2 ? `<button class="btn small" data-rm="${i}" type="button">✕</button>` : ''}</div>
        <div class="row wrap"><button class="btn small primary hold" data-hold="${i}" type="button">📷 Hold to record</button><label class="btn small filebtn">🖼 Photos<input type="file" accept="image/*" multiple data-up="${i}"></label>${c.ex.length ? `<button class="btn small" data-clear="${i}" type="button">Clear</button>` : ''}</div>
        <div class="thumbs">${c.thumbs.slice(-12).map((t) => `<img src="${t}" alt="">`).join('')}</div>
      </div>`).join('');
  }
  function addExample(i, source, w, h) { const f = features(source, w, h); classes[i].ex.push(f); classes[i].thumbs.push(thumb()); }
  let holdTimer = null;
  $('#clClasses').addEventListener('pointerdown', async (e) => {
    const b = e.target.closest('[data-hold]'); if (!b) return;
    e.preventDefault();
    if (!stream && !(await startCam())) return;
    const i = +b.dataset.hold;
    const grab = () => { addExample(i, video, video.videoWidth, video.videoHeight); b.textContent = `📷 Recording… ${classes[i].ex.length}`; };
    grab(); holdTimer = setInterval(grab, 150);
    const stop = () => { clearInterval(holdTimer); holdTimer = null; renderClasses(); predictNow(); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop);
  });
  $('#clClasses').addEventListener('input', (e) => { const n = e.target.closest('[data-name]'); if (n) classes[+n.dataset.name].name = n.value; });
  $('#clClasses').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]'), cl = e.target.closest('[data-clear]');
    if (rm) { classes.splice(+rm.dataset.rm, 1); renderClasses(); }
    if (cl) { classes[+cl.dataset.clear].ex = []; classes[+cl.dataset.clear].thumbs = []; renderClasses(); }
  });
  $('#clClasses').addEventListener('change', (e) => {
    const up = e.target.closest('[data-up]'); if (!up) return;
    const i = +up.dataset.up, files = [...up.files];
    let left = files.length;
    files.forEach((f) => loadFile(f, (im) => { addExample(i, im, im.naturalWidth, im.naturalHeight); if (--left === 0) { renderClasses(); predictNow(); } }));
  });
  $('#clAdd').addEventListener('click', () => { if (classes.length >= 5) return; classes.push({ name: 'Thing ' + (classes.length + 1), ex: [], thumbs: [] }); renderClasses(); });

  function classify(f) {
    const all = [];
    classes.forEach((c, ci) => c.ex.forEach((e) => { let d = 0; for (let i = 0; i < f.length; i++) { const t = f[i] - e[i]; d += t * t; } all.push([Math.sqrt(d), ci]); }));
    all.sort((a, b) => a[0] - b[0]);
    const k = Math.min(5, all.length), votes = classes.map(() => 0);
    for (let i = 0; i < k; i++) votes[all[i][1]] += 1 / (all[i][0] + 1e-3);
    const tot = votes.reduce((a, b) => a + b, 0) || 1;
    return votes.map((v) => v / tot);
  }
  let predicted = false, lastProbs = '';
  function showPrediction(source, w, h) {
    const ready = classes.filter((c) => c.ex.length >= 5).length >= 2;
    const f = features(source, w, h);
    const seen = $('#clSeen').getContext('2d'); seen.drawImage(fcan, 0, 0);
    if (!ready) { $('#clBars').innerHTML = 'Add at least 2 classes with 5+ examples each.'; return; }
    const probs = classify(f), best = probs.indexOf(Math.max(...probs));
    lastProbs = classes.map((c, i) => `${c.name} ${(probs[i] * 100).toFixed(0)}%`).join(', ');
    $('#clBars').innerHTML = classes.map((c, i) => `<div class="bar ${i === best ? 'best' : ''}"><span>${esc(c.name)}</span><div><i style="width:${(probs[i] * 100).toFixed(0)}%"></i></div><b>${(probs[i] * 100).toFixed(0)}%</b></div>`).join('');
    $('#clBars').classList.remove('muted');
    if (!predicted) { predicted = true; award?.(10, 'trained an image classifier'); badge?.('vision'); }
  }
  function predictNow() { if (stream && video.videoWidth) showPrediction(video, video.videoWidth, video.videoHeight); }
  $('#clTest').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) loadFile(f, (im) => showPrediction(im, im.naturalWidth, im.naturalHeight)); e.target.value = ''; });
  $('#clCam').addEventListener('click', async () => { if (await startCam()) $('#clCamNote').textContent = 'Camera on. Point it at something.'; });

  const prev = $('#clPreview');
  let raf;
  function tick() {
    if (stream && video.videoWidth && !root.querySelector('[data-panel="classify"]').classList.contains('hidden')) {
      const s = Math.min(video.videoWidth, video.videoHeight);
      prev.width = prev.height = 240;
      prev.getContext('2d').drawImage(video, (video.videoWidth - s) / 2, (video.videoHeight - s) / 2, s, s, 0, 0, 240, 240);
      if ($('#clLive').checked && !holdTimer && (tick.n = (tick.n || 0) + 1) % 6 === 0) predictNow();
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  let lastInspect = '';
  tutor?.($('#cvTutor'), {
    key: 'vision', title: 'Vision Lab', courseMatch: /vision/i,
    intro: "Hi! I'm **Gigi**, your computer vision tutor 👁️💗 I can see which filter you're using, your kernel, the pixel you tapped and your classifier. Ask me anything, or tap a button to start.",
    starters: [
      ['🐣 What am I looking at?', 'Explain what this filter is doing to the image on my screen, in plain English first, then the maths. Then tell me one thing to change and what I should notice.'],
      ['🧮 Explain that pixel', 'Walk me through the pixel inspector numbers on my screen step by step, like a worked exam answer.'],
      ['🧱 Convolution from zero', 'Teach me convolution from zero, one small idea at a time, using this lab. Give me a tiny task after each idea.'],
      ['🏭 Real-life use', 'How is the filter I am using applied in real factories, robots or phones? Give 3 concrete examples, Nigerian ones if possible.'],
      ['🧠 Explain my classifier', 'Explain what my classifier is doing with my classes and its last prediction, why it might be wrong, and how a real CNN would do better.'],
      ['📝 Quiz me', 'Ask me one exam-style computer vision question about what is on my screen, wait for my answer, then mark it.'],
    ],
    getContext: () => `Filter: ${OPS[$('#cvOp').value].name}. ${!$('#cvP1w').classList.contains('hidden') ? $('#cvP1l').textContent + ' = ' + pv(1) + '. ' : ''}${!$('#cvP2w').classList.contains('hidden') ? $('#cvP2l').textContent + ' = ' + pv(2) + '. ' : ''}${$('#cvOp').value === 'custom' ? 'Custom kernel: [' + kernel.map((v) => +v.toFixed(3)).join(', ') + ']. ' : ''}Image: ${src ? src.width + '×' + src.height + ' px' : 'none'}.
Pixel inspector: ${lastInspect || 'nothing tapped yet'}.
Classifier: ${classes.map((c) => `${c.name} (${c.ex.length} examples)`).join(', ')}. Last prediction: ${lastProbs || 'none yet'}.`,
  });
  setupParams(); sample(); renderClasses();
  return { destroy() { cancelAnimationFrame(raf); stopCam(); } };
}
