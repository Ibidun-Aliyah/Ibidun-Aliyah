/*
  LAGOS LIVES — places. Each background is a 400x560 SVG drawn in code.
  LL_ART.place(id) -> SVG string. LL_ART.placeMood[id] -> ambience for sound.
*/
(function () {
  const W = 400, H = 560;
  let n = 0;
  const id = (p) => p + "-" + ++n;
  const rnd = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  const sky = (a, b, c) => { const g = id("sky"); return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".7" stop-color="${b}"/><stop offset="1" stop-color="${c || b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${g})"/>`; };
  const glow = (x, y, r, col, o) => { const g = id("gl"); return `<defs><radialGradient id="${g}"><stop offset="0" stop-color="${col}" stop-opacity="${o || 0.8}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/>`; };
  const text = (x, y, t, size, col, extra) => `<text x="${x}" y="${y}" font-family="'Bricolage Grotesque', Arial Black, sans-serif" font-weight="800" font-size="${size}" fill="${col}" text-anchor="middle" ${extra || ""}>${t}</text>`;

  function skyline(y, col, seed, lit, litCol) {
    const r = rnd(seed); let s = "", x = -10;
    while (x < W + 10) {
      const w = 26 + r() * 46, h = 40 + r() * 140;
      s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 200}" fill="${col}"/>`;
      if (lit) for (let wy = y - h + 8; wy < y - 6; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() < lit) s += `<rect class="win" x="${wx}" y="${wy}" width="4" height="5" fill="${litCol || "#ffd27a"}" opacity="${0.5 + r() * 0.5}"/>`;
      x += w + 2;
    }
    return s;
  }
  function danfo(x, y, sc, flip) {
    return `<g transform="translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})">
      <path d="M0 0 L0 -64 Q2 -78 18 -80 L150 -80 Q170 -80 176 -60 L186 -30 L186 0Z" fill="#f4b81c"/>
      <rect x="0" y="-36" width="186" height="8" fill="#141414"/><rect x="0" y="-22" width="186" height="5" fill="#141414"/>
      <path d="M12 -72 L60 -72 L60 -46 L12 -46Z M66 -72 L112 -72 L112 -46 L66 -46Z M118 -72 L156 -72 L172 -46 L118 -46Z" fill="#2b3b44"/>
      <path d="M118 -72 L156 -72 L162 -62 L118 -62Z" fill="#fff" opacity=".18"/>
      <circle cx="38" cy="0" r="15" fill="#151515"/><circle cx="38" cy="0" r="6" fill="#8a8a8a"/><circle cx="148" cy="0" r="15" fill="#151515"/><circle cx="148" cy="0" r="6" fill="#8a8a8a"/>
      <rect x="180" y="-26" width="8" height="8" rx="2" fill="#ffe9a8"/></g>`;
  }
  function person(x, y, sc, col, op) { return `<g transform="translate(${x} ${y}) scale(${sc})" opacity="${op || 1}"><circle cx="0" cy="-58" r="9" fill="${col}"/><path d="M-13 0 L-11 -44 Q0 -50 11 -44 L13 0Z" fill="${col}"/></g>`; }
  const floor = (y, a, b) => { const g = id("fl"); return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect y="${y}" width="${W}" height="${H - y}" fill="url(#${g})"/>`; };
  function bunk(x, y) { return `<g fill="none" stroke="#5a4636" stroke-width="6"><path d="M${x} ${y} L${x} ${y - 230} M${x + 120} ${y} L${x + 120} ${y - 230}"/></g><rect x="${x}" y="${y - 200}" width="120" height="16" fill="#7c5c46"/><rect x="${x + 4}" y="${y - 214}" width="112" height="14" rx="5" fill="#d9cdb4"/><rect x="${x}" y="${y - 70}" width="120" height="16" fill="#7c5c46"/><rect x="${x + 4}" y="${y - 84}" width="112" height="14" rx="5" fill="#b9a9c6"/>`; }
  function laptop(x, y, glowCol) { return `<path d="M${x} ${y} L${x + 44} ${y} L${x + 50} ${y + 5} L${x - 6} ${y + 5}Z" fill="#2b2b33"/><rect x="${x + 3}" y="${y - 30}" width="38" height="28" rx="2" fill="#1c1c22"/><rect x="${x + 6}" y="${y - 27}" width="32" height="22" fill="${glowCol}" opacity=".85"/>`; }

  const P = {
    market: () => sky("#f3b777", "#f6dcb0") + glow(320, 120, 120, "#fff1c4", 0.9) +
      skyline(330, "#d9b48e", 7) + skyline(360, "#c99c74", 3) +
      `<rect y="360" width="400" height="200" fill="#b98b62"/>` +
      [[10, "#d6453a"], [140, "#2f7fb8"], [270, "#e8a72a"]].map(([x, c]) => `<path d="M${x} 300 Q${x + 65} 250 ${x + 130} 300Z" fill="${c}"/><path d="M${x + 65} 268 L${x + 65} 420" stroke="#5a3b25" stroke-width="4"/><path d="M${x} 300 Q${x + 65} 286 ${x + 130} 300" fill="${c}" opacity=".6"/>`).join("") +
      `<rect x="0" y="380" width="400" height="34" fill="#7a5034"/>` +
      [30, 90, 150, 220, 290, 350].map((x, i) => `<ellipse cx="${x}" cy="384" rx="26" ry="10" fill="#c9a26a"/>` + Array.from({ length: 9 }, (_, k) => `<circle cx="${x - 16 + (k % 5) * 8}" cy="${376 - Math.floor(k / 5) * 7}" r="5" fill="${i % 2 ? "#d8261c" : "#e8501f"}"/>`).join("")).join("") +
      `<path d="M60 230 Q80 200 70 170 Q90 150 80 120" stroke="#ffffff" stroke-width="14" fill="none" opacity=".18" stroke-linecap="round"/>` +
      person(330, 520, 1.3, "#6b3b2a", 0.35) + person(40, 530, 1.4, "#2c4a6b", 0.3),

    garage: () => sky("#e7c48d", "#efe0c2") + glow(80, 100, 120, "#fff3cf", 0.8) + skyline(300, "#cfae86", 11) +
      `<rect y="330" width="400" height="230" fill="#55534f"/><path d="M0 420 L400 400" stroke="#f4f0e0" stroke-width="3" stroke-dasharray="20 18" opacity=".6"/>` +
      `<rect x="250" y="160" width="140" height="40" fill="#1f5e3e"/>` + text(320, 186, "IKORODU GARAGE", 13, "#fff") + `<path d="M270 200 L270 330 M370 200 L370 330" stroke="#333" stroke-width="5"/>` +
      danfo(-30, 380, 1.1) + danfo(200, 360, 0.8, false) + danfo(420, 470, 1.25, true) +
      person(170, 380, 0.9, "#3d2a20", 0.5) + person(190, 384, 0.85, "#8a2e2e", 0.5),

    hostel: (night) => (night ? sky("#0f1a2e", "#1a2640") : sky("#8fa58a", "#7d9477")) +
      `<rect x="0" y="0" width="400" height="400" fill="${night ? "#1d2a33" : "#a9b89a"}"/><path d="M0 120 Q60 140 30 200 M330 60 Q300 110 360 140" stroke="${night ? "#16212a" : "#93a385"}" stroke-width="18" fill="none" opacity=".6"/>` +
      `<rect x="150" y="60" width="110" height="120" fill="${night ? "#0b1324" : "#dff0ff"}" stroke="#4d3a2c" stroke-width="8"/><path d="M205 60 L205 180 M150 120 L260 120" stroke="#4d3a2c" stroke-width="6"/>` +
      (night ? `<circle cx="235" cy="88" r="10" fill="#f0ead2"/>` : glow(205, 120, 90, "#ffffff", 0.6)) +
      bunk(-30, 470) + bunk(290, 470) +
      `<path d="M120 210 Q200 240 280 210" stroke="#444" stroke-width="2" fill="none"/><rect x="140" y="218" width="24" height="34" fill="#c0392b"/><rect x="200" y="226" width="22" height="30" fill="#2f7fb8"/><rect x="236" y="220" width="20" height="28" fill="#f0f0f0"/>` +
      `<rect x="186" y="300" width="28" height="20" rx="3" fill="#eee"/><path d="M192 320 Q180 360 160 380 M200 320 Q205 370 230 390 M208 320 Q240 350 250 340" stroke="#222" stroke-width="2.5" fill="none"/>` +
      floor(470, night ? "#20252a" : "#8a7a66", night ? "#14181c" : "#6e604f") +
      `<path d="M300 500 l30 0 l-4 40 l-22 0Z" fill="#2b74b8"/>` +
      (night ? `<rect width="400" height="560" fill="#0a1430" opacity=".35"/>` + glow(200, 330, 140, "#7fb3ff", 0.18) : ""),

    lecture: () => `<rect width="400" height="560" fill="#d8d2c2"/>` +
      `<rect x="40" y="70" width="320" height="150" fill="#f6f6f2" stroke="#8b8b8b" stroke-width="6"/>` + text(200, 110, "MEE 201 · THERMODYNAMICS", 15, "#1f3f8a") +
      `<text x="70" y="150" font-family="JetBrains Mono, monospace" font-size="14" fill="#2c2c2c">Q − W = ΔU</text><text x="70" y="180" font-family="JetBrains Mono, monospace" font-size="14" fill="#a12b2b">η = 1 − T₂/T₁</text><path d="M240 140 Q280 120 320 180" stroke="#1f3f8a" stroke-width="2" fill="none"/>` +
      `<g opacity=".8"><circle cx="90" cy="30" r="6" fill="#555"/><path d="M50 30 L130 30" stroke="#555" stroke-width="4"/><circle cx="310" cy="30" r="6" fill="#555"/><path d="M270 30 L350 30" stroke="#555" stroke-width="4"/></g>` +
      [300, 360, 420, 480].map((y, i) => `<rect x="${-20 + i * 6}" y="${y}" width="${440 - i * 12}" height="16" fill="#6b4a32"/><rect x="${-20 + i * 6}" y="${y + 16}" width="${440 - i * 12}" height="40" fill="#4e3524"/>` + Array.from({ length: 7 }, (_, k) => person(20 + k * 60 + (i % 2) * 20, y + 2, 0.55 + i * 0.08, ["#3d2a20", "#5b3a29", "#2c3e50", "#7a3a3a"][k % 4], 0.45 + i * 0.1)).join("")).join(""),

    cafe: () => `<rect width="400" height="560" fill="#cfd9d6"/>` + `<rect x="0" y="0" width="400" height="70" fill="#1f5e8a"/>` + text(200, 32, "OKON CYBER CAFÉ", 22, "#ffd84a") + text(200, 56, "BROWSING · PRINTING · NIN · JAMB REG", 11, "#fff") +
      `<path d="M60 90 L160 90 M240 90 L340 90" stroke="#fff" stroke-width="6" opacity=".9"/>` + glow(110, 100, 80, "#ffffff", 0.4) + glow(290, 100, 80, "#ffffff", 0.4) +
      `<rect x="0" y="330" width="400" height="30" fill="#8a6a4a"/>` +
      [10, 110, 210, 310].map((x) => `<rect x="${x + 8}" y="250" width="70" height="60" rx="4" fill="#dcd6c6"/><rect x="${x + 15}" y="257" width="56" height="44" fill="#4aa3df" opacity=".8"/><rect x="${x + 36}" y="310" width="14" height="20" fill="#bdb6a4"/>`).join("") +
      `<rect x="300" y="160" width="80" height="50" fill="#e9e5da"/><rect x="304" y="150" width="72" height="12" fill="#f8f8f8"/>` + floor(360, "#7d8c86", "#5d6a65"),

    rooftop: () => sky("#0b1530", "#23305a", "#3a3a66") +
      Array.from({ length: 50 }, (_, i) => `<circle class="star" cx="${(i * 73) % 400}" cy="${(i * 37) % 220}" r="${i % 5 ? 0.9 : 1.6}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`).join("") +
      `<circle cx="320" cy="80" r="26" fill="#f2ecd6"/>` + glow(320, 80, 80, "#f2ecd6", 0.3) +
      skyline(360, "#141c33", 5, 0.25) + skyline(400, "#0d1326", 9, 0.18) +
      `<rect y="420" width="400" height="140" fill="#2b2f3a"/><rect x="290" y="330" width="80" height="90" rx="8" fill="#1d3c6e"/><rect x="290" y="330" width="80" height="12" fill="#2a5294"/>`,

    faculty: () => sky("#8cc4e8", "#d9edf5") + `<rect x="20" y="120" width="360" height="260" fill="#e7dcc7"/>` + `<rect x="20" y="110" width="360" height="30" fill="#7a2e2e"/>` + text(200, 132, "FACULTY OF ENGINEERING · FUTIK", 15, "#fff") +
      Array.from({ length: 12 }, (_, i) => `<rect x="${40 + (i % 6) * 56}" y="${160 + Math.floor(i / 6) * 80}" width="34" height="50" fill="#5a7d94"/>`).join("") +
      `<path d="M0 380 L400 380 L400 560 L0 560Z" fill="#6a6a64"/><rect y="372" width="400" height="10" fill="#c9c0aa"/>` +
      `<rect x="30" y="250" width="20" height="130" fill="#5a3b25"/><circle cx="40" cy="240" r="46" fill="#3f7a3a"/><circle cx="360" cy="250" r="40" fill="#4c8a44"/>` +
      `<g transform="translate(150 470)"><path d="M0 0 L0 -50 Q4 -70 40 -76 L180 -76 Q220 -74 236 -46 L250 -30 L250 0Z" fill="#101114"/><path d="M50 -70 L120 -70 L120 -44 L40 -44Z M128 -70 L190 -70 L214 -44 L128 -44Z" fill="#33404c"/><circle cx="50" cy="0" r="20" fill="#0a0a0a"/><circle cx="50" cy="0" r="9" fill="#9aa0a6"/><circle cx="200" cy="0" r="20" fill="#0a0a0a"/><circle cx="200" cy="0" r="9" fill="#9aa0a6"/><path d="M10 -40 L240 -40" stroke="#fff" opacity=".2" stroke-width="2"/></g>`,

    buka: () => `<rect width="400" height="560" fill="#3f7f9f"/><rect y="0" width="400" height="90" fill="#e9e1cd"/>` + text(200, 52, "MAMA T BUKA · FOOD IS READY", 18, "#b8321c") +
      `<rect x="0" y="90" width="400" height="16" fill="#2a5a72"/>` + [60, 150, 240, 330].map((x) => `<ellipse cx="${x}" cy="270" rx="38" ry="14" fill="#2b2b2b"/><rect x="${x - 38}" y="270" width="76" height="40" fill="#3a3a3a"/>` + glow(x, 250, 40, "#fff", 0.25)).join("") +
      `<rect x="0" y="380" width="400" height="20" fill="#2e6a8a"/><rect x="0" y="400" width="400" height="40" fill="#1f4d66"/>` +
      `<ellipse cx="120" cy="388" rx="30" ry="8" fill="#f1f1f1"/><ellipse cx="120" cy="384" rx="20" ry="6" fill="#e8c45a"/><ellipse cx="280" cy="388" rx="30" ry="8" fill="#f1f1f1"/><circle cx="280" cy="382" r="8" fill="#c3a46a"/>` + floor(440, "#b29a7a", "#8d7a5f"),

    office: () => `<rect width="400" height="560" fill="#2a2140"/>` + glow(320, 160, 90, "#ffffff", 0.35) + `<circle cx="320" cy="160" r="40" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/><path d="M320 200 L320 380" stroke="#222" stroke-width="4"/>` +
      `<rect x="30" y="80" width="200" height="110" rx="4" fill="#111"/><rect x="36" y="86" width="188" height="98" fill="#3a5a9a" opacity=".7"/><text x="130" y="140" font-family="JetBrains Mono, monospace" font-size="12" fill="#fff" text-anchor="middle">Hello dear ❤️ my name is Jennifer</text>` +
      `<rect x="0" y="330" width="400" height="22" fill="#4a3a2a"/>` + [20, 100, 180, 260, 330].map((x, i) => laptop(x, 330, ["#8ad0ff", "#a6ffcf", "#ffd28a", "#c8a6ff", "#8ad0ff"][i])).join("") +
      glow(200, 320, 200, "#7a6aff", 0.18) + `<path d="M0 352 L400 352 L400 560 L0 560Z" fill="#1a1528"/><rect x="40" y="430" width="160" height="60" rx="20" fill="#5a2a3a"/>`,

    nwosu: () => `<rect width="400" height="560" fill="#c9b89a"/>` + [20, 300].map((x) => `<rect x="${x}" y="60" width="80" height="280" fill="#6b4a2a"/>` + [80, 140, 200, 260].map((y) => `<rect x="${x}" y="${y + 40}" width="80" height="6" fill="#4b331d"/>` + Array.from({ length: 6 }, (_, k) => `<rect x="${x + 4 + k * 12}" y="${y + 6}" width="10" height="34" fill="${["#7a2e2e", "#2e4a7a", "#3a6a3a", "#c9a227", "#5a3a6a", "#8a5a2a"][k]}"/>`).join("")).join("")).join("") +
      `<rect x="150" y="80" width="100" height="70" fill="#f4efe0" stroke="#7a5a2a" stroke-width="6"/>` + text(200, 112, "Ph.D", 18, "#7a2e2e") + text(200, 134, "MECH. ENG.", 10, "#333") +
      `<g transform="translate(330 300)"><circle r="30" fill="none" stroke="#bbb" stroke-width="4"/><path d="M0 0 L0 90" stroke="#999" stroke-width="5"/></g>` +
      `<rect x="0" y="380" width="400" height="180" fill="#5a3a22"/><rect x="0" y="380" width="400" height="12" fill="#7a5232"/><rect x="40" y="350" width="70" height="30" fill="#f3f0e6"/><rect x="44" y="340" width="62" height="12" fill="#e8e3d4"/><rect x="280" y="356" width="60" height="24" fill="#d5c28a"/>`,

    exam: () => `<rect width="400" height="560" fill="#e3e0d4"/><rect y="0" width="400" height="60" fill="#ccc6b4"/>` + text(200, 40, "NO PHONES · NO BAGS · NO EXPO", 16, "#9a1f1f") +
      `<circle cx="340" cy="110" r="26" fill="#fff" stroke="#333" stroke-width="4"/><path d="M340 110 L340 94 M340 110 L352 116" stroke="#333" stroke-width="3"/>` +
      [260, 330, 400, 470].map((y, i) => Array.from({ length: 5 }, (_, k) => `<rect x="${10 + k * 82}" y="${y}" width="60" height="10" fill="#8a6a4a"/><rect x="${36 + k * 82}" y="${y + 10}" width="6" height="${30 + i * 4}" fill="#555"/><rect x="${20 + k * 82}" y="${y - 3}" width="26" height="4" fill="#fff"/>` + person(40 + k * 82, y + 4, 0.5 + i * 0.1, "#3d2a20", 0.4 + i * 0.12)).join("")).join(""),

    workshop: () => `<rect width="400" height="560" fill="#2b3036"/>` + glow(200, 40, 220, "#ffe9b0", 0.4) + `<path d="M200 0 L200 40" stroke="#555" stroke-width="3"/><path d="M180 40 L220 40 L210 52 L190 52Z" fill="#888"/>` +
      `<rect x="20" y="90" width="150" height="160" fill="#5a4a3a"/>` + Array.from({ length: 30 }, (_, i) => `<circle cx="${30 + (i % 6) * 26}" cy="${100 + Math.floor(i / 6) * 30}" r="2" fill="#3a2e22"/>`).join("") +
      `<path d="M40 120 L60 180 M90 110 L90 170 M120 130 L150 150" stroke="#b8b8b8" stroke-width="6" stroke-linecap="round"/>` +
      `<g transform="translate(230 210)"><path d="M0 0 L140 -40 L150 -10 L10 30Z" fill="#1d3c6e"/><path d="M20 4 L130 -28 M40 10 L140 -20" stroke="#5a8ad0" stroke-width="2"/><rect x="20" y="40" width="110" height="120" rx="6" fill="#dfe6ea"/><rect x="30" y="52" width="90" height="96" rx="4" fill="#c4ced4"/><rect x="104" y="90" width="8" height="24" rx="3" fill="#888"/>${glow(75, 100, 40, "#8ad0ff", 0.4)}</g>` +
      `<rect x="0" y="380" width="400" height="30" fill="#6a6f75"/><rect x="0" y="410" width="400" height="150" fill="#1d2126"/>`,

    party: () => `<rect width="400" height="560" fill="#1a0f2e"/>` + glow(80, 120, 160, "#ff3fa4", 0.45) + glow(320, 160, 170, "#3fb8ff", 0.4) + glow(200, 420, 220, "#9a5aff", 0.3) +
      `<path d="M0 60 Q100 100 200 60 Q300 20 400 60" stroke="#333" fill="none"/>` + Array.from({ length: 16 }, (_, i) => `<circle class="bulb" cx="${i * 26 + 6}" cy="${60 + Math.sin(i / 2.5) * 22}" r="4" fill="${["#ffd84a", "#ff6aa8", "#6ad0ff"][i % 3]}"/>`).join("") +
      `<rect x="20" y="230" width="60" height="140" rx="6" fill="#111"/><circle cx="50" cy="270" r="18" fill="#222" stroke="#444" stroke-width="3"/><circle cx="50" cy="330" r="24" fill="#222" stroke="#444" stroke-width="3"/>` +
      `<rect x="320" y="240" width="60" height="130" rx="6" fill="#111"/><circle cx="350" cy="280" r="18" fill="#222" stroke="#444" stroke-width="3"/><circle cx="350" cy="335" r="22" fill="#222" stroke="#444" stroke-width="3"/>` +
      Array.from({ length: 9 }, (_, i) => person(30 + i * 44, 470 + (i % 2) * 14, 1.1 + (i % 3) * 0.1, "#0b0614", 0.9)).join("") +
      `<path d="M0 380 Q200 340 400 380 L400 560 L0 560Z" fill="#120a20" opacity=".6"/>`,

    bush: () => sky("#3a1a2a", "#c2552a", "#e8853a") + glow(200, 330, 160, "#ff8a3a", 0.5) +
      Array.from({ length: 9 }, (_, i) => `<path d="M${i * 50 - 20} 560 L${i * 50 - 10} ${260 + (i % 3) * 30} Q${i * 50 + 10} ${200 + (i % 4) * 20} ${i * 50 + 30} ${270 + (i % 2) * 20} L${i * 50 + 40} 560Z" fill="#1a0e10"/>`).join("") +
      `<path d="M0 420 Q200 380 400 430 L400 560 L0 560Z" fill="#120809"/>`,

    shrine: () => sky("#1a0a12", "#5a1a1a", "#8a2a1a") + glow(200, 360, 180, "#ff5a1a", 0.45) +
      `<path d="M90 380 L90 250 L310 250 L310 380Z" fill="#3a2214"/><path d="M60 260 L200 180 L340 260Z" fill="#5a3a1a"/><path d="M60 260 L200 180 L340 260" stroke="#2a180c" stroke-width="5" fill="none"/>` +
      `<path d="M160 380 L160 290 L240 290 L240 380Z" fill="#140a06"/><path d="M90 270 L310 270" stroke="#b81d1d" stroke-width="12"/><path d="M120 276 L120 330 M280 276 L280 320" stroke="#b81d1d" stroke-width="8"/>` +
      `<path d="M180 420 Q190 380 200 400 Q210 370 220 420Z" fill="#ffb14a"/><path d="M188 420 Q196 395 200 405 Q206 392 212 420Z" fill="#fff2b0"/>` +
      `<path class="smoke" d="M200 380 Q180 320 210 280 Q240 240 200 190" stroke="#cfc4c0" stroke-width="18" fill="none" opacity=".18" stroke-linecap="round"/>` +
      `<path d="M0 420 Q200 400 400 430 L400 560 L0 560Z" fill="#0e0606"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${i * 80} 560 L${i * 80 + 10} 300 L${i * 80 + 24} 560Z" fill="#0a0506" opacity=".8"/>`).join(""),

    prison: () => `<rect width="400" height="560" fill="#4a4d4f"/>` + Array.from({ length: 14 }, (_, i) => `<rect x="${(i % 4) * 100 + (Math.floor(i / 4) % 2) * 50}" y="${Math.floor(i / 4) * 40 + 40}" width="96" height="36" fill="none" stroke="#3c3f41" stroke-width="3"/>`).join("") +
      `<rect x="250" y="80" width="70" height="50" fill="#bcd0d8"/>` + `<path d="M260 80 L260 130 M275 80 L275 130 M290 80 L290 130 M305 80 L305 130" stroke="#333" stroke-width="4"/>` +
      `<path d="M250 130 L320 130 L240 560 L60 560Z" fill="#fff" opacity=".07"/>` + floor(420, "#3a3c3e", "#2a2c2e") +
      Array.from({ length: 9 }, (_, i) => `<rect x="${i * 48 + 4}" y="0" width="10" height="560" fill="#1e2022"/>`).join("") + `<rect y="20" width="400" height="10" fill="#1e2022"/>`,

    hospital: () => `<rect width="400" height="560" fill="#cfe3dc"/><rect y="300" width="400" height="260" fill="#9fc0b5"/><rect y="296" width="400" height="8" fill="#7fa69a"/>` +
      `<rect x="300" y="100" width="70" height="56" rx="6" fill="#222"/><path d="M308 132 L322 132 L328 116 L336 148 L342 132 L362 132" stroke="#5aff9a" stroke-width="2.5" fill="none"/>` +
      `<path d="M60 120 L60 400" stroke="#aaa" stroke-width="5"/><rect x="44" y="120" width="32" height="44" rx="6" fill="#e8f4ff" opacity=".85"/><path d="M60 164 Q70 260 140 300" stroke="#bbb" stroke-width="2" fill="none"/>` +
      `<rect x="20" y="390" width="360" height="40" rx="8" fill="#f4f4f0"/><rect x="20" y="430" width="360" height="20" fill="#8a9aa0"/>`,

    stage: () => `<rect width="400" height="560" fill="#0b1020"/>` + glow(100, 0, 260, "#fff", 0.25) + glow(300, 0, 260, "#fff", 0.25) +
      `<path d="M100 0 L20 420 L180 420Z M300 0 L220 420 L380 420Z" fill="#fff" opacity=".05"/>` +
      `<rect x="20" y="60" width="360" height="90" fill="#0f5f3a"/>` + text(200, 92, "NATIONAL YOUNG ENGINEERS", 18, "#fff") + text(200, 116, "INNOVATION CHALLENGE · ABUJA", 14, "#ffd84a") + `<rect x="20" y="140" width="360" height="10" fill="#fff"/>` +
      `<g transform="translate(280 260)"><rect width="80" height="100" rx="6" fill="#dfe6ea"/><path d="M-10 -10 L90 -36 L96 -14 L-4 12Z" fill="#1d3c6e"/></g>` + `<rect x="0" y="380" width="400" height="180" fill="#2a1a12"/><rect x="0" y="380" width="400" height="8" fill="#5a3a22"/>`,

    street: () => sky("#05070f", "#0f1628") + skyline(330, "#0b0f1c", 21, 0.12) + glow(320, 340, 120, "#ff2a2a", 0.4) + glow(370, 340, 120, "#2a6aff", 0.45) +
      `<rect y="380" width="400" height="180" fill="#1a1c20"/><path d="M60 380 L60 180" stroke="#333" stroke-width="5"/><path d="M60 180 L100 184" stroke="#333" stroke-width="5"/>` + glow(100, 190, 90, "#ffc35a", 0.45) +
      `<path d="M0 360 L400 360 L400 380 L0 380Z" fill="#2a2a2e"/>` + Array.from({ length: 20 }, (_, i) => `<path d="M${i * 20} 360 L${i * 20 + 10} 340 L${i * 20 + 20} 360" fill="#2a2a2e"/>`).join(""),

    factory: () => sky("#b9c8d0", "#e2e8ea") + `<path d="M0 260 L80 200 L80 260 L160 200 L160 260 L240 200 L240 260 L320 200 L320 260 L400 200 L400 560 L0 560Z" fill="#7f8a90"/>` +
      `<rect x="330" y="80" width="30" height="140" fill="#6a7378"/><path d="M345 80 Q330 40 360 20" stroke="#fff" stroke-width="16" opacity=".4" fill="none" stroke-linecap="round"/>` +
      `<rect x="20" y="300" width="360" height="40" fill="#46708a"/>` + text(200, 327, "AGBARA INDUSTRIAL ESTATE", 15, "#fff") + floor(420, "#6a6a64", "#4a4a46"),

    /* ── Dami's world ── */
    mansion: () => `<rect width="400" height="560" fill="#1c1a22"/>` + glow(200, 40, 200, "#ffe2a8", 0.35) +
      `<g transform="translate(200 40)"><path d="M-40 0 L40 0 L28 30 L-28 30Z" fill="#d9b25a" opacity=".8"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-34 + i * 8.5} 30 L${-34 + i * 8.5} ${44 + (i % 3) * 8}" stroke="#ffe9b0" stroke-width="2"/><circle cx="${-34 + i * 8.5}" cy="${46 + (i % 3) * 8}" r="2.4" fill="#fff6d0"/>`).join("")}</g>` +
      `<rect x="40" y="120" width="320" height="180" rx="6" fill="#050505"/><rect x="48" y="128" width="304" height="164" fill="#1b3a6b"/>` + text(200, 190, "OGUNLEYE", 30, "#ffd84a") + text(200, 222, "FOR GOVERNOR", 20, "#fff") + text(200, 252, "A FATHER TO ALL", 12, "#9fd3ff") +
      `<rect x="0" y="300" width="400" height="16" fill="#2a2630"/>` + floor(316, "#e8e2d6", "#bdb5a6") + `<path d="M0 316 L400 316" stroke="#fff" opacity=".4"/>` +
      `<rect x="30" y="380" width="340" height="70" rx="26" fill="#f3efe6"/><rect x="40" y="360" width="320" height="40" rx="18" fill="#e7e0d2"/><rect x="170" y="470" width="60" height="20" rx="4" fill="#c9a227" opacity=".6"/>` + `<rect x="360" y="200" width="30" height="120" fill="#2d6a3a"/><ellipse cx="375" cy="190" rx="26" ry="40" fill="#3f8a4a"/>`,
    bedroom: () => `<rect width="400" height="560" fill="#14122a"/>` + glow(320, 260, 180, "#7a4aff", 0.35) + glow(80, 300, 140, "#ff3fa4", 0.2) +
      `<rect x="200" y="200" width="180" height="100" rx="6" fill="#0a0a14"/><rect x="206" y="206" width="168" height="88" fill="#3a1a6a"/><path d="M220 280 L260 230 L300 260 L360 220" stroke="#ff6aa8" stroke-width="3" fill="none"/>` +
      `<rect x="40" y="220" width="130" height="80" rx="6" fill="#0a0a14"/><rect x="46" y="226" width="118" height="68" fill="#123a5a"/>` +
      `<rect x="0" y="300" width="400" height="22" fill="#2a2440"/><path d="M0 300 L400 300" stroke="#9a5aff" stroke-width="2" opacity=".7"/>` + floor(322, "#1d1a30", "#110f1e") +
      `<rect x="10" y="420" width="200" height="60" rx="10" fill="#e9e6f2" opacity=".8"/><rect x="10" y="400" width="200" height="26" rx="10" fill="#6a5aa8"/>` + `<path d="M300 470 l12 -30 l18 0 l8 30Z" fill="#b8b8b8"/>`,
    kitchen: () => `<rect width="400" height="560" fill="#e9e2cf"/>` + `<rect x="120" y="20" width="160" height="10" rx="5" fill="#fff"/>` + glow(200, 30, 200, "#ffffff", 0.5) +
      Array.from({ length: 5 }, (_, i) => `<rect x="${20 + i * 76}" y="80" width="66" height="110" rx="3" fill="#c9b48a" stroke="#a89068" stroke-width="3"/><circle cx="${74 + i * 76}" cy="140" r="3" fill="#6a5434"/>`).join("") +
      `<rect x="0" y="300" width="400" height="20" fill="#d6cfbf"/><rect x="0" y="320" width="400" height="100" fill="#a89068"/>` +
      `<rect x="40" y="250" width="70" height="50" rx="6" fill="#3a3a3a"/><rect x="50" y="262" width="24" height="14" rx="3" fill="#8a8a8a"/><circle cx="94" cy="270" r="7" fill="#555"/>` + `<ellipse cx="290" cy="290" rx="40" ry="10" fill="#2b2b2b"/><rect x="250" y="270" width="80" height="20" fill="#3a3a3a"/>` + `<path class="smoke" d="M290 260 Q280 230 296 200" stroke="#fff" stroke-width="10" fill="none" opacity=".25" stroke-linecap="round"/>` + floor(420, "#bfb59f", "#9a907a"),
    club: () => `<rect width="400" height="560" fill="#0a0a14"/>` + glow(200, 160, 220, "#2a7aff", 0.35) + glow(60, 300, 160, "#ff2a6a", 0.3) + glow(340, 300, 160, "#ffd84a", 0.25) +
      Array.from({ length: 7 }, (_, i) => `<path d="M${200} 0 L${i * 66 - 10} 420" stroke="${["#2a7aff", "#ff2a6a", "#ffd84a"][i % 3]}" stroke-width="3" opacity=".25"/>`).join("") +
      `<rect x="60" y="260" width="280" height="50" fill="#141420"/><rect x="60" y="250" width="280" height="12" fill="#2a2a3a"/>` +
      [110, 200, 290].map((x) => `<rect x="${x - 6}" y="200" width="12" height="50" rx="3" fill="#1a4a2a"/><path class="bulb" d="M${x} 196 l-6 -16 l6 6 l6 -6Z" fill="#ffe9a8"/>`).join("") +
      Array.from({ length: 8 }, (_, i) => person(30 + i * 50, 480 + (i % 2) * 12, 1.2, "#05050a", 0.9)).join(""),
    bridge: (cp) => sky("#03050c", "#0b1430", "#121a33") + skyline(250, "#0a0f22", 33, 0.2) +
      `<rect y="270" width="400" height="290" fill="#04080f"/>` + Array.from({ length: 30 }, (_, i) => `<rect x="${(i * 53) % 400}" y="${300 + ((i * 29) % 240)}" width="${10 + (i % 4) * 6}" height="1.5" fill="#ffcf70" opacity=".18"/>`).join("") +
      `<path d="M-20 420 Q200 360 420 330 L420 380 Q200 410 -20 470Z" fill="#3a3a40"/><path d="M-20 420 Q200 360 420 330" stroke="#8a8a90" stroke-width="4" fill="none"/><path d="M-20 446 Q200 386 420 356" stroke="#f4f0e0" stroke-width="2" stroke-dasharray="14 14" fill="none" opacity=".5"/>` +
      Array.from({ length: 6 }, (_, i) => { const x = 20 + i * 76, y = 410 - i * 15; return `<path d="M${x} ${y} L${x} ${y - 90} L${x + 14} ${y - 92}" stroke="#555" stroke-width="3" fill="none"/>` + glow(x + 14, y - 88, 40, "#ffc35a", 0.5); }).join("") +
      (cp ? `<rect x="230" y="330" width="16" height="24" fill="#e85a1a"/><rect x="230" y="336" width="16" height="4" fill="#fff"/><rect x="270" y="320" width="16" height="24" fill="#e85a1a"/><rect x="270" y="326" width="16" height="4" fill="#fff"/>` + glow(250, 330, 70, "#fff6d0", 0.5) + glow(330, 300, 90, "#2a6aff", 0.45) + glow(360, 300, 80, "#ff2a2a", 0.35) + `<rect x="300" y="290" width="90" height="40" rx="6" fill="#1a1a1e"/>` + text(345, 316, "POLICE", 12, "#fff") : ""),
    rehab: () => sky("#bfe0f0", "#e6f2f0") + `<rect x="0" y="180" width="400" height="200" fill="#f2efe8"/><path d="M0 180 L400 180" stroke="#cfc8b8" stroke-width="4"/>` + `<rect x="60" y="220" width="60" height="70" fill="#9fc7d8"/><rect x="280" y="220" width="60" height="70" fill="#9fc7d8"/>` + text(200, 210, "NEW DAWN RECOVERY · ABEOKUTA", 12, "#2f7a5a") +
      `<rect x="0" y="380" width="400" height="180" fill="#6fae5a"/>` + [40, 360].map((x) => `<rect x="${x - 6}" y="250" width="12" height="140" fill="#6a4a2a"/><circle cx="${x}" cy="240" r="48" fill="#3f8a3a"/>`).join("") +
      [120, 170, 220, 270].map((x, i) => `<g transform="translate(${x} ${430 + (i % 2) * 6})"><rect x="-14" y="-24" width="28" height="22" rx="4" fill="#f4f4f0"/><rect x="-16" y="-4" width="32" height="6" fill="#e2e2dc"/><path d="M-12 2 L-12 20 M12 2 L12 20" stroke="#cfcfc8" stroke-width="3"/></g>`).join(""),
    yaba: () => `<rect width="400" height="560" fill="#c7b89a"/>` + `<path d="M0 0 L400 0 L400 40 L0 40Z" fill="#b5a584"/><path d="M190 40 L210 40 L210 90 L190 90Z" fill="#555"/><g class="smoke"><path d="M140 96 L260 84 M200 90 L200 90" stroke="#444" stroke-width="6"/></g><circle cx="200" cy="92" r="8" fill="#333"/>` +
      `<rect x="250" y="120" width="110" height="110" fill="#9fc7e8" stroke="#5a4a3a" stroke-width="8"/><path d="M305 120 L305 230 M250 175 L360 175" stroke="#5a4a3a" stroke-width="5"/>` + text(305, 160, "", 1, "#000") +
      `<rect x="40" y="150" width="140" height="90" fill="#efe6d0" opacity=".7"/>` + text(110, 190, "DAY 412", 18, "#2f7a5a") + text(110, 214, "one day at a time", 11, "#5a4a3a") +
      `<rect x="0" y="340" width="400" height="220" fill="#8a7a5f"/><rect x="200" y="380" width="190" height="70" rx="6" fill="#e9e2cf"/><rect x="200" y="368" width="190" height="20" rx="6" fill="#6a8aa8"/>` + `<rect x="30" y="360" width="90" height="10" fill="#6a4a2a"/><rect x="40" y="320" width="70" height="40" fill="#222"/><rect x="44" y="324" width="62" height="30" fill="#4aa3df" opacity=".8"/>`,
    boardroom: () => `<rect width="400" height="560" fill="#e8eef0"/>` + `<rect x="0" y="0" width="400" height="300" fill="#bcd6e0"/>` + skyline(300, "#9bb8c6", 41, 0.0) + Array.from({ length: 5 }, (_, i) => `<path d="M${i * 100} 0 L${i * 100} 300" stroke="#e8eef0" stroke-width="6"/>`).join("") +
      `<rect x="40" y="60" width="140" height="44" rx="8" fill="#0f5f3a"/>` + text(110, 89, "ColdRoom", 20, "#fff") +
      `<rect x="0" y="300" width="400" height="10" fill="#cfd8dc"/>` + floor(310, "#d9e0e2", "#b9c2c6") + `<rect x="30" y="400" width="340" height="30" rx="6" fill="#2b2f3a"/>` + laptop(80, 400, "#8ad0ff") + laptop(260, 400, "#a6ffcf") + `<rect x="350" y="250" width="20" height="60" fill="#7a5a3a"/><ellipse cx="360" cy="240" rx="26" ry="36" fill="#3f8a4a"/>`,
    study: () => `<rect width="400" height="560" fill="#3a2418"/>` + glow(320, 240, 120, "#ffc35a", 0.4) +
      [20, 110].map((x) => `<rect x="${x}" y="40" width="80" height="300" fill="#5a3a22"/>` + [80, 140, 200, 260, 320].map((y) => `<rect x="${x}" y="${y}" width="80" height="6" fill="#2a180c"/>` + Array.from({ length: 6 }, (_, k) => `<rect x="${x + 4 + k * 12}" y="${y - 34}" width="10" height="34" fill="${["#7a2e2e", "#2e4a7a", "#3a6a3a", "#c9a227", "#5a3a6a", "#8a5a2a"][(k + y) % 6]}"/>`).join("")).join("")).join("") +
      `<rect x="230" y="60" width="140" height="90" fill="#1b3a6b"/>` + text(300, 100, "OGUNLEYE", 18, "#ffd84a") + text(300, 124, "2027", 14, "#fff") +
      `<path d="M220 160 L220 330" stroke="#888" stroke-width="3"/><path d="M220 160 L260 166 L260 196 L220 190Z" fill="#008751"/><path d="M233 162 L247 164 L247 194 L233 192Z" fill="#fff"/>` +
      `<rect x="300" y="290" width="16" height="50" fill="#555"/><path d="M290 280 L326 280 L316 296 L300 296Z" fill="#c9a227"/>` + `<rect x="0" y="380" width="400" height="180" fill="#4a2a18"/><rect x="0" y="380" width="400" height="12" fill="#6a3a22"/>`,
    black: () => `<rect width="400" height="560" fill="#050505"/>`,
  };

  const MOOD = { market: "city", garage: "city", faculty: "city", buka: "city", factory: "city", hostel: "indoor", hostelnight: "night", lecture: "indoor", cafe: "indoor", rooftop: "night", office: "office", nwosu: "indoor", exam: "indoor", workshop: "night", party: "party", bush: "tense", shrine: "tense", prison: "tense", hospital: "indoor", stage: "indoor", street: "night", black: "tense", mansion: "indoor", bedroom: "night", kitchen: "indoor", club: "party", bridge: "night", checkpoint: "tense", rehab: "city", yaba: "city", boardroom: "indoor", study: "tense" };

  const ALIAS = { hostelnight: ["hostel", true], checkpoint: ["bridge", true] };
  function place(name) {
    const [base, flag] = ALIAS[name] || [name, false];
    const fn = P[base] || P.black;
    return `<svg class="place" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${fn(flag)}</svg>`;
  }

  window.LL_ART = Object.assign(window.LL_ART || {}, { place, placeMood: MOOD, places: Object.keys(P).concat(Object.keys(ALIAS)) });
})();
