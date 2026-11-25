/*
  LAGOS LIVES — character art.
  Every character is drawn in code as layered SVG, so expressions and outfits can change live.
  LL_ART.portrait(id, { mood, variant }) -> SVG string
  Moods: neutral, happy, sad, worried, angry, shocked, smug
*/
(function () {
  let uidN = 0;
  const uid = (p) => p + "-" + ++uidN;

  function hex(h) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  function toHex(a) { return "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function shade(h, amt) { const c = hex(h); return toHex(c.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); }

  /* ── Designs ── */
  const CH = {
    femi:     { skin: "#7a4a2c", w: 40, hair: "lowcut", outfit: { type: "tee", c: "#2e6e8e", c2: "#f0d9a0" }, ex: [] },
    mama:     { skin: "#5e3821", w: 42, hair: "gele", hc: "#e2702a", hc2: "#2b4fa0", outfit: { type: "buba", c: "#e2702a", c2: "#2b4fa0", c3: "#f4c430" }, ex: ["hoops", "lines"], fem: true },
    kemi:     { skin: "#7d4c2d", w: 36, hair: "puffs", outfit: { type: "uniform", c: "#f4f4ef", c2: "#2f7a4a" }, ex: ["lashes"], fem: true },
    dele:     { skin: "#4b2c19", w: 41, hair: "fade", outfit: { type: "polo", c: "#2f8a5c", c2: "#1f5e3e" }, ex: ["glasses"] },
    kaycee:   { skin: "#83502f", w: 39, hair: "twists", tip: "#e0b040", outfit: { type: "jersey", c: "#c8312f", c2: "#f1f1f1" }, ex: ["stud", "chainthin"], mood: "smug" },
    chairman: { skin: "#3f2414", w: 43, hair: "waves", outfit: { type: "shirt", c: "#1a1a1d", c2: "#c9a227" }, ex: ["beard", "chain", "stud"], mood: "smug" },
    lola:     { skin: "#8c5a37", w: 37, hair: "braids", outfit: { type: "top", c: "#b98ad8" }, ex: ["hoops", "lashes"], fem: true, lip: "#6e2e3a" },
    dami:     { skin: "#a0704a", w: 39, hair: "afro", outfit: { type: "shirt", c: "#ece6d6", c2: "#2a6fbd" }, ex: ["sunglasses", "chain"], mood: "smug" },
    nwosu:    { skin: "#5c3a24", w: 41, hair: "bob", outfit: { type: "blazer", c: "#7a1f2b", c2: "#f0e6d8" }, ex: ["glasses", "pearls", "lashes", "lines"], fem: true },
    okon:     { skin: "#4f311e", w: 44, hair: "cap", hc: "#5b5b4a", outfit: { type: "shirt", c: "#b9c3c9", c2: "#8a9399" }, ex: ["moustache", "stubble"] },
    baba:     { skin: "#3b2416", w: 42, hair: "fila", hc: "#a51d1d", outfit: { type: "robe", c: "#ece4d2" }, ex: ["whitebeard", "beads", "lines"] },
    conductor:{ skin: "#5a3820", w: 40, hair: "backcap", hc: "#2b6cb0", outfit: { type: "singlet", c: "#efeee6" }, ex: ["stubble"] },
    pc:       { skin: "#6f432a", w: 37, hair: "ponytail", outfit: { type: "blazer", c: "#2b2f3a", c2: "#f2d7c5" }, ex: ["stud", "lashes"], fem: true, lip: "#7a3a3a" },
    creative: { skin: "#5b3622", w: 39, hair: "locs", tip: "#b5652b", outfit: { type: "hoodie", c: "#e0a43a", c2: "#2f2f2f" }, ex: ["headphones", "stud"] },
    abuja:    { skin: "#9a6644", w: 36, hair: "straight", outfit: { type: "top", c: "#f3e2c7" }, ex: ["hoops", "lashes", "chainthin"], fem: true, lip: "#7a3040" },
  };

  const VARIANTS = {
    femi: {
      drip: { outfit: { type: "shirt", c: "#141414", c2: "#c9a227" }, ex: ["chain", "stud"] },
      tired: { ex: ["bags"] },
      workshop: { outfit: { type: "overalls", c: "#3b5f8a", c2: "#e9e2cf" }, ex: [] },
      prison: { outfit: { type: "tee", c: "#c9c3b4", c2: "#c9c3b4" }, ex: ["bags", "stubble"] },
      hospital: { outfit: { type: "gown", c: "#9fc7c0", c2: "#7fa9a2" }, ex: ["bags"] },
      suit: { outfit: { type: "blazer", c: "#1f2b3a", c2: "#f4f1ea" }, ex: ["glasses"] },
    },
  };

  /* ── Face parts ── */
  const BROWS = {
    neutral: "M76 81 Q84 77 92 80", happy: "M76 80 Q84 75 92 79", sad: "M76 81 Q84 80 92 76",
    worried: "M76 82 Q84 79 92 76", angry: "M76 77 Q84 79 93 84", shocked: "M76 76 Q84 71 92 75", smug: "M76 81 Q84 78 92 80",
  };
  const mirror = (d) => d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (m, x, y) => `${200 - +x} ${y}`);

  function face(c, mood, ex) {
    const dark = shade(c.skin, -0.35), lip = c.lip || shade(c.skin, -0.3);
    let s = "";
    // cheek shadow + forehead light
    s += `<ellipse cx="100" cy="72" rx="22" ry="12" fill="#fff" opacity=".07"/>`;
    s += `<path d="M66 104 Q72 128 92 140" stroke="${dark}" stroke-width="6" fill="none" opacity=".18" stroke-linecap="round"/>`;
    // eyes
    const ry = { happy: 3.2, shocked: 6, angry: 3.8, smug: 3.6, sad: 4.2 }[mood] || 4.6;
    const look = mood === "smug" ? 1.6 : 0;
    [84, 116].forEach((x) => {
      s += `<ellipse cx="${x}" cy="93" rx="7.5" ry="${ry}" fill="#f6efe6"/>`;
      s += `<circle cx="${x + look}" cy="93" r="${Math.min(3.9, ry)}" fill="#24150d"/>`;
      s += `<circle cx="${x + look + 1.2}" cy="91.8" r="1.1" fill="#fff"/>`;
      if (mood === "sad" || mood === "worried" || ex.includes("bags")) s += `<path d="M${x - 8} ${93 - ry + 1} Q${x} ${93 - ry - 1.5} ${x + 8} ${93 - ry + 1} L${x + 8} ${93 - ry + 2.6} Q${x} ${93 - ry + 0.5} ${x - 8} ${93 - ry + 2.6}Z" fill="${shade(c.skin, -0.1)}"/>`;
      s += `<ellipse class="lid" style="transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0)" cx="${x}" cy="93" rx="8.2" ry="${ry + 0.8}" fill="${shade(c.skin, -0.05)}"/>`;
      if (ex.includes("bags")) s += `<path d="M${x - 7} 100 Q${x} 104 ${x + 7} 100" stroke="${dark}" stroke-width="1.6" fill="none" opacity=".6"/>`;
      if (ex.includes("lashes")) { const o = x < 100 ? -1 : 1; s += `<path d="M${x + o * 7} 91 l${o * 4} -3 M${x + o * 5} 89.5 l${o * 3} -3.5" stroke="#1a100a" stroke-width="1.4" stroke-linecap="round"/>`; }
      if (ex.includes("lines")) s += `<path d="M${x + (x < 100 ? -11 : 11)} 95 l${x < 100 ? -3 : 3} 3" stroke="${dark}" stroke-width="1.2" opacity=".5"/>`;
    });
    // brows
    const bl = BROWS[mood] || BROWS.neutral;
    const br = mood === "smug" ? "M108 76 Q116 72 124 75" : mirror(bl);
    const bc = shade(c.skin, -0.65);
    s += `<path d="${bl}" stroke="${bc}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="${br}" stroke="${bc}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    // nose
    s += `<path d="M100 95 L100 107" stroke="#fff" stroke-width="2" opacity=".1" stroke-linecap="round"/>`;
    s += `<path d="M91 110 Q95 115 100 113 Q105 115 109 110" stroke="${dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="95" cy="111" rx="2" ry="1.3" fill="${dark}"/><ellipse cx="105" cy="111" rx="2" ry="1.3" fill="${dark}"/>`;
    // mouth
    const M = {
      neutral: `<path d="M89 124 Q100 126.5 111 124" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M92 127 Q100 130 108 127" stroke="${lip}" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>`,
      happy: `<path d="M87 120 Q100 136 113 120 Q100 125 87 120Z" fill="#3a1610"/><path d="M89.5 121.3 Q100 125.5 110.5 121.3 L109 123.5 Q100 126.5 91 123.5Z" fill="#f4efe6"/><path d="M87 120 Q100 136 113 120" stroke="${lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      sad: `<path d="M90 128 Q100 121 110 128" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
      worried: `<path d="M90 126 Q95 122.5 100 125.5 Q105 128.5 110 124.5" stroke="${lip}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
      angry: `<path d="M89 125 Q100 122.5 111 125" stroke="${lip}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M93 127.5 L107 127.5" stroke="${shade(lip, -0.3)}" stroke-width="1.4" opacity=".6"/>`,
      shocked: `<ellipse cx="100" cy="126" rx="5.5" ry="7" fill="#3a1610" stroke="${lip}" stroke-width="2.4"/>`,
      smug: `<path d="M89 125 Q103 128 112 119" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    };
    s += M[mood] || M.neutral;
    return s;
  }

  /* ── Hair ── */
  function hairBack(c) {
    const h = c.hcol || "#1b1210", hl = shade(h, 0.18);
    switch (c.hair) {
      case "afro": return `<circle cx="100" cy="76" r="58" fill="${h}"/>`;
      case "braids": {
        let s = `<path d="M58 80 C48 140 44 200 50 252 L150 252 C156 200 152 140 142 80Z" fill="${h}"/>`;
        for (let x = 56; x <= 144; x += 8) s += `<path d="M${x} 90 Q${x - 3} 170 ${x + (x < 100 ? -4 : 4)} 250" stroke="${hl}" stroke-width="1.4" fill="none" opacity=".55"/>`;
        return s;
      }
      case "bob": return `<path d="M56 86 C50 122 56 144 70 150 L130 150 C144 144 150 122 144 86Z" fill="${h}"/>`;
      case "ponytail": return `<path d="M128 60 C162 64 170 110 160 168 C156 188 150 196 146 200 C150 160 150 110 128 84Z" fill="${h}"/>`;
      case "locs": {
        let s = "";
        for (let x = 58; x <= 142; x += 7) s += `<path d="M${x} 70 Q${x + (x - 100) * 0.15} 150 ${x + (x - 100) * 0.35} 214" stroke="${h}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="${x + (x - 100) * 0.35}" cy="214" r="3.6" fill="${c.tip || h}"/>`;
        return s;
      }
      case "straight": return `<path d="M56 80 C46 150 48 212 54 252 L146 252 C152 212 154 150 144 80Z" fill="${h}"/><path d="M66 100 C60 160 62 210 66 250" stroke="${hl}" stroke-width="3" opacity=".35" fill="none"/>`;
      case "puffs": return `<circle cx="66" cy="50" r="19" fill="${h}"/><circle cx="134" cy="50" r="19" fill="${h}"/>`;
      default: return "";
    }
  }

  function hairFront(c) {
    const h = c.hcol || "#1b1210", hl = shade(h, 0.22);
    const cap = `<path d="M61 88 C57 52 78 40 100 40 C122 40 143 52 139 88 C135 70 124 61 100 61 C76 61 65 70 61 88Z" fill="${h}"/>`;
    switch (c.hair) {
      case "lowcut": return cap;
      case "fade": return cap + `<path d="M61 88 C60 78 62 70 66 64 L64 88Z M139 88 C140 78 138 70 134 64 L136 88Z" fill="${hl}" opacity=".5"/>`;
      case "waves": {
        let s = cap;
        for (let y = 47; y <= 59; y += 6) s += `<path d="M72 ${y + 4} Q79 ${y} 86 ${y + 4} Q93 ${y + 8} 100 ${y + 4} Q107 ${y} 114 ${y + 4} Q121 ${y + 8} 128 ${y + 4}" stroke="${hl}" stroke-width="1.6" fill="none" opacity=".6"/>`;
        return s;
      }
      case "twists": {
        let s = cap;
        for (let x = 66; x <= 134; x += 8.5) { const t = 30 + Math.abs(100 - x) * 0.25; s += `<rect x="${x - 4}" y="${t}" width="8" height="24" rx="4" fill="${h}"/><rect x="${x - 4}" y="${t}" width="8" height="8" rx="4" fill="${c.tip}"/>`; }
        return s;
      }
      case "afro": return `<path d="M58 92 C52 48 76 34 100 34 C124 34 148 48 142 92 C136 66 122 58 100 58 C78 58 64 66 58 92Z" fill="${h}"/>`;
      case "braids": return `<path d="M60 94 C55 50 80 36 100 36 C120 36 145 50 140 94 C136 64 118 56 100 58 C82 56 64 64 60 94Z" fill="${h}"/><path d="M100 38 L100 58" stroke="${shade(c.skin, -0.2)}" stroke-width="1.6"/><circle cx="62" cy="150" r="3" fill="#e0b040"/><circle cx="140" cy="158" r="3" fill="#e0b040"/><circle cx="56" cy="190" r="3" fill="#e0b040"/>`;
      case "bob": return `<path d="M58 96 C54 52 80 38 104 38 C128 38 146 54 142 96 C138 74 128 62 112 60 C100 70 80 72 58 96Z" fill="${h}"/><path d="M118 44 C128 50 136 60 138 74" stroke="#8d8580" stroke-width="3" fill="none" opacity=".7"/>`;
      case "ponytail": return `<path d="M61 86 C57 50 78 38 100 38 C122 38 143 50 139 86 C134 66 122 58 100 58 C78 58 66 66 61 86Z" fill="${h}"/><path d="M76 50 Q100 40 128 54" stroke="${hl}" stroke-width="2" fill="none" opacity=".5"/><rect x="128" y="60" width="9" height="12" rx="3" fill="#c94f4f"/>`;
      case "locs": {
        let s = cap;
        [70, 82, 118, 130].forEach((x) => (s += `<path d="M${x} 58 Q${x + (x < 100 ? -6 : 6)} 80 ${x + (x < 100 ? -10 : 10)} 100" stroke="${h}" stroke-width="7" fill="none" stroke-linecap="round"/>`));
        return s;
      }
      case "straight": return `<path d="M58 100 C52 54 78 36 104 36 C130 36 148 54 142 96 C140 74 128 60 112 58 C96 64 72 74 58 100Z" fill="${h}"/><path d="M84 46 Q110 38 132 56" stroke="${hl}" stroke-width="3" fill="none" opacity=".45"/>`;
      case "puffs": {
        let s = `<path d="M61 86 C58 52 78 42 100 42 C122 42 142 52 139 86 C135 70 124 62 100 62 C76 62 65 70 61 86Z" fill="${h}"/>`;
        [80, 92, 108, 120].forEach((x) => (s += `<path d="M${x} 46 Q${x + (x < 100 ? -4 : 4)} 54 ${x + (x < 100 ? -8 : 8)} 62" stroke="${hl}" stroke-width="1.4" fill="none" opacity=".5"/>`));
        return s;
      }
      case "gele": {
        const p = `<pattern id="${c._gid}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="14" height="14" fill="${c.hc}"/><circle cx="7" cy="7" r="3.2" fill="${c.hc2}"/><path d="M0 0 L14 0" stroke="#f4c430" stroke-width="2"/></pattern>`;
        return `<defs>${p}</defs><path d="M44 84 C34 34 70 6 104 8 C140 8 170 34 158 84 C150 62 130 52 100 54 C72 52 54 62 44 84Z" fill="url(#${c._gid})"/><path d="M100 12 C76 -12 128 -18 150 16 C132 6 116 6 100 12Z" fill="url(#${c._gid})"/><path d="M54 74 C70 60 132 58 148 74" stroke="${shade(c.hc, -0.3)}" stroke-width="3" fill="none" opacity=".6"/>`;
      }
      case "cap": return `<path d="M60 76 C60 44 140 42 142 76Z" fill="${c.hc}"/><path d="M58 76 L150 76 C152 82 146 84 140 82 L60 82Z" fill="${shade(c.hc, -0.25)}"/>`;
      case "fila": return `<path d="M62 72 C60 34 140 32 140 72Z" fill="${c.hc}"/><path d="M118 40 C140 30 158 44 150 62 C144 52 134 46 120 50Z" fill="${shade(c.hc, -0.2)}"/><path d="M62 72 L140 72" stroke="#e8c24a" stroke-width="3"/><path d="M60 86 C58 78 60 74 64 72 M140 86 C142 78 140 74 136 72" stroke="#e9e4da" stroke-width="5" fill="none"/>`;
      case "backcap": return `<path d="M60 78 C58 42 142 42 140 78Z" fill="${c.hc}"/><path d="M60 72 C46 70 40 64 44 58 C52 60 58 64 62 66Z" fill="${shade(c.hc, -0.3)}"/><rect x="94" y="72" width="12" height="6" rx="2" fill="${shade(c.hc, -0.3)}"/>`;
      default: return cap;
    }
  }

  /* ── Outfits ── */
  const TORSO = "M12 252 C16 194 52 170 100 168 C148 170 184 194 188 252Z";
  function outfit(o, c) {
    const d = shade(o.c, -0.22), skin = c.skin;
    let s = `<path d="${TORSO}" fill="${o.c}"/>`;
    s += `<path d="M30 252 C34 214 54 194 70 186" stroke="${d}" stroke-width="3" fill="none" opacity=".5"/><path d="M170 252 C166 214 146 194 130 186" stroke="${d}" stroke-width="3" fill="none" opacity=".5"/>`;
    switch (o.type) {
      case "tee": s += `<path d="M80 170 Q100 186 120 170" fill="${skin}" stroke="${d}" stroke-width="4"/><path d="M60 214 L140 214" stroke="${o.c2}" stroke-width="7" opacity=".9"/><path d="M60 226 L140 226" stroke="${o.c2}" stroke-width="3" opacity=".7"/><path d="M48 180 L64 252" stroke="#2a2a2a" stroke-width="7" opacity=".8"/>`; break;
      case "polo": s += `<path d="M84 170 L100 194 L116 170Z" fill="${skin}"/><path d="M80 168 L98 196 L88 200 L72 176Z M120 168 L102 196 L112 200 L128 176Z" fill="${o.c2}"/><circle cx="100" cy="206" r="2" fill="#f2f2f2"/><circle cx="100" cy="216" r="2" fill="#f2f2f2"/>`; break;
      case "jersey": s += `<path d="M84 170 L100 192 L116 170Z" fill="${skin}" stroke="${o.c2}" stroke-width="4"/>`; for (let x = 40; x <= 160; x += 24) s += `<path d="M${x} 186 L${x - 6} 252" stroke="${shade(o.c, -0.3)}" stroke-width="7" opacity=".6"/>`; s += `<text x="100" y="236" font-family="Arial Black, sans-serif" font-size="26" text-anchor="middle" fill="${o.c2}">10</text>`; break;
      case "shirt": {
        const pid = uid("pt");
        s = `<defs><pattern id="${pid}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${o.c}"/><path d="M9 2 L12 9 L9 16 L6 9Z" fill="${o.c2}" opacity=".55"/></pattern></defs><path d="${TORSO}" fill="url(#${pid})"/>`;
        s += `<path d="M84 170 L100 200 L116 170Z" fill="${skin}"/><path d="M78 166 L100 202 L90 206 L70 178Z M122 166 L100 202 L110 206 L130 178Z" fill="${shade(o.c, 0.08)}"/><path d="M100 204 L100 252" stroke="${d}" stroke-width="2"/>`; break;
      }
      case "buba": {
        const pid = uid("ak");
        s = `<defs><pattern id="${pid}" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${o.c}"/><circle cx="11" cy="11" r="6" fill="${o.c2}"/><circle cx="11" cy="11" r="2.6" fill="${o.c3}"/><path d="M0 0 L22 22 M22 0 L0 22" stroke="${o.c3}" stroke-width="1.2" opacity=".5"/></pattern></defs><path d="${TORSO}" fill="url(#${pid})"/>`;
        s += `<path d="M74 172 Q100 196 126 172" fill="${skin}" stroke="${o.c3}" stroke-width="3"/>`; break;
      }
      case "uniform": s += `<path d="M84 170 L100 192 L116 170Z" fill="${skin}"/><path d="M78 166 L98 194 L86 198 L70 176Z M122 166 L102 194 L114 198 L130 176Z" fill="#fff"/><path d="M58 252 L66 196 L80 196 L76 252Z M142 252 L134 196 L120 196 L124 252Z" fill="${o.c2}"/><path d="M76 222 L124 222 L126 252 L74 252Z" fill="${o.c2}"/>`; break;
      case "blazer": s += `<path d="M82 170 L100 230 L118 170Z" fill="${o.c2}"/><path d="M76 168 L100 236 L86 252 L56 252 L64 190Z M124 168 L100 236 L114 252 L144 252 L136 190Z" fill="${shade(o.c, -0.12)}"/><path d="M84 172 Q100 186 116 172" fill="${skin}"/>`; break;
      case "top": s += `<path d="M76 172 Q100 210 124 172" fill="${skin}"/><path d="M76 172 Q100 210 124 172" stroke="${shade(o.c, -0.25)}" stroke-width="3" fill="none"/>`; break;
      case "hoodie": s += `<path d="M64 176 C70 160 130 160 136 176 C126 190 74 190 64 176Z" fill="${shade(o.c, -0.18)}"/><path d="M86 176 Q100 186 114 176" fill="${skin}"/><path d="M92 190 L90 228 M108 190 L110 228" stroke="${o.c2}" stroke-width="2.4"/><circle cx="60" cy="226" r="3" fill="#3aa0d8"/><circle cx="140" cy="210" r="4" fill="#d8463a"/><circle cx="128" cy="236" r="2.4" fill="#5cc28a"/>`; break;
      case "singlet": s = `<path d="${TORSO}" fill="${skin}"/><path d="M52 252 C54 214 62 196 70 186 L82 184 Q100 208 118 184 L130 186 C138 196 146 214 148 252Z" fill="${o.c}"/>`; break;
      case "robe": s += `<path d="M70 174 Q100 204 130 174" fill="${skin}"/><path d="M40 190 Q100 260 160 190" stroke="${shade(o.c, -0.12)}" stroke-width="2" fill="none"/>`; break;
      case "overalls": s += `<path d="M80 170 Q100 186 120 170" fill="${skin}" stroke="${shade(o.c2, -0.2)}" stroke-width="3"/><path d="${TORSO}" fill="${o.c2}" opacity="0"/><path d="M64 210 L136 210 L144 252 L56 252Z" fill="${o.c}"/><path d="M70 178 L74 212 M130 178 L126 212" stroke="${o.c}" stroke-width="9"/><circle cx="74" cy="208" r="3" fill="#d8c27a"/><circle cx="126" cy="208" r="3" fill="#d8c27a"/>`; s = s.replace(`<path d="${TORSO}" fill="${o.c}"/>`, `<path d="${TORSO}" fill="${o.c2}"/>`); break;
      case "gown": s += `<path d="M82 170 Q100 186 118 170" fill="${skin}"/>`; for (let x = 30; x < 180; x += 16) for (let y = 196; y < 252; y += 16) s += `<circle cx="${x}" cy="${y}" r="2" fill="${o.c2}"/>`; break;
    }
    return s;
  }

  function extras(c, ex) {
    const dark = shade(c.skin, -0.4);
    let s = "";
    if (ex.includes("stubble")) s += `<path d="M66 108 C70 140 90 150 100 150 C110 150 130 140 134 108 C128 130 114 138 100 138 C86 138 72 130 66 108Z" fill="#1b1210" opacity=".22"/>`;
    if (ex.includes("beard")) s += `<path d="M64 104 C68 142 90 152 100 152 C110 152 132 142 136 104 C130 128 116 134 100 134 C84 134 70 128 64 104Z" fill="#1b1210"/><path d="M87 118 Q100 112 113 118 Q100 117 87 118Z" fill="#1b1210"/>`;
    if (ex.includes("whitebeard")) s += `<path d="M64 108 C66 156 88 172 100 172 C112 172 134 156 136 108 C130 132 116 138 100 138 C84 138 70 132 64 108Z" fill="#e9e4da"/><path d="M86 118 Q100 111 114 118 Q100 118 86 118Z" fill="#e9e4da"/>`;
    if (ex.includes("moustache")) s += `<path d="M88 118 Q100 112 112 118 Q100 117 88 118Z" fill="#1b1210"/>`;
    if (ex.includes("glasses")) s += `<g fill="none" stroke="#1d1a18" stroke-width="2.6"><rect x="73" y="85" width="22" height="16" rx="6"/><rect x="105" y="85" width="22" height="16" rx="6"/><path d="M95 92 Q100 89 105 92"/></g><path d="M77 88 L84 88" stroke="#fff" stroke-width="1.5" opacity=".5"/>`;
    if (ex.includes("sunglasses")) s += `<path d="M70 86 L96 86 L94 101 Q83 106 73 100Z M104 86 L130 86 L127 100 Q117 106 106 101Z" fill="#111"/><path d="M96 89 L104 89" stroke="#111" stroke-width="3"/><path d="M74 89 L84 89 M108 89 L118 89" stroke="#7fc8ff" stroke-width="2" opacity=".55"/>`;
    if (ex.includes("hoops")) s += `<circle cx="62" cy="110" r="7" fill="none" stroke="#e0b040" stroke-width="2.4"/><circle cx="138" cy="110" r="7" fill="none" stroke="#e0b040" stroke-width="2.4"/>`;
    if (ex.includes("stud")) s += `<circle cx="138" cy="104" r="2.6" fill="#f3f3f3"/>`;
    if (ex.includes("chain")) s += `<path d="M76 172 Q100 206 124 172" stroke="#d4af37" stroke-width="3.6" fill="none"/><rect x="95" y="190" width="10" height="13" rx="2" fill="#d4af37"/>`;
    if (ex.includes("chainthin")) s += `<path d="M80 172 Q100 198 120 172" stroke="#d4af37" stroke-width="1.8" fill="none"/>`;
    if (ex.includes("pearls")) for (let i = 0; i <= 10; i++) { const t = i / 10, x = 80 + 40 * t, y = 172 + Math.sin(Math.PI * t) * 18; s += `<circle cx="${x}" cy="${y}" r="2.6" fill="#f2ede3"/>`; }
    if (ex.includes("beads")) s += `<path d="M72 176 Q100 214 128 176" stroke="#c8402a" stroke-width="5" stroke-dasharray="2 5" stroke-linecap="round" fill="none"/><path d="M78 176 Q100 204 122 176" stroke="#f0d27a" stroke-width="4" stroke-dasharray="1 5" stroke-linecap="round" fill="none"/>`;
    if (ex.includes("headphones")) s += `<path d="M66 178 Q100 210 134 178" stroke="#222" stroke-width="5" fill="none"/><rect x="56" y="170" width="16" height="22" rx="6" fill="#222"/><rect x="128" y="170" width="16" height="22" rx="6" fill="#222"/>`;
    return s;
  }

  function portrait(id, o) {
    o = o || {};
    const base = CH[id];
    if (!base) return "";
    const v = (VARIANTS[id] && o.variant && VARIANTS[id][o.variant]) || {};
    const c = Object.assign({}, base, { outfit: v.outfit || base.outfit, _gid: uid("gele") });
    const ex = (base.ex || []).filter((e) => !(v.outfit && ["chain", "stud"].includes(e))).concat(v.ex || []);
    const mood = o.mood || base.mood || "neutral";
    const w = c.w, dark = shade(c.skin, -0.18);
    const head = `M100 44 C${100 + w * 0.66} 44 ${100 + w} 62 ${100 + w} 90 C${100 + w} 120 ${100 + w * 0.62} 142 100 144 C${100 - w * 0.62} 142 ${100 - w} 120 ${100 - w} 90 C${100 - w} 62 ${100 - w * 0.66} 44 100 44Z`;
    let s = `<svg class="portrait" viewBox="0 0 200 252" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
    s += hairBack(c);
    s += outfit(c.outfit, c);
    s += `<path d="M86 128 L114 128 L116 172 Q100 182 84 172Z" fill="${dark}"/>`;
    s += `<ellipse cx="${100 - w}" cy="97" rx="6.5" ry="10" fill="${dark}"/><ellipse cx="${100 + w}" cy="97" rx="6.5" ry="10" fill="${dark}"/>`;
    s += `<path d="${head}" fill="${c.skin}"/>`;
    s += face(c, mood, ex);
    s += hairFront(c);
    s += extras(c, ex);
    s += `</svg>`;
    return s;
  }

  window.LL_ART = Object.assign(window.LL_ART || {}, { portrait, characters: CH, shade });
})();
