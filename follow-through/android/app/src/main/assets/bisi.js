/* Bisi the bee — Follow-Through's mascot. bisiSvg(mood, size) returns an SVG string.
 * Moods: happy, worried, sassy, sleepy, party, crying. Original character; flat style. */
(function (root) {
  var INK = '#2B1D04', BODY = '#F6C343', BODY_SHADE = '#E8A92B', CHEEK = '#F29B8B', WING = '#CFEAF6', WING_EDGE = '#8FC3DA', GREEN = '#1E6A4E';

  function eyes(mood) {
    switch (mood) {
      case 'worried':
        return eye(47, 58, 6.5, 0, 1) + eye(73, 58, 6.5, 0, 1) +
          '<path d="M39 47 L52 50" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M81 47 L68 50" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      case 'sassy':
        // half-closed, unimpressed lids + one raised brow
        return eye(47, 59, 6.5, 0, 0) + eye(73, 59, 6.5, 0, 0) +
          '<path d="M40 56 H54" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
          '<rect x="40" y="51" width="14" height="5" fill="' + BODY + '"/>' +
          '<path d="M66 56 H80" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
          '<rect x="66" y="51" width="14" height="5" fill="' + BODY + '"/>' +
          '<path d="M40 48 L53 50" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M67 46 Q73 41 80 45" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      case 'sleepy':
        return '<path d="M41 59 Q47 63 53 59" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<path d="M67 59 Q73 63 79 59" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<text x="88" y="38" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="' + GREEN + '">z</text>' +
          '<text x="96" y="28" font-family="Arial,sans-serif" font-weight="700" font-size="9" fill="' + GREEN + '">z</text>';
      case 'party':
        return '<path d="M41 60 Q47 52 53 60" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
          '<path d="M67 60 Q73 52 79 60" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
      case 'crying':
        return '<path d="M41 57 Q47 61 53 57" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<path d="M67 57 Q73 61 79 57" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<path d="M44 63 Q41 71 44 74 Q48 71 44 63 Z" fill="#6FB7E0"/>' +
          '<path d="M77 63 Q74 71 77 74 Q81 71 77 63 Z" fill="#6FB7E0"/>' +
          '<path d="M39 50 L52 47" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M81 50 L68 47" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      default: // happy
        return eye(47, 58, 7, -1, 1) + eye(73, 58, 7, -1, 1);
    }
  }
  function eye(cx, cy, r, look, shine) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="' + (cx + 1) + '" cy="' + (cy + 1 + look) + '" r="' + (r * 0.5) + '" fill="' + INK + '"/>' +
      (shine ? '<circle cx="' + (cx + 2.5) + '" cy="' + (cy - 1.5 + look) + '" r="1.4" fill="#fff"/>' : '');
  }
  function mouth(mood) {
    switch (mood) {
      case 'worried': return '<path d="M53 75 Q56 72 60 75 Q64 78 67 75" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      case 'sassy': return '<path d="M53 75 Q62 77 68 72" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      case 'sleepy': return '<ellipse cx="60" cy="75" rx="3.2" ry="3.8" fill="' + INK + '"/>';
      case 'party': return '<path d="M50 70 Q60 84 70 70 Z" fill="' + INK + '"/><path d="M55 75 Q60 79 65 75" fill="#E86B5A"/>';
      case 'crying': return '<path d="M52 78 Q60 70 68 78" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
      default: return '<path d="M52 72 Q60 80 68 72" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    }
  }
  function extras(mood) {
    if (mood === 'party') {
      return '<path d="M60 8 L48 34 L72 34 Z" fill="' + GREEN + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<circle cx="60" cy="8" r="4" fill="#F3B33D" stroke="' + INK + '" stroke-width="2"/>' +
        '<circle cx="54" cy="26" r="2" fill="#F3B33D"/><circle cx="63" cy="20" r="2" fill="#F3B33D"/>' +
        '<path d="M14 30 l4 -4 M106 34 l-4 -4 M18 52 l5 0 M98 56 l5 0" stroke="#D9604A" stroke-width="3" stroke-linecap="round"/>';
    }
    if (mood === 'sassy') {
      // a little honey-pot "deadline" sign tapping energy: crossed arms implied by tiny arms
      return '';
    }
    return '';
  }
  function antennae(mood) {
    if (mood === 'party') return '';
    var droop = (mood === 'sleepy' || mood === 'crying') ? 8 : 0;
    return '<path d="M50 34 Q44 22 ' + (40 - droop / 2) + ' ' + (16 + droop) + '" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="' + (40 - droop / 2) + '" cy="' + (16 + droop) + '" r="4" fill="' + INK + '"/>' +
      '<path d="M70 34 Q76 22 ' + (80 + droop / 2) + ' ' + (16 + droop) + '" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="' + (80 + droop / 2) + '" cy="' + (16 + droop) + '" r="4" fill="' + INK + '"/>';
  }
  function arms(mood) {
    if (mood === 'sassy') {
      // crossed arms over the tummy: outlined in ink, filled in body colour
      var a1 = 'M30 80 Q44 94 72 88', a2 = 'M90 80 Q76 94 48 88';
      return '<path d="' + a1 + '" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="' + a1 + '" stroke="' + BODY + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
        '<path d="' + a2 + '" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="' + a2 + '" stroke="' + BODY + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    }
    if (mood === 'party') {
      return '<path d="M30 74 Q20 62 22 52" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<path d="M90 74 Q100 62 98 52" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    }
    return '<path d="M29 80 Q22 86 24 92" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M91 80 Q98 86 96 92" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
  }

  function bisiSvg(mood, size, animate) {
    mood = mood || 'happy';
    size = size || 96;
    var flap = animate ? '<animateTransform attributeName="transform" type="rotate" values="0 60 60;-8 60 60;0 60 60" dur="0.35s" repeatCount="indefinite"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="Bisi the bee, ' + mood + '">' +
      '<defs><clipPath id="bisi-body-' + mood + '"><ellipse cx="60" cy="74" rx="34" ry="32"/></clipPath></defs>' +
      // wings
      '<g>' + flap +
        '<ellipse cx="34" cy="44" rx="17" ry="11" transform="rotate(-28 34 44)" fill="' + WING + '" stroke="' + WING_EDGE + '" stroke-width="2.4" opacity="0.95"/>' +
      '</g>' +
      '<g>' + (animate ? '<animateTransform attributeName="transform" type="rotate" values="0 60 60;8 60 60;0 60 60" dur="0.35s" repeatCount="indefinite"/>' : '') +
        '<ellipse cx="86" cy="44" rx="17" ry="11" transform="rotate(28 86 44)" fill="' + WING + '" stroke="' + WING_EDGE + '" stroke-width="2.4" opacity="0.95"/>' +
      '</g>' +
      antennae(mood) +
      // stinger
      '<path d="M56 104 L60 114 L64 104 Z" fill="' + INK + '"/>' +
      // body
      '<ellipse cx="60" cy="74" rx="34" ry="32" fill="' + BODY + '"/>' +
      '<g clip-path="url(#bisi-body-' + mood + ')">' +
        '<rect x="20" y="86" width="80" height="7" fill="' + INK + '"/>' +
        '<rect x="20" y="99" width="80" height="7" fill="' + INK + '"/>' +
        '<ellipse cx="72" cy="96" rx="30" ry="14" fill="' + BODY_SHADE + '" opacity="0.35"/>' +
      '</g>' +
      '<ellipse cx="60" cy="74" rx="34" ry="32" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
      arms(mood) +
      // cheeks
      '<ellipse cx="38" cy="70" rx="5" ry="3.4" fill="' + CHEEK + '" opacity="' + (mood === 'sassy' ? 0.35 : 0.85) + '"/>' +
      '<ellipse cx="82" cy="70" rx="5" ry="3.4" fill="' + CHEEK + '" opacity="' + (mood === 'sassy' ? 0.35 : 0.85) + '"/>' +
      eyes(mood) + mouth(mood) + extras(mood) +
      '</svg>';
  }

  /** Lines in Bisi's voice. Mostly passive-aggressive, occasionally sweet. {t} = title, {d} = days. */
  var LINES = {
    dueToday: ["{t} closes TODAY. I'm not mad. I'm just… hovering. 🐝", "Today. {t}. Today. Bee-lieve me, tomorrow is too late.", "It's deadline day for {t}. I cleared my whole schedule to watch you do this."],
    due: ["{t} closes in {d} days. Just thought you'd want to know. Again.", "Bee honest: have you even opened {t}?", "{d} days left for {t}. I'm sure you have a plan. Right? 🙂", "I've been buzzing about {t} since Tuesday. Your move."],
    dueEscalate: ["Okay. I'll just keep reminding you about {t} then. I have nothing but time. 🐝", "Fun fact: {t} doesn't apply for itself. I checked.", "I'm not saying I'm disappointed about {t}. I'm just saying I'm a bee and I'm sad."],
    soon: ["{t} closes in {d} days. Starting now would be very mature of you.", "One week until {t}. Future you is begging. I can hear her."],
    overdue: ["The deadline for {t} passed. Did you apply, or should I start grieving?", "{t} closed. Tell me what happened so I can stop asking. (I won't stop asking.)"],
    reminder: ["You asked me to remind you about {t}. So. Here I am. Reminding.", "Remember {t}? It remembers you."],
    check: ["It's been two weeks since you applied to {t}. Any news, or are we pretending it didn't happen?", "Heard back from {t}? I'm asking for a friend. The friend is me."],
    event: ["{t} is {when}. Registered yet? Asking very calmly.", "📅 {t} is {when}. Don't make me come to Victoria Island."],
    streak: ["Your {n}-day streak ends at midnight. No pressure. (Pressure.) 🐝", "{n} days. It'd be a shame if something happened to them."],
    idle: ["You haven't saved anything in {n} days. I'm fine. Everything's fine.", "{n} days without a single opportunity. The bubble misses you. I miss you."],
    clear: ["All clear. Look at you being responsible. 🥹", "Nothing urgent. I'm genuinely proud. Don't make it weird."],
    sweet: ["You're doing better than you think. Now go apply to something. 💛", "Small steps still count. I'm counting them. 🐝"],
    accepted: ["YOU GOT IN?! I'm telling every flower I know. 🎉", "Accepted! I always believed in you. (Mostly.)"],
    rejected: ["Their loss. Genuinely. On to the next one. 💛", "Rejected? Okay. We move. Next application, please."],
  };
  function pickLine(kind, vars, seed) {
    var arr = LINES[kind] || LINES.sweet;
    var i = typeof seed === 'number' ? Math.abs(seed) % arr.length : Math.floor(Math.random() * arr.length);
    return arr[i].replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] != null ? vars[k] : ''; });
  }

  root.bisiSvg = bisiSvg;
  root.bisiLine = pickLine;
  root.BISI_LINES = LINES;
  if (typeof module !== 'undefined') module.exports = { bisiSvg: bisiSvg, bisiLine: pickLine, LINES: LINES };
})(typeof window !== 'undefined' ? window : globalThis);
