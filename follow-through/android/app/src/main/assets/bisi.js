/* Bisi the bee — Follow-Through's mascot. bisiSvg(mood, size, animate, style) returns an SVG string.
 * Moods: happy, worried, sassy, sleepy, party, crying. Styles: polished (round body) and plushie (big head).
 * Original character, hand-drawn look with shading and fuzz. */
(function (root) {
  var INK = '#1E1606', BODY = '#F6C343', CHEEK = '#F29B8B', WING = '#CFEAF6', WING_EDGE = '#8FC3DA', GREEN = '#1E6A4E', TEAR = '#8FD0F0';
  var uid = 0;

  /* ---------- shared pieces ---------- */
  function defs(id, clip) {
    return '<defs>' +
      '<radialGradient id="bb' + id + '" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFE68A"/><stop offset="0.55" stop-color="#F6C343"/><stop offset="1" stop-color="#D3901A"/></radialGradient>' +
      '<linearGradient id="bw' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.96"/><stop offset="1" stop-color="#BFE3F3" stop-opacity="0.85"/></linearGradient>' +
      '<pattern id="bh' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="6" stroke="' + INK + '" stroke-width="1.3" opacity="0.26"/></pattern>' +
      '<clipPath id="bc' + id + '">' + clip + '</clipPath>' +
      '<filter id="bf' + id + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>' +
      '</defs>';
  }
  function flap(cx, cy, deg, animate) {
    return animate ? '<animateTransform attributeName="transform" type="rotate" values="0 ' + cx + ' ' + cy + ';' + deg + ' ' + cx + ' ' + cy + ';0 ' + cx + ' ' + cy + '" dur="0.18s" repeatCount="indefinite"/>' : '';
  }
  function droops(mood) { return mood === 'sleepy' || mood === 'crying'; }
  function stroke(w) { return ' stroke="' + INK + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"'; }

  /* ---------- Polished Bisi: one round body ---------- */
  function polishedBase(id, mood, animate) {
    var ant = droops(mood)
      ? '<path d="M86 64 C80 50 66 46 58 52 C50 58 56 66 62 62"' + stroke(3.6) + ' fill="none"/><path d="M114 64 C120 50 134 46 142 52 C150 58 144 66 138 62"' + stroke(3.6) + ' fill="none"/>'
      : '<path d="M86 64 C80 44 70 34 62 32 C54 30 51 41 60 43"' + stroke(3.6) + ' fill="none"/><path d="M114 64 C120 44 130 34 138 32 C146 30 149 41 140 43"' + stroke(3.6) + ' fill="none"/>';
    return '<ellipse cx="100" cy="188" rx="46" ry="7" fill="' + INK + '" opacity="0.14"/>' +
      '<g>' + flap(82, 70, -22, animate) +
        '<path d="M80 66 C42 20 8 46 28 74 C42 92 70 84 80 66Z" fill="url(#bw' + id + ')"' + stroke(3) + '/>' +
        '<path d="M76 68 C60 58 42 58 30 66 M74 72 C60 74 48 78 40 82" stroke="' + WING_EDGE + '" stroke-width="1.8" fill="none"/></g>' +
      '<g>' + flap(118, 70, 22, animate) +
        '<path d="M120 66 C158 20 192 46 172 74 C158 92 130 84 120 66Z" fill="url(#bw' + id + ')"' + stroke(3) + '/>' +
        '<path d="M124 68 C140 58 158 58 170 66 M126 72 C140 74 152 78 160 82" stroke="' + WING_EDGE + '" stroke-width="1.8" fill="none"/></g>' +
      (mood === 'party' ? '' : ant) +
      '<path d="M92 166 L100 184 L108 166Z" fill="' + INK + '"/>' +
      '<path d="M80 164 q-4 10 -12 10 M120 164 q4 10 12 10"' + stroke(4.5) + ' fill="none"/>' +
      '<ellipse cx="100" cy="114" rx="60" ry="56" fill="url(#bb' + id + ')"/>' +
      '<g clip-path="url(#bc' + id + ')">' +
        '<path d="M36 128 Q100 144 164 128 L164 142 Q100 158 36 142Z" fill="' + INK + '"/>' +
        '<path d="M40 152 Q100 168 160 152 L160 166 Q100 182 40 166Z" fill="' + INK + '"/>' +
        '<path d="M100 172 A60 56 0 0 0 162 112 L162 172Z" fill="url(#bh' + id + ')"/></g>' +
      '<ellipse cx="100" cy="114" rx="61" ry="57" fill="none" stroke="#C98A1B" stroke-width="4" filter="url(#bf' + id + ')"/>' +
      '<ellipse cx="100" cy="114" rx="60" ry="56" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
      '<ellipse cx="72" cy="80" rx="16" ry="9" transform="rotate(-25 72 80)" fill="#FFFFFF" opacity="0.6"/>' +
      '<circle cx="92" cy="70" r="3" fill="#FFFFFF" opacity="0.75"/>' +
      '<ellipse cx="62" cy="114" rx="9" ry="5.5" fill="' + CHEEK + '" opacity="' + (mood === 'sassy' ? 0.45 : 0.95) + '"/>' +
      '<ellipse cx="138" cy="114" rx="9" ry="5.5" fill="' + CHEEK + '" opacity="' + (mood === 'sassy' ? 0.45 : 0.95) + '"/>';
  }
  function bigEye(cx, cy, look) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="11" ry="13" fill="#FFFFFF"' + stroke(3) + '/>' +
      '<ellipse cx="' + (cx + 2 + look[0]) + '" cy="' + (cy + 3 + look[1]) + '" rx="6.5" ry="8" fill="' + INK + '"/>' +
      '<circle cx="' + (cx + 5 + look[0]) + '" cy="' + (cy - 1 + look[1]) + '" r="2.6" fill="#FFFFFF"/>' +
      '<circle cx="' + (cx - 1 + look[0]) + '" cy="' + (cy + 7 + look[1]) + '" r="1.3" fill="#FFFFFF"/>';
  }
  function polishedFace(mood) {
    switch (mood) {
      case 'worried':
        return bigEye(80, 98, [0, -3]) + bigEye(120, 98, [0, -3]) +
          '<path d="M68 86 L90 78"' + stroke(3.6) + '/><path d="M132 86 L110 78"' + stroke(3.6) + '/>' +
          '<path d="M86 127 Q93 121 100 127 Q107 133 114 127"' + stroke(3.4) + ' fill="none"/>' +
          '<path d="M150 66 Q143 77 150 81 Q157 77 150 66Z" fill="' + TEAR + '"' + stroke(2) + '/>';
      case 'sassy':
        return '<ellipse cx="80" cy="100" rx="11" ry="11" fill="#FFFFFF"' + stroke(3) + '/><circle cx="85" cy="102" r="6" fill="' + INK + '"/>' +
          '<ellipse cx="120" cy="100" rx="11" ry="11" fill="#FFFFFF"' + stroke(3) + '/><circle cx="125" cy="102" r="6" fill="' + INK + '"/>' +
          '<path d="M67 99 Q80 95 93 99 L93 87 L67 87Z" fill="#F6C343"/><path d="M68 99 Q80 95 92 99"' + stroke(3.2) + ' fill="none"/>' +
          '<path d="M107 99 Q120 95 133 99 L133 87 L107 87Z" fill="#F6C343"/><path d="M108 99 Q120 95 132 99"' + stroke(3.2) + ' fill="none"/>' +
          '<path d="M68 84 L92 88"' + stroke(3.6) + '/><path d="M108 80 Q120 70 133 77"' + stroke(3.6) + ' fill="none"/>' +
          '<path d="M90 126 Q104 128 114 120"' + stroke(3.4) + ' fill="none"/>' +
          '<path d="M44 134 Q74 152 124 138"' + stroke(13) + ' fill="none"/><path d="M44 134 Q74 152 124 138" stroke="#F6C343" stroke-width="7" stroke-linecap="round" fill="none"/>' +
          '<path d="M156 134 Q126 152 76 138"' + stroke(13) + ' fill="none"/><path d="M156 134 Q126 152 76 138" stroke="#F6C343" stroke-width="7" stroke-linecap="round" fill="none"/>';
      case 'sleepy':
        return '<path d="M70 100 Q80 107 90 100"' + stroke(3.6) + ' fill="none"/><path d="M110 100 Q120 107 130 100"' + stroke(3.6) + ' fill="none"/>' +
          '<ellipse cx="100" cy="124" rx="5" ry="6" fill="' + INK + '"/>' +
          '<text x="150" y="58" font-family="Patrick Hand, Arial, sans-serif" font-weight="700" font-size="22" fill="' + GREEN + '">z</text>' +
          '<text x="166" y="40" font-family="Patrick Hand, Arial, sans-serif" font-weight="700" font-size="16" fill="' + GREEN + '">z</text>';
      case 'party':
        return '<path d="M70 102 Q80 90 90 102"' + stroke(3.8) + ' fill="none"/><path d="M110 102 Q120 90 130 102"' + stroke(3.8) + ' fill="none"/>' +
          '<path d="M84 116 Q100 142 116 116Z" fill="' + INK + '"/><path d="M91 127 Q100 134 109 127" fill="#E86B5A"/>' +
          '<path d="M100 6 L80 58 L120 58Z" fill="' + GREEN + '"' + stroke(3) + '/><circle cx="100" cy="7" r="7" fill="' + '#F5B700' + '"' + stroke(2.4) + '/>' +
          '<circle cx="92" cy="44" r="3" fill="#F5B700"/><circle cx="105" cy="32" r="3" fill="#F5B700"/>' +
          '<path d="M24 40 l8 -8 M176 46 l-8 -8 M18 88 l10 0 M172 92 l10 0" stroke="#D9533B" stroke-width="4" stroke-linecap="round"/>';
      case 'crying':
        return '<path d="M70 92 L88 100 L70 108"' + stroke(3.6) + ' fill="none"/><path d="M130 92 L112 100 L130 108"' + stroke(3.6) + ' fill="none"/>' +
          '<path d="M66 84 L88 80"' + stroke(3.2) + '/><path d="M134 84 L112 80"' + stroke(3.2) + '/>' +
          '<path d="M80 110 Q74 126 78 146" stroke="' + TEAR + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
          '<path d="M120 110 Q126 126 122 146" stroke="' + TEAR + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
          '<path d="M84 132 Q100 114 116 132 Q100 126 84 132Z" fill="' + INK + '"/>';
      default: // happy
        return bigEye(80, 98, [0, 0]) + bigEye(120, 98, [0, 0]) +
          '<path d="M88 120 Q100 136 112 120Z" fill="' + INK + '"/><path d="M93 127 Q100 133 107 127" fill="#E86B5A"/>';
    }
  }

  /* ---------- Plushie Bisi: big head, small body ---------- */
  function plushieBase(id, mood, animate) {
    var ant = droops(mood)
      ? '<path d="M84 32 C78 22 66 22 60 30"' + stroke(3.6) + ' fill="none"/><circle cx="58" cy="34" r="7.5" fill="' + INK + '"/>' +
        '<path d="M116 32 C122 22 134 22 140 30"' + stroke(3.6) + ' fill="none"/><circle cx="142" cy="34" r="7.5" fill="' + INK + '"/>'
      : '<path d="M84 32 C80 18 72 12 66 12"' + stroke(3.6) + ' fill="none"/><circle cx="63" cy="12" r="7.5" fill="' + INK + '"/><circle cx="61" cy="10" r="2.2" fill="#FFFFFF"/>' +
        '<path d="M116 32 C120 18 128 12 134 12"' + stroke(3.6) + ' fill="none"/><circle cx="137" cy="12" r="7.5" fill="' + INK + '"/><circle cx="135" cy="10" r="2.2" fill="#FFFFFF"/>';
    return '<ellipse cx="100" cy="192" rx="40" ry="6" fill="' + INK + '" opacity="0.14"/>' +
      '<g>' + flap(76, 136, -30, animate) + '<ellipse cx="58" cy="128" rx="24" ry="15" transform="rotate(-35 58 128)" fill="url(#bw' + id + ')"' + stroke(3) + '/></g>' +
      '<g>' + flap(124, 136, 30, animate) + '<ellipse cx="142" cy="128" rx="24" ry="15" transform="rotate(35 142 128)" fill="url(#bw' + id + ')"' + stroke(3) + '/></g>' +
      '<path d="M94 180 L100 194 L106 180Z" fill="' + INK + '"/>' +
      '<ellipse cx="84" cy="182" rx="8" ry="5" fill="' + INK + '"/><ellipse cx="116" cy="182" rx="8" ry="5" fill="' + INK + '"/>' +
      '<ellipse cx="100" cy="150" rx="44" ry="34" fill="url(#bb' + id + ')"/>' +
      '<g clip-path="url(#bc' + id + ')"><rect x="50" y="146" width="100" height="10" fill="' + INK + '"/><rect x="50" y="166" width="100" height="10" fill="' + INK + '"/>' +
        '<path d="M100 184 A44 34 0 0 0 144 150 L144 184Z" fill="url(#bh' + id + ')"/></g>' +
      '<ellipse cx="100" cy="150" rx="44" ry="34" fill="none" stroke="' + INK + '" stroke-width="3.2"/>' +
      (mood === 'party' ? '' : ant) +
      '<circle cx="100" cy="82" r="54" fill="url(#bb' + id + ')"/>' +
      '<path d="M100 136 A54 54 0 0 0 154 82 L154 136Z" fill="url(#bh' + id + ')" opacity="0.7"/>' +
      '<circle cx="100" cy="82" r="55" fill="none" stroke="#C98A1B" stroke-width="4" filter="url(#bf' + id + ')"/>' +
      '<circle cx="100" cy="82" r="54" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
      '<ellipse cx="72" cy="50" rx="15" ry="8" transform="rotate(-30 72 50)" fill="#FFFFFF" opacity="0.6"/>' +
      '<ellipse cx="64" cy="102" rx="10" ry="6" fill="' + CHEEK + '"/><ellipse cx="136" cy="102" rx="10" ry="6" fill="' + CHEEK + '"/>';
  }
  function plushEye(cx, cy, hx, hy) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="12" ry="15" fill="' + INK + '"/>' +
      '<circle cx="' + (cx + hx) + '" cy="' + (cy + hy) + '" r="5" fill="#FFFFFF"/><circle cx="' + (cx - 3) + '" cy="' + (cy + 7) + '" r="2.2" fill="#FFFFFF"/>';
  }
  function star(cx, cy) {
    return '<path transform="translate(' + cx + ' ' + cy + ')" d="M0 -14 l4.5 9 10 1.4 -7.3 7 1.8 10 -9 -4.7 -9 4.7 1.8 -10 -7.3 -7 10 -1.4z" fill="#F5B700"' + stroke(2.4) + '/>';
  }
  function plushieFace(mood) {
    switch (mood) {
      case 'worried':
        return plushEye(80, 86, 3, -8) + plushEye(120, 86, 3, -8) +
          '<path d="M66 66 L90 60"' + stroke(3.6) + '/><path d="M134 66 L110 60"' + stroke(3.6) + '/>' +
          '<path d="M90 110 Q95 105 100 110 Q105 115 110 110"' + stroke(3.2) + ' fill="none"/>' +
          '<path d="M152 46 Q145 57 152 61 Q159 57 152 46Z" fill="' + TEAR + '"' + stroke(2) + '/>';
      case 'sassy':
        return '<ellipse cx="80" cy="88" rx="13" ry="9" fill="#FFFFFF"' + stroke(3) + '/><circle cx="88" cy="89" r="5.5" fill="' + INK + '"/>' +
          '<ellipse cx="120" cy="88" rx="13" ry="9" fill="#FFFFFF"' + stroke(3) + '/><circle cx="128" cy="89" r="5.5" fill="' + INK + '"/>' +
          '<path d="M66 85 H94"' + stroke(3.6) + '/><path d="M106 85 H134"' + stroke(3.6) + '/>' +
          '<path d="M68 72 L92 76"' + stroke(3.6) + '/><path d="M108 70 Q120 60 133 66"' + stroke(3.6) + ' fill="none"/>' +
          '<path d="M92 108 H112"' + stroke(3.4) + '/>' +
          '<path d="M150 104 q8 -2 10 4 q6 -4 10 2" stroke="#6E5A2C" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      case 'sleepy':
        return '<path d="M68 86 Q80 94 92 86"' + stroke(3.6) + ' fill="none"/><path d="M108 86 Q120 94 132 86"' + stroke(3.6) + ' fill="none"/>' +
          '<ellipse cx="100" cy="107" rx="4" ry="5" fill="' + INK + '"/>' +
          '<text x="148" y="40" font-family="Patrick Hand, Arial, sans-serif" font-weight="700" font-size="22" fill="' + GREEN + '">z</text>' +
          '<text x="164" y="24" font-family="Patrick Hand, Arial, sans-serif" font-weight="700" font-size="16" fill="' + GREEN + '">z</text>';
      case 'party':
        return star(80, 84) + star(120, 84) +
          '<path d="M88 102 Q100 122 112 102Z" fill="' + INK + '"/><path d="M93 110 Q100 116 107 110" fill="#E86B5A"/>' +
          '<path d="M100 0 L84 34 L116 34Z" fill="' + GREEN + '"' + stroke(3) + '/><circle cx="100" cy="2" r="6" fill="#F5B700"' + stroke(2.2) + '/>' +
          '<path d="M22 60 l8 -8 M178 64 l-8 -8 M20 104 l10 0 M170 108 l10 0" stroke="#D9533B" stroke-width="4" stroke-linecap="round"/>';
      case 'crying':
        return '<path d="M70 78 L88 86 L70 94"' + stroke(3.6) + ' fill="none"/><path d="M130 78 L112 86 L130 94"' + stroke(3.6) + ' fill="none"/>' +
          '<path d="M78 96 Q72 112 76 130" stroke="' + TEAR + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
          '<path d="M122 96 Q128 112 124 130" stroke="' + TEAR + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
          '<path d="M88 114 Q100 98 112 114 Q100 108 88 114Z" fill="' + INK + '"/>';
      default:
        return plushEye(80, 84, 4, -6) + plushEye(120, 84, 4, -6) +
          '<path d="M88 102 Q100 118 112 102Z" fill="' + INK + '"/><path d="M93 109 Q100 114 107 109" fill="#E86B5A"/>';
    }
  }

  /** Bisi as an SVG string. style: 'polished' (default) or 'plushie'. */
  function bisiSvg(mood, size, animate, style) {
    mood = mood || 'happy'; size = size || 96;
    var id = 'q' + (++uid);
    var plush = style === 'plushie';
    var clip = plush ? '<ellipse cx="100" cy="150" rx="44" ry="34"/>' : '<ellipse cx="100" cy="114" rx="60" ry="56"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="' + size + '" height="' + size + '" role="img" aria-label="Bisi the bee, ' + mood + '">' +
      defs(id, clip) + (plush ? plushieBase(id, mood, animate) + plushieFace(mood) : polishedBase(id, mood, animate) + polishedFace(mood)) + '</svg>';
  }

  /** Lines in Bisi's voice. Mostly passive-aggressive, occasionally sweet. {t} = title, {d} = days. */
  var LINES = {
    dueToday: ["{t} closes TODAY. I'm not mad. I'm just… hovering. 🐝", "Today. {t}. Today. Bee-lieve me, tomorrow is too late.", "It's deadline day for {t}. I cleared my whole schedule to watch you do this."],
    due: ["{t} closes in {d} days. Just thought you'd want to know. Again.", "Don't let {t} buzz off. {d} days left.", "Bee honest: have you even opened {t}?", "{d} days left for {t}. I'm sure you have a plan. Right? 🙂", "I've been buzzing about {t} since Tuesday. Your move."],
    dueEscalate: ["Okay. I'll just keep reminding you about {t} then. I have nothing but time. 🐝", "Fun fact: {t} doesn't apply for itself. I checked.", "I'm not saying I'm disappointed about {t}. I'm just saying I'm a bee and I'm sad."],
    soon: ["{t} closes in {d} days. Starting now would be very mature of you.", "Early bee gets the nectar. {t} closes in {d} days.", "One week until {t}. Future you is begging. I can hear her."],
    overdue: ["The deadline for {t} passed. Did you apply, or should I start grieving?", "{t} closed. Tell me what happened so I can stop asking. (I won't stop asking.)"],
    reminder: ["You asked me to remind you about {t}. So. Here I am. Reminding.", "Remember {t}? It remembers you."],
    check: ["It's been two weeks since you applied to {t}. Any news, or are we pretending it didn't happen?", "Heard back from {t}? I'm asking for a friend. The friend is me."],
    event: ["{t} is {when}. Registered yet? Asking very calmly.", "📅 {t} is {when}. Don't make me come to Victoria Island."],
    streak: ["{n} days of nectar collected. It'd be a shame to spill it. 🍯", "No pressure. (Pressure.) The flowers close at midnight. 🌼"],
    idle: ["You haven't saved anything in {n} days. I'm fine. Everything's fine.", "{n} days without a single opportunity. The bubble misses you. I miss you."],
    clear: ["All clear. Look at you being responsible. 🥹", "Nothing urgent. Bee-hold: a calm day. Enjoy it.", "Nothing urgent. I'm genuinely proud. Don't make it weird."],
    sweet: ["You're doing better than you think. Now go apply to something. 💛", "Small steps still count. I'm counting them. 🐝"],
    accepted: ["YOU GOT IN?! I'm telling every flower I know. 🎉", "Accepted! I always believed in you. (Mostly.)"],
    rejected: ["Their loss. Genuinely. On to the next one. 💛", "Rejected? Okay. We move. Next application, please."],
  };
  function pickLine(kind, vars, seed) {
    var arr = LINES[kind] || LINES.sweet;
    var i = typeof seed === 'number' ? Math.abs(seed) % arr.length : Math.floor(Math.random() * arr.length);
    return arr[i].replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] != null ? vars[k] : ''; });
  }


  /* ---------- Hive decorations ---------- */
  function hiveSvg(size) {
    size = size || 120;
    var bands = '';
    var widths = [34, 46, 54, 58, 58];
    for (var i = 0; i < widths.length; i++) {
      var w = widths[i], y = 22 + i * 15;
      bands += '<rect x="' + (60 - w) + '" y="' + y + '" width="' + (w * 2) + '" height="16" rx="8" fill="' + (i % 2 ? '#F3B33D' : '#F6C343') + '" stroke="' + INK + '" stroke-width="2.6"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="A beehive">' +
      '<rect x="56" y="6" width="8" height="12" rx="3" fill="' + INK + '"/>' +
      '<ellipse cx="60" cy="20" rx="20" ry="9" fill="#F6C343" stroke="' + INK + '" stroke-width="2.6"/>' +
      bands +
      '<rect x="6" y="96" width="108" height="10" rx="5" fill="#C98A1B" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M50 96 Q50 80 60 80 Q70 80 70 96 Z" fill="' + INK + '"/>' +
      '<circle cx="96" cy="30" r="3" fill="' + INK + '"/><ellipse cx="94" cy="26" rx="4" ry="2.5" fill="' + WING + '" stroke="' + WING_EDGE + '" stroke-width="1"/>' +
      '<path d="M96 30 q8 6 2 12 q-6 6 4 12" stroke="' + INK + '" stroke-width="1.4" stroke-dasharray="2 3" fill="none"/>' +
      '</svg>';
  }
  function honeycombSvg(size, color) {
    size = size || 40; color = color || '#F3B33D';
    function hex(cx, cy, r, fill) {
      var pts = [];
      for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 30); pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
      return '<polygon points="' + pts.join(' ') + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 52" width="' + size + '" height="' + (size * 52 / 60) + '" aria-hidden="true">' +
      hex(18, 15, 12, color) + hex(39, 15, 12, '#FFE9A8') + hex(28.5, 34, 12, '#FFE9A8') + hex(49.5, 34, 12, color) +
      '<path d="M24 41 q0 6 3 6 q3 0 3 -6" fill="' + color + '" stroke="' + INK + '" stroke-width="1.6"/></svg>';
  }
  function flowerSvg(size, petal) {
    size = size || 22; petal = petal || '#F29B8B';
    var p = '';
    for (var k = 0; k < 5; k++) { var a = k * 72 * Math.PI / 180; p += '<circle cx="' + (12 + 6 * Math.cos(a)).toFixed(1) + '" cy="' + (12 + 6 * Math.sin(a)).toFixed(1) + '" r="4.6" fill="' + petal + '" stroke="' + INK + '" stroke-width="1.4"/>'; }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' + p + '<circle cx="12" cy="12" r="4" fill="#F6C343" stroke="' + INK + '" stroke-width="1.4"/></svg>';
  }
  /** Honey drips along the bottom of a band: width-filling, deterministic. */
  function dripSvg(color) {
    color = color || '#F3B33D';
    var d = 'M0 0 H400 V6', xs = [380, 341, 318, 270, 236, 190, 152, 118, 72, 40, 14], lens = [10, 18, 7, 22, 9, 15, 24, 8, 17, 11, 6];
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i], L = lens[i], w = 7 + (L % 5);
      d += ' H' + (x + w) + ' C' + (x + w) + ' ' + (6 + L) + ' ' + (x - w) + ' ' + (6 + L) + ' ' + (x - w) + ' 6';
    }
    d += ' H0 Z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 34" preserveAspectRatio="none" width="100%" height="26" aria-hidden="true"><path d="' + d + '" fill="' + color + '"/></svg>';
  }


  /** Hand-drawn honey drips for the Hive header (width-filling). */
  function dripBand(height) {
    height = height || 120;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 150" preserveAspectRatio="none" width="100%" height="' + height + '" aria-hidden="true">' +
      '<defs><linearGradient id="hdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCB3A"/><stop offset="1" stop-color="#E39B1B"/></linearGradient></defs>' +
      '<path d="M0 0H390V86C380 86 378 112 370 112C362 112 364 88 352 88C340 88 342 128 330 128C318 128 322 90 300 90C282 90 286 104 276 104C266 104 268 88 240 88C222 88 224 120 212 120C200 120 204 89 180 89C160 89 164 140 150 140C136 140 142 90 118 90C100 90 104 108 92 108C80 108 84 88 60 88C44 88 46 118 34 118C22 118 26 88 0 90Z" fill="url(#hdg)" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M12 74C70 70 130 76 190 72S320 70 380 74" stroke="#FFF3CC" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>' +
      '<ellipse cx="151" cy="126" rx="3" ry="5" fill="#FFF3CC" opacity="0.7"/></svg>';
  }
  /** Hand-drawn grassy hill for the Garden header. */
  function grassBand(height) {
    height = height || 120;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 150" preserveAspectRatio="none" width="100%" height="' + height + '" aria-hidden="true">' +
      '<defs><linearGradient id="hgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC66F"/><stop offset="1" stop-color="#5E9E4B"/></linearGradient>' +
      '<linearGradient id="hgl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9BD27C"/><stop offset="1" stop-color="#4E8C3E"/></linearGradient></defs>' +
      '<path d="M0 0H390V92C360 84 340 104 310 96C280 88 262 108 232 100C204 92 186 110 156 102C126 94 104 112 76 102C50 94 28 106 0 98Z" fill="url(#hgg)" stroke="#1D2B1F" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M24 100 q-2 -14 6 -22 M30 102 q4 -12 14 -16 M118 108 q-4 -16 4 -24 M126 108 q6 -10 14 -12 M268 104 q-2 -12 6 -18 M344 96 q2 -12 10 -16" stroke="#1D2B1F" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 104 C54 118 66 128 74 118 C80 110 70 102 60 104Z" fill="url(#hgl)" stroke="#1D2B1F" stroke-width="2"/>' +
      '<path d="M200 102 C192 114 202 126 212 118 C220 110 210 100 200 102Z" fill="url(#hgl)" stroke="#1D2B1F" stroke-width="2"/>' +
      '<path d="M300 98 C306 112 296 124 288 116 C282 108 292 98 300 98Z" fill="url(#hgl)" stroke="#1D2B1F" stroke-width="2"/>' +
      '<path d="M14 70C80 64 150 72 210 66S330 64 380 70" stroke="#E8F4DD" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/></svg>';
  }
  function vineSvg(height) {
    height = height || 420;
    var leaf = function (d) { return '<path d="' + d + '" fill="#7DBA62" stroke="#1D2B1F" stroke-width="1.8"/>'; };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 420" width="' + (height * 60 / 420) + '" height="' + height + '" aria-hidden="true">' +
      '<path d="M44 0 C20 60 56 110 34 170 C14 230 50 290 30 350 C22 380 34 400 40 420" stroke="#3F7A3A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      leaf('M38 52 C22 44 14 56 24 64 C32 70 40 62 38 52Z') + leaf('M36 150 C52 138 60 152 50 160 C42 166 34 160 36 150Z') + leaf('M30 250 C14 242 6 256 16 262 C24 268 32 260 30 250Z') +
      '<g transform="translate(40 330)"><circle cx="0" cy="-5" r="4.5" fill="#F7B6C8" stroke="#1D2B1F" stroke-width="1.4"/><circle cx="5" cy="0" r="4.5" fill="#F7B6C8" stroke="#1D2B1F" stroke-width="1.4"/><circle cx="0" cy="5" r="4.5" fill="#F7B6C8" stroke="#1D2B1F" stroke-width="1.4"/><circle cx="-5" cy="0" r="4.5" fill="#F7B6C8" stroke="#1D2B1F" stroke-width="1.4"/><circle cx="0" cy="0" r="3.4" fill="#FFD23F" stroke="#1D2B1F" stroke-width="1.4"/></g></svg>';
  }
  function ladybugSvg(size) {
    size = size || 34;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -14 32 28" width="' + size + '" height="' + (size * 28 / 32) + '" role="img" aria-label="Dot the ladybug">' +
      '<ellipse cx="2" cy="1" rx="11" ry="9" fill="#D9533B" stroke="#1D2B1F" stroke-width="2"/><path d="M2 -8 V10" stroke="#1D2B1F" stroke-width="1.6"/>' +
      '<circle cx="-3" cy="-1" r="2" fill="#1D2B1F"/><circle cx="7" cy="4" r="2" fill="#1D2B1F"/><circle cx="6" cy="-3" r="1.5" fill="#1D2B1F"/>' +
      '<circle cx="-8" cy="-5" r="5" fill="#1D2B1F"/><circle cx="-9.5" cy="-6" r="1.2" fill="#FFFFFF"/></svg>';
  }
  /** A honey jar: n shown on it, frac = how full (0..1), label underneath; star = results jar. */
  function jarSvg(n, frac, label, starJar) {
    var top = 78 - Math.max(0.08, Math.min(1, frac)) * 56;
    var id = 'j' + (++uid);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 104" width="68" height="104" role="img" aria-label="' + label + ': ' + n + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCB3A"/><stop offset="1" stop-color="#E39B1B"/></linearGradient>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.65"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0.15"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.35"/></linearGradient></defs>' +
      '<rect x="12" y="6" width="44" height="10" rx="3" fill="' + (starJar ? INK : '#C98A1B') + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M10 18 H58 Q62 18 62 24 V72 Q62 80 54 80 H14 Q6 80 6 72 V24 Q6 18 10 18Z" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M8 ' + top + ' Q34 ' + (top - 5) + ' 60 ' + top + ' V72 Q60 78 54 78 H14 Q8 78 8 72Z" fill="' + (starJar ? '#F5B700' : 'url(#' + id + ')') + '"/>' +
      '<rect x="8" y="20" width="10" height="56" rx="5" fill="url(#' + id + 'g)"/>' +
      (starJar ? '<path d="M34 28 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#FFD23F" stroke="' + INK + '" stroke-width="1.6"/>' : '') +
      '<text x="34" y="' + (starJar ? 70 : Math.min(64, top + 22)) + '" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="22" fill="' + INK + '">' + n + '</text>' +
      '<text x="34" y="98" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="15" fill="currentColor">' + label + '</text></svg>';
  }
  /** A plant pot at a growth stage: 0 seeds, 1 sprout, 2 bud, 3 bloom. */
  function potSvg(stage, n, label) {
    var I = '#1D2B1F', leaf = function (d) { return '<path d="' + d + '" fill="#7DBA62" stroke="' + I + '" stroke-width="1.6"/>'; };
    var plant = '';
    if (stage === 0) plant = '<ellipse cx="26" cy="50" rx="3.5" ry="2.4" fill="#8A5A2B" stroke="' + I + '" stroke-width="1.2"/><ellipse cx="36" cy="49" rx="3.5" ry="2.4" fill="#8A5A2B" stroke="' + I + '" stroke-width="1.2"/><ellipse cx="44" cy="50" rx="3.5" ry="2.4" fill="#8A5A2B" stroke="' + I + '" stroke-width="1.2"/>';
    if (stage === 1) plant = '<path d="M34 52 V36" stroke="#3F7A3A" stroke-width="3" stroke-linecap="round"/>' + leaf('M34 40 C24 30 18 40 26 44 C30 46 34 42 34 40Z') + leaf('M34 38 C44 28 50 38 42 42 C38 44 34 40 34 38Z');
    if (stage === 2) plant = '<path d="M34 52 V26" stroke="#3F7A3A" stroke-width="3" stroke-linecap="round"/>' + leaf('M34 44 C24 36 18 46 26 48 C30 50 34 46 34 44Z') +
      '<path d="M34 26 C26 22 28 10 34 8 C40 10 42 22 34 26Z" fill="#F7B6C8" stroke="' + I + '" stroke-width="1.8"/><path d="M30 24 Q34 28 38 24" stroke="#3F7A3A" stroke-width="2" fill="none"/>';
    if (stage === 3) plant = '<path d="M34 52 V24" stroke="#3F7A3A" stroke-width="3" stroke-linecap="round"/>' + leaf('M34 44 C44 36 50 46 42 48 C38 50 34 46 34 44Z') +
      '<g transform="translate(34 18)"><circle cx="0" cy="-9" r="7" fill="#F29B8B" stroke="' + I + '" stroke-width="1.8"/><circle cx="9" cy="0" r="7" fill="#F29B8B" stroke="' + I + '" stroke-width="1.8"/><circle cx="0" cy="9" r="7" fill="#F29B8B" stroke="' + I + '" stroke-width="1.8"/><circle cx="-9" cy="0" r="7" fill="#F29B8B" stroke="' + I + '" stroke-width="1.8"/><circle cx="0" cy="0" r="5.5" fill="#FFD23F" stroke="' + I + '" stroke-width="1.8"/></g>';
    var id = 'p' + (++uid);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 108" width="68" height="108" role="img" aria-label="' + label + ': ' + n + '">' +
      '<defs><radialGradient id="' + id + '" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#E9A27A"/><stop offset="1" stop-color="#B8643F"/></radialGradient></defs>' +
      plant + '<path d="M14 58 H54 L50 82 H18Z" fill="url(#' + id + ')" stroke="' + I + '" stroke-width="2.2"/><rect x="10" y="52" width="48" height="9" rx="3" fill="#C9744B" stroke="' + I + '" stroke-width="2"/>' +
      '<text x="' + (stage >= 2 ? 58 : 34) + '" y="' + (stage === 0 ? 36 : stage === 1 ? 22 : 16) + '" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="22" fill="currentColor">' + n + '</text>' +
      '<text x="34" y="100" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="15" fill="currentColor">' + label + '</text></svg>';
  }

  root.hiveSvg = hiveSvg;
  root.dripBand = dripBand;
  root.grassBand = grassBand;
  root.vineSvg = vineSvg;
  root.ladybugSvg = ladybugSvg;
  root.jarSvg = jarSvg;
  root.potSvg = potSvg;
  root.honeycombSvg = honeycombSvg;
  root.flowerSvg = flowerSvg;
  root.dripSvg = dripSvg;
  root.bisiSvg = bisiSvg;
  root.bisiLine = pickLine;
  root.BISI_LINES = LINES;
  if (typeof module !== 'undefined') module.exports = { bisiSvg: bisiSvg, bisiLine: pickLine, LINES: LINES, hiveSvg: hiveSvg, honeycombSvg: honeycombSvg, flowerSvg: flowerSvg, dripSvg: dripSvg, dripBand: dripBand, grassBand: grassBand, vineSvg: vineSvg, ladybugSvg: ladybugSvg, jarSvg: jarSvg, potSvg: potSvg };
})(typeof window !== 'undefined' ? window : globalThis);
