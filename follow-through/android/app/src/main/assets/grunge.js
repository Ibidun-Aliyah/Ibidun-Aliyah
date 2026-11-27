/* Loser-core look: beetle Bisi (manga ink), beetle puns, and the look's drawings (star, spiral, glitch light).
 * When the page's data-skin is "grunge", bisiSvg() and bisiLine() hand out the beetle versions everywhere. */
(function (root) {
  'use strict';
  var INK = '#0C0B0B', BONE = '#EDEAE6', OX = '#8E1B1B', RED = '#B0201F', PINK = '#E8B4C0';
  var isGrunge = function () { return document.documentElement.getAttribute('data-skin') === 'grunge'; };

  function star(x, y, s, fill) {   // the sharp four-point star
    return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + s * .2) + ' ' + (y - s * .2) + ' L' + (x + s) + ' ' + y + ' L' + (x + s * .2) + ' ' + (y + s * .2) + ' L' + x + ' ' + (y + s) + ' L' + (x - s * .2) + ' ' + (y + s * .2) + ' L' + (x - s) + ' ' + y + ' L' + (x - s * .2) + ' ' + (y - s * .2) + 'z" fill="' + fill + '"/>';
  }
  var uid = 0;
  /* mood: happy | sassy | worried | crying | party | sleepy */
  function beetleSvg(mood, size, animate) {
    size = size || 100; mood = mood || 'happy';
    var id = 'bt' + (++uid), legs = '<g stroke="' + BONE + '" stroke-width="2" stroke-linecap="round" fill="none"><path d="M30 66 L14 58 M30 78 L12 80 M34 92 L18 104 M90 66 L106 58 M90 78 L108 80 M86 92 L102 104"/></g>';
    var shell = '<ellipse cx="60" cy="78" rx="32" ry="30" fill="' + INK + '" stroke="' + BONE + '" stroke-width="2.5"/><path d="M60 50 V107" stroke="' + BONE + '" stroke-width="2"/>' +
      '<path d="M38 62 Q44 54 52 56" stroke="' + PINK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 82 m-6 0 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" fill="none" stroke="' + RED + '" stroke-width="2"/>';
    var tips = mood === 'sleepy' ? '' : star(30, 8, 6, mood === 'party' ? PINK : BONE) + star(90, 8, 6, mood === 'party' ? PINK : BONE);
    var ant = '<path d="M50 22 Q42 8 30 8 M70 22 Q78 8 90 8" stroke="' + BONE + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + tips;
    var head = '<circle cx="60" cy="38" r="20" fill="' + BONE + '"/>';
    var lashes = '<path d="M44 31 l-3 -3 M47 30 l-1 -4 M51 30 l1 -4 M76 31 l3 -3 M73 30 l1 -4 M69 30 l-1 -4" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>';
    var blush = '<path d="M45 46 l3 -2 M48 47 l3 -2 M69 44 l3 2 M72 45 l3 2" stroke="' + PINK + '" stroke-width="1.5" stroke-linecap="round"/>';
    var roundEyes = '<ellipse cx="51" cy="38" rx="5.5" ry="7" fill="' + INK + '"/><ellipse cx="69" cy="38" rx="5.5" ry="7" fill="' + INK + '"/><circle cx="49" cy="35" r="2" fill="#FFF"/><circle cx="67" cy="35" r="2" fill="#FFF"/>';
    var face;
    if (mood === 'sassy') face = '<path d="M45 38 h12 M63 38 h12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M47 40 a4 3 0 0 0 8 0 M65 40 a4 3 0 0 0 8 0" fill="' + INK + '"/><path d="M44 35 l-2 -3 M76 35 l2 -3" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/><path d="M56 48 Q61 46 65 49" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M66 22 l6 -4" stroke="' + RED + '" stroke-width="2" stroke-linecap="round"/>';
    else if (mood === 'crying') face = roundEyes + lashes + '<path d="M49 46 q-2 10 1 18 M71 46 q2 10 -1 18" stroke="' + PINK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M55 49 Q60 45 65 49" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    else if (mood === 'party') face = star(51, 38, 8, INK) + star(69, 38, 8, INK) + '<path d="M54 47 Q60 53 66 47" stroke="' + INK + '" stroke-width="2" fill="' + RED + '" stroke-linecap="round"/>' + blush;
    else if (mood === 'worried') face = roundEyes + lashes + '<path d="M56 49 Q60 46 64 49" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M78 26 q3 5 0 7 q-3 -2 0 -7" fill="' + PINK + '"/>' + blush;
    else if (mood === 'sleepy') face = '<path d="M45 39 Q51 43 57 39 M63 39 Q69 43 75 39" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M57 48 Q60 50 63 48" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/><text x="84" y="22" font-family="Space Mono,monospace" font-size="11" fill="' + PINK + '">z z</text>';
    else face = roundEyes + lashes + blush + '<path d="M57 48 Q60 50 63 48" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    var bob = animate ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="2.6s" repeatCount="indefinite"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="Bisi the beetle, ' + mood + '"><g id="' + id + '">' + bob + legs + shell + ant + head + face + '</g></svg>';
  }

  var BEETLE = {
    dueToday: ["{t} closes TODAY. i'm not mad. i'm just… scuttling in circles.", "today. {t}. today. don't make me crawl into your notifications.", "deadline day for {t}. stop beetling around."],
    due: ["{t} closes in {d} days. honestly i'm shell-shocked you haven't started.", "{d} days left for {t}. the essay won't write itself. i checked.", "be honest: have you even opened {t}? i'm bugging you on purpose.", "{d} days for {t}. tick tock, says my shell."],
    dueEscalate: ["okay. i'll keep bugging you about {t}. i have six legs and nothing but time.", "fun fact: {t} doesn't apply for itself. i'm crushed.", "still {t}. still waiting. still a beetle. still sad."],
    soon: ["{t} closes in {d} days. starting now would be very un-beetle-ievable of you.", "one week until {t}. future you is begging. i can hear her through my shell."],
    overdue: ["the deadline for {t} passed. did you apply or should i crawl under a rock?", "{t} closed. tell me what happened so i can stop asking. (i won't stop.)"],
    reminder: ["you asked me to remind you about {t}. so. here i am. bugging you.", "remember {t}? it remembers you."],
    check: ["two weeks since you applied to {t}. any news or are we in denial?", "heard back from {t}? asking for a friend. the friend is a beetle."],
    event: ["{t} is {when}. registered yet? asking very calmly. very.", "{t} is {when}. i already picked my darkest outfit."],
    streak: ["{n} days in a row. you're un-beetle-able.", "don't break the streak. i will cry. beetles can cry. look it up."],
    idle: ["you haven't saved anything in {n} days. i'm fine. i'm under a rock. it's fine.", "{n} days of nothing. the bubble misses you. i miss you."],
    clear: ["all clear. look at you being responsible. i'm scarab-ly proud.", "nothing urgent. a rare calm night. enjoy it.", "nothing due. don't make it weird."],
    sweet: ["you're doing better than you think. now go apply to something.", "small steps still count. i'm counting them with all six legs."],
    accepted: ["YOU GOT IN?! i'm literally scarab-ly proud of u.", "accepted!! i always believed in you. (mostly.)"],
    rejected: ["rejected. their loss. we'll bug them again next year.", "okay. we move. next application, please."],
  };
  function beetleLine(kind, vars, seed) {
    var arr = BEETLE[kind] || BEETLE.sweet;
    var i = typeof seed === 'number' ? Math.abs(seed) % arr.length : Math.floor(Math.random() * arr.length);
    return arr[i].replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] != null ? vars[k] : ''; });
  }

  /* decorations */
  function glitchBand(h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><filter id="gl-b"><feGaussianBlur stdDeviation="3"/></filter></defs>' +
      '<path d="M-10 ' + (h * .55) + ' C40 ' + (h * .3) + ' 60 ' + (h * .85) + ' 110 ' + (h * .6) + ' S170 ' + (h * .25) + ' 210 ' + (h * .55) + ' S260 ' + (h * .9) + ' 300 ' + (h * .5) + '" fill="none" stroke="' + BONE + '" stroke-width="5" filter="url(#gl-b)" opacity=".7"/>' +
      '<path d="M-10 ' + (h * .55) + ' C40 ' + (h * .3) + ' 60 ' + (h * .85) + ' 110 ' + (h * .6) + ' S170 ' + (h * .25) + ' 210 ' + (h * .55) + ' S260 ' + (h * .9) + ' 300 ' + (h * .5) + '" fill="none" stroke="#FFF" stroke-width="1.4" opacity=".9"/>' +
      '<path d="M-10 ' + (h * .72) + ' C30 ' + (h * .55) + ' 70 ' + (h * .95) + ' 120 ' + (h * .78) + ' S180 ' + (h * .48) + ' 230 ' + (h * .74) + '" fill="none" stroke="' + BONE + '" stroke-width="1" opacity=".45"/>' +
      '<g transform="rotate(-14 352 ' + (h * .42) + ')">' + star(352, h * .42, 26, BONE) + '</g></svg>';
  }
  function spiralSvg(size, color, width) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M70 70 m0 -4 a4 4 0 1 1 -4 4 a10 10 0 1 1 10 10 a16 16 0 1 1 -16 -16 a22 22 0 1 1 22 22 a28 28 0 1 1 -28 -28 a34 34 0 1 1 34 34 a40 40 0 1 1 -40 -40 a46 46 0 1 1 46 46 a52 52 0 1 1 -52 -52 a58 58 0 1 1 58 58" fill="none" stroke="' + (color || OX) + '" stroke-width="' + (width || 6) + '"/></svg>';
  }
  /* pipeline stage as a spiral that fills up (instead of a honey jar / plant pot) */
  function spiralMeter(n, frac, label, special) {
    var len = 1500, on = Math.max(.04, Math.min(1, frac || 0)) * len;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="96" height="120" role="img" aria-label="' + label + ': ' + n + '">' +
      '<path d="M60 64 m0 -3 a3 3 0 1 1 -3 3 a8 8 0 1 1 8 8 a13 13 0 1 1 -13 -13 a18 18 0 1 1 18 18 a23 23 0 1 1 -23 -23 a28 28 0 1 1 28 28 a33 33 0 1 1 -33 -33 a38 38 0 1 1 38 38 a43 43 0 1 1 -43 -43" fill="none" stroke="#2E2A2A" stroke-width="5"/>' +
      '<path d="M60 64 m0 -3 a3 3 0 1 1 -3 3 a8 8 0 1 1 8 8 a13 13 0 1 1 -13 -13 a18 18 0 1 1 18 18 a23 23 0 1 1 -23 -23 a28 28 0 1 1 28 28 a33 33 0 1 1 -33 -33 a38 38 0 1 1 38 38 a43 43 0 1 1 -43 -43" fill="none" stroke="' + (special ? PINK : OX) + '" stroke-width="5" stroke-dasharray="' + on + ' ' + len + '"/>' +
      '<rect x="38" y="48" width="44" height="32" fill="' + INK + '"/>' +
      '<text x="60" y="74" text-anchor="middle" font-family="Smooch Sans,sans-serif" font-weight="700" font-size="30" fill="' + BONE + '">' + n + '</text>' +
      '<text x="60" y="140" text-anchor="middle" font-family="Space Mono,monospace" font-size="11" fill="' + BONE + '">' + String(label).toLowerCase() + '</text>' +
      (special ? star(102, 16, 9, PINK) : '') + '</svg>';
  }
  function meadow() {
    return '<div class="row">' + '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">' + star(11, 11, 10, BONE) + '</svg>' + spiralSvg(34, OX, 7) + beetleSvg('sleepy', 48) + spiralSvg(28, PINK, 7) + '<svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">' + star(11, 11, 10, PINK) + '</svg></div>made in the dark by bisi';
  }

  /* hand out the beetle while the look is on */
  var beeSvg = root.bisiSvg, beeLine = root.bisiLine;
  if (beeSvg) root.bisiSvg = function (mood, size, animate, style) { return isGrunge() ? beetleSvg(mood, size, animate) : beeSvg(mood, size, animate, style); };
  if (beeLine) root.bisiLine = function (kind, vars, seed) { return isGrunge() ? beetleLine(kind, vars, seed) : beeLine(kind, vars, seed); };
  root.FTGrunge = { bee: beeSvg, beetleSvg: beetleSvg, beetleLine: beetleLine, glitchBand: glitchBand, spiralSvg: spiralSvg, spiralMeter: spiralMeter, meadow: meadow, star: star, on: isGrunge };
})(window);
