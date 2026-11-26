/* Brain break: quick learning games that work offline.
 * Each game makes questions for a level (1–6). Three right in a row moves you up a level,
 * two wrong in a row moves you down, and the level you reach is kept for next time. */
(() => {
const RANKS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Professor'];
const R = n => Math.floor(Math.random() * n);
const rint = (a, b) => a + R(b - a + 1);
const pickOne = a => a[R(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d){ try { const v = localStorage.getItem('ftg-' + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('ftg-' + k, JSON.stringify(v)); } catch(e){} }
};
/* four distinct choices from a right answer and candidate wrong ones */
function choices(answer, wrong, make){
  const out = [String(answer)], seen = new Set(out);
  for (const w of wrong){ const s = String(w); if (!seen.has(s)){ seen.add(s); out.push(s); } if (out.length === 4) break; }
  let guard = 0;
  const num = parseFloat(answer);
  if (!make && String(num) === String(answer)) make = () => { const step = Math.abs(num) >= 10 ? Math.round(Math.abs(num) / 10) || 1 : Number.isInteger(num) ? 1 : 0.5; return +(num + rint(-4, 4) * step).toFixed(2); };
  while (out.length < 4 && make && guard++ < 50){ const s = String(make()); if (!seen.has(s)){ seen.add(s); out.push(s); } }
  return shuffle(out);
}
const near = (n, spread) => { const s = new Set(); while (s.size < 6){ const d = rint(-spread, spread); if (d) s.add(n + d); } return [...s]; };

/* ---------------- Word Hive: vocabulary ---------------- */
// [word, meaning, example]; tiers get rarer.
const WORDS = [
 [ // 1: everyday academic
  ['mitigate','make something less severe','Sandbags mitigated the flood damage.'],
  ['ambiguous','open to more than one meaning','The lecturer\'s instructions were ambiguous, so half the class did the wrong question.'],
  ['pragmatic','dealing with things sensibly and realistically','A pragmatic plan: start with what we can afford.'],
  ['ubiquitous','found everywhere','Phones are ubiquitous in lecture halls.'],
  ['concise','giving a lot of information in few words','Keep your personal statement concise.'],
  ['inevitable','certain to happen','Traffic on Third Mainland Bridge felt inevitable.'],
  ['feasible','possible and practical to do','Is a solar-powered robot feasible on our budget?'],
  ['implicit','suggested but not stated directly','There was an implicit deadline: before the HOD travels.'],
  ['explicit','stated clearly and in detail','The rubric is explicit about word count.'],
  ['coherent','logical and consistent','Her argument was coherent from start to finish.'],
  ['diligent','showing care and effort in work','Diligent students start assignments early.'],
  ['substantial','large in size, value or importance','The scholarship covers a substantial part of tuition.'],
  ['advocate','publicly support or recommend','She advocates for more women in engineering.'],
  ['allocate','distribute for a particular purpose','Allocate two hours a day to revision.'],
  ['bias','unfair preference for or against something','The survey had a sampling bias.'],
  ['candid','truthful and straightforward','Thank you for your candid feedback.'],
  ['deter','discourage someone from doing something','High fees deter many applicants.'],
  ['enhance','improve the quality or value of','Projects enhance your CV.'],
  ['frugal','careful with money or resources','Frugal living got him through 200 level.'],
  ['hypothesis','a proposed explanation to be tested','Our hypothesis: the motor overheats under load.'],
  ['intricate','very detailed and complicated','The circuit board had intricate wiring.'],
  ['lucid','expressed clearly; easy to understand','A lucid explanation of Laplace transforms.'],
  ['meticulous','showing great attention to detail','Meticulous lab notes saved our report.'],
  ['obsolete','no longer used; out of date','Floppy disks are obsolete.'],
 ],
 [ // 2: strong vocabulary
  ['ameliorate','make something bad better','New buses ameliorated the transport problem.'],
  ['cogent','clear, logical and convincing','She made a cogent case for the funding.'],
  ['ephemeral','lasting a very short time','Trends on TikTok are ephemeral.'],
  ['exacerbate','make a problem worse','Skipping sleep exacerbates exam stress.'],
  ['juxtapose','place side by side to contrast','The essay juxtaposes city and village life.'],
  ['prudent','acting with care for the future','It\'s prudent to back up your project files.'],
  ['tenacious','not giving up easily','A tenacious applicant reapplies after rejection.'],
  ['succinct','briefly and clearly expressed','Give a succinct answer in 100 words.'],
  ['ostensibly','apparently, but perhaps not actually','Ostensibly a study group; actually a gist session.'],
  ['innocuous','harmless; not offensive','An innocuous question started a long debate.'],
  ['venerable','respected because of age or wisdom','The venerable professor retired after 40 years.'],
  ['complacent','too satisfied to try to improve','Don\'t get complacent after one good grade.'],
  ['didactic','intended to teach, often too obviously','The film was a bit didactic.'],
  ['empirical','based on observation or experiment','We need empirical data, not opinions.'],
  ['equivocal','unclear, often on purpose','His equivocal reply avoided the question.'],
  ['fastidious','very careful about accuracy and detail','A fastidious editor caught every typo.'],
  ['gregarious','fond of company; sociable','Gregarious people thrive at networking events.'],
  ['impetus','a force that drives something forward','The hackathon gave impetus to the project.'],
  ['lethargic','sluggish and without energy','Lethargic after a heavy lunch.'],
  ['mundane','ordinary and dull','Even mundane tasks matter for the deadline.'],
  ['nuance','a subtle difference in meaning','Translation loses some nuance.'],
  ['paradigm','a typical model or pattern of thinking','Deep learning changed the AI paradigm.'],
  ['scrutinize','examine closely and thoroughly','Reviewers scrutinize every CV line.'],
  ['volatile','liable to change rapidly and unpredictably','The naira exchange rate is volatile.'],
 ],
 [ // 3: advanced
  ['obsequious','too eager to please or obey','The obsequious assistant agreed with everything.'],
  ['perfunctory','done quickly with little care','A perfunctory glance at the instructions.'],
  ['recalcitrant','stubbornly uncooperative','A recalcitrant bolt that wouldn\'t loosen.'],
  ['sanguine','optimistic, especially in a hard situation','She stayed sanguine about the results.'],
  ['laconic','using very few words','His laconic reply: "Fine."'],
  ['magnanimous','generous toward a rival or someone weaker','A magnanimous winner thanked every team.'],
  ['quixotic','idealistic but unrealistic','A quixotic plan to fix NEPA in a week.'],
  ['esoteric','understood by only a few','Esoteric jokes about Fourier series.'],
  ['ineffable','too great to be expressed in words','The ineffable joy of a 5.0 GPA.'],
  ['pernicious','harmful in a gradual or subtle way','Doomscrolling has a pernicious effect on focus.'],
  ['prosaic','lacking imagination; plain','A prosaic but reliable design.'],
  ['soporific','causing sleep','A soporific 8 a.m. lecture.'],
  ['truculent','eager to argue or fight','A truculent reply to a simple question.'],
  ['vacillate','keep changing your mind','I vacillated between two internship offers.'],
  ['zealous','showing great enthusiasm for a cause','A zealous volunteer.'],
  ['acrimonious','angry and bitter','An acrimonious group-chat argument.'],
  ['capricious','changing mood or behaviour suddenly','Capricious weather ruined the field test.'],
  ['disparate','very different; not comparable','Disparate data sources had to be merged.'],
  ['erudite','having great knowledge from study','An erudite speaker on robotics ethics.'],
  ['garrulous','excessively talkative','A garrulous seatmate on the danfo.'],
  ['insidious','proceeding harmfully in a hidden way','An insidious bug that only appeared at 2 a.m.'],
  ['obdurate','refusing to change your opinion','The landlord was obdurate about the rent.'],
  ['parsimonious','extremely unwilling to spend','A parsimonious budget left no room for snacks.'],
  ['reticent','not revealing thoughts or feelings easily','He was reticent about his results.'],
 ],
 [ // 4: rare
  ['sesquipedalian','using long words','A sesquipedalian lecturer.'],
  ['apocryphal','widely told but probably untrue','The apocryphal story of the student who slept through finals.'],
  ['pusillanimous','showing a lack of courage','A pusillanimous refusal to ask questions.'],
  ['obfuscate','make deliberately unclear','Jargon can obfuscate a simple idea.'],
  ['perspicacious','quick to notice and understand','A perspicacious reviewer spotted the flaw.'],
  ['recondite','little known; obscure','Recondite facts about vacuum tubes.'],
  ['lugubrious','looking sad and dismal','A lugubrious face after the carryover list.'],
  ['inveterate','having a long-established habit','An inveterate procrastinator.'],
  ['tendentious','pushing a particular point of view','A tendentious news report.'],
  ['pellucid','very clear, in meaning or appearance','Pellucid writing is a gift.'],
  ['sycophant','someone who flatters to gain advantage','The office sycophant laughed at every joke.'],
  ['mendacious','not telling the truth','A mendacious excuse for a late submission.'],
  ['abstruse','difficult to understand','Abstruse quantum mechanics notes.'],
  ['peripatetic','travelling from place to place','A peripatetic tutor across three campuses.'],
  ['insouciant','showing casual lack of concern','Insouciant about the deadline. Bisi was not.'],
  ['legerdemain','skilful trickery','Statistical legerdemain made the results look good.'],
  ['pertinacious','holding firmly to a purpose','A pertinacious researcher.'],
  ['phlegmatic','calm and not easily excited','A phlegmatic engineer during the power cut.'],
 ]
];
function wordGen(level){
  const tier = Math.min(3, Math.floor((level - 1) / 1.5));
  const pool = WORDS[tier];
  const review = store.get('review', []).filter(w => WORDS.flat().some(x => x[0] === w));
  let item;
  if (review.length && Math.random() < .3){ const w = pickOne(review); item = WORDS.flat().find(x => x[0] === w); }
  else item = pickOne(pool);
  const others = shuffle(WORDS[tier].concat(WORDS[Math.max(0, tier - 1)]).filter(x => x[0] !== item[0]));
  const reverse = level >= 2 && Math.random() < .35;
  if (reverse) return { q: `Which word means <b>“${item[1]}”</b>?`, choices: choices(item[0], others.map(x => x[0])), answer: item[0],
    explain: `<b>${item[0]}</b>: ${item[2]}`, word: item[0] };
  return { q: `<span class="g-big">${item[0]}</span>`, choices: choices(item[1], others.map(x => x[1])), answer: item[1],
    explain: `<i>${item[2]}</i>`, word: item[0] };
}

/* ---------------- Number Sprint: mental maths ---------------- */
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
function mathGen(level){
  const L = level, t = [];
  if (L <= 1) t.push(() => { const a = rint(12, 99), b = rint(12, 99); return [`${a} + ${b}`, a + b]; },
                     () => { const a = rint(40, 150), b = rint(11, 39); return [`${a} − ${b}`, a - b]; },
                     () => { const a = rint(12, 30), b = rint(3, 9); return [`${a} × ${b}`, a * b]; });
  if (L === 2) t.push(() => { const a = rint(11, 25), b = rint(11, 19); return [`${a} × ${b}`, a * b]; },
                     () => { const b = rint(3, 12), q = rint(6, 25); return [`${b * q} ÷ ${b}`, q]; },
                     () => { const p = pickOne([5, 10, 15, 20, 25, 40, 75]), y = pickOne([40, 60, 80, 120, 200, 240, 360]); return [`${p}% of ${y}`, p * y / 100]; });
  if (L === 3) t.push(() => { const a = rint(11, 30); return [`${a}²`, a * a]; },
                     () => { const a = rint(4, 20); return [`√${a * a}`, a]; },
                     () => { const a = rint(2, 9), x = rint(-9, 12), b = rint(-20, 20); return [`Solve ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${a * x + b}`, x]; },
                     () => { const n = rint(5, 12); return [`2^${n}`, 2 ** n]; },
                     () => { const p = pickOne([12.5, 15, 17.5, 35, 45, 7.5]), y = pickOne([80, 120, 160, 240, 400]); return [`${p}% of ${y}`, +(p * y / 100).toFixed(2)]; });
  if (L === 4) t.push(() => { const b = pickOne([2, 3, 5, 10]), n = rint(2, b === 10 ? 6 : b === 2 ? 10 : 4); return [`log<sub>${b}</sub>(${b ** n})`, n]; },
                     () => { const a = rint(2, 6), n = rint(2, 4), x = rint(1, 3); return [`d/dx (${a}x${n > 1 ? '<sup>' + n + '</sup>' : ''}) at x = ${x}`, a * n * x ** (n - 1)]; },
                     () => { const r1 = rint(-6, 8), r2 = rint(-6, 8); const b = -(r1 + r2), c = r1 * r2;
                       return [`Larger root of x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0`, Math.max(r1, r2)]; },
                     () => { const n = rint(5, 9), r = rint(2, 3); let v = 1; for (let i = 0; i < r; i++) v = v * (n - i) / (i + 1); return [`<sup>${n}</sup>C<sub>${r}</sub>`, v]; });
  if (L >= 5) t.push(() => { const a = rint(-5, 9), b = rint(-5, 9), c = rint(-5, 9), d = rint(-5, 9); return [`det [[${a}, ${b}], [${c}, ${d}]]`, a * d - b * c]; },
                     () => { const a = rint(1, 4), n = rint(1, 3), k = rint(1, 3); return [`∫<sub>0</sub><sup>${k}</sup> ${a * (n + 1)}x${n > 1 ? '<sup>' + n + '</sup>' : n === 1 ? '' : ''} dx`, a * k ** (n + 1)]; },
                     () => { const n = rint(10, 40); return [`1 + 2 + … + ${n}`, n * (n + 1) / 2]; },
                     () => { const a = rint(2, 9), r = rint(2, 3), n = rint(3, 5); return [`Sum of the first ${n} terms: ${a}, ${a * r}, ${a * r * r}, …`, a * (r ** n - 1) / (r - 1)]; },
                     () => { const deg = pickOne([0, 30, 60, 90, 180, 270]), f = pickOne(['sin', 'cos']); const v = Math.round((f === 'sin' ? Math.sin : Math.cos)(deg * Math.PI / 180) * 1000) / 1000;
                       const show = { '0.5':'1/2', '-0.5':'−1/2', '0.866':'√3/2', '-0.866':'−√3/2', '1':'1', '-1':'−1', '0':'0' };
                       return [`${f} ${deg}°`, show[String(v)] || v, ['0', '1', '−1', '1/2', '√3/2', '−1/2', '√2/2']]; });
  if (L >= 6) t.push(() => { const a = rint(2, 9), b = rint(2, 9); const g = gcd(a * 6, b * 4); return [`gcd(${a * 6}, ${b * 4})`, g]; },
                     () => { const x = rint(2, 5); return [`e<sup>ln ${x}</sup> × ln(e<sup>${x}</sup>)`, x * x]; });
  const [q, ans, pool] = pickOne(t)();
  const wrong = pool ? pool : typeof ans === 'number' ? near(ans, Math.max(3, Math.round(Math.abs(ans) * .12))).concat([-ans, ans + 10, ans - 10]) : [];
  return { q: `<span class="g-big">${q}</span>`, choices: choices(ans, shuffle(wrong)), answer: String(ans), explain: `${q} = <b>${ans}</b>` };
}

/* ---------------- Bit Buzz: circuits, logic, number systems ---------------- */
const GATES = { AND:(a,b)=>a&b, OR:(a,b)=>a|b, XOR:(a,b)=>a^b, NAND:(a,b)=>1-(a&b), NOR:(a,b)=>1-(a|b), XNOR:(a,b)=>1-(a^b) };
function bitGen(level){
  const L = level, t = [];
  t.push(() => { const n = rint(L < 3 ? 5 : 40, L < 3 ? 31 : 255); return { q:`${n.toString(2)}<sub>2</sub> in decimal`, a:n, w:near(n, 6), ex:`${n.toString(2)} = ${n}` }; });
  t.push(() => { const g = pickOne(L < 2 ? ['AND', 'OR'] : Object.keys(GATES)), a = R(2), b = R(2);
    return { q:`${a} <b>${g}</b> ${b} = ?`, a:GATES[g](a, b), w:[1 - GATES[g](a, b)], ex:`${g} of ${a} and ${b} is ${GATES[g](a, b)}`, two:true }; });
  t.push(() => { const I = pickOne([0.5, 1, 2, 2.5, 3, 4]), Rr = pickOne([2, 4, 5, 10, 12, 20, 47, 100]); return { q:`I = ${I} A through R = ${Rr} Ω. V = ? (volts)`, a:+(I * Rr).toFixed(2), w:[+(Rr / I).toFixed(2), +(I + Rr).toFixed(2)].concat(near(Math.round(I * Rr), 5)), ex:`V = IR = ${I} × ${Rr} = ${+(I * Rr).toFixed(2)} V` }; });
  if (L >= 2){
    t.push(() => { const n = rint(16, 255); return { q:`0x${n.toString(16).toUpperCase()} in decimal`, a:n, w:near(n, 10).concat([parseInt(n.toString(16), 10) || n + 16]), ex:`0x${n.toString(16).toUpperCase()} = ${n}` }; });
    t.push(() => { const r = [rint(1, 9) * 10, rint(1, 9) * 10, rint(1, 9) * 10]; const s = r[0] + r[1] + r[2]; return { q:`Series: ${r.join(' Ω + ')} Ω. Total (Ω)?`, a:s, w:near(s, 15), ex:`Series resistances add: ${s} Ω` }; });
    t.push(() => { const v = pickOne([5, 9, 12, 24]), i = pickOne([0.5, 1, 2, 3]); return { q:`${v} V at ${i} A. Power (W)?`, a:+(v * i).toFixed(2), w:[+(v / i).toFixed(2), v + i].concat(near(v * i, 4)), ex:`P = VI = ${+(v * i).toFixed(2)} W` }; });
  }
  if (L >= 3){
    t.push(() => { const pair = pickOne([[6,3],[4,4],[10,15],[12,6],[20,30],[8,8],[30,60]]); const p = pair[0] * pair[1] / (pair[0] + pair[1]);
      return { q:`${pair[0]} Ω ∥ ${pair[1]} Ω. Equivalent (Ω)?`, a:+p.toFixed(2), w:[pair[0] + pair[1], +(p * 2).toFixed(2), +(p / 2).toFixed(2), Math.abs(pair[0] - pair[1]) || 1], ex:`R₁R₂/(R₁+R₂) = ${+p.toFixed(2)} Ω` }; });
    t.push(() => { const n = rint(20, 200); return { q:`${n} in binary`, a:n.toString(2), w:[(n + 1).toString(2), (n - 1).toString(2), (n ^ 4).toString(2), (n ^ 16).toString(2)], ex:`${n} = ${n.toString(2)}₂` }; });
    t.push(() => { const pre = pickOne([['k', 1e3], ['M', 1e6], ['m', 1e-3], ['µ', 1e-6], ['n', 1e-9]]), v = pickOne([2.2, 4.7, 10, 22, 47, 100, 330]);
      const unit = pickOne(['Ω', 'F', 'A', 'V']); const val = v * pre[1]; const f = x => x >= 1e-2 && x < 1e7 ? String(+x.toPrecision(3)) : x.toExponential(1).replace('e', '×10^').replace('+', '');
      return { q:`${v} ${pre[0]}${unit} in ${unit}`, a:f(val), w:[f(val * 1000), f(val / 1000), f(val * 1e6), f(val / 1e6)], ex:`${pre[0]} = ×${pre[1].toExponential(0).replace('e', '10^').replace('+', '')}` }; });
  }
  if (L >= 4){
    t.push(() => { const a = R(2), b = R(2), c = R(2); const v = (a & b) | (1 - c);
      return { q:`A=${a}, B=${b}, C=${c}<br>(A AND B) OR NOT C = ?`, a:v, w:[1 - v], ex:`(${a}·${b}) + ${1 - c} = ${v}`, two:true }; });
    t.push(() => { const vin = pickOne([5, 9, 12]), r1 = pickOne([1, 2, 3, 4]) * 1000, r2 = pickOne([1, 2, 3, 6]) * 1000; const v = +(vin * r2 / (r1 + r2)).toFixed(2);
      return { q:`Divider: Vin ${vin} V, R1 ${r1 / 1000} kΩ (top), R2 ${r2 / 1000} kΩ (bottom). Vout (V)?`, a:v, w:[+(vin * r1 / (r1 + r2)).toFixed(2), +(vin / 2).toFixed(2), vin, +(v + 1).toFixed(2)], ex:`Vout = Vin·R2/(R1+R2) = ${v} V` }; });
  }
  if (L >= 5){
    t.push(() => { const n = rint(1, 120); const bits = (256 - n).toString(2).padStart(8, '0'); return { q:`−${n} in 8-bit two's complement`, a:bits, w:[(n).toString(2).padStart(8, '0'), (255 - n).toString(2).padStart(8, '0'), (256 - n + 1).toString(2).padStart(8, '0').slice(-8)], ex:`256 − ${n} = ${256 - n} → ${bits}` }; });
    t.push(() => { const R1 = pickOne([1, 2, 4.7, 10]) * 1000, C = pickOne([1, 10, 100]) * 1e-6; const tau = R1 * C;
      const f = x => x >= 1 ? x + ' s' : x >= 1e-3 ? +(x * 1e3).toPrecision(3) + ' ms' : +(x * 1e6).toPrecision(3) + ' µs';
      return { q:`RC time constant: R = ${R1 / 1000} kΩ, C = ${C * 1e6} µF`, a:f(tau), w:[f(tau * 10), f(tau / 10), f(tau * 1000)], ex:`τ = RC = ${f(tau)}` }; });
    t.push(() => { const bits = rint(8, 16), vref = pickOne([3.3, 5]); const step = vref / 2 ** bits; const f = x => +(x * 1000).toPrecision(3) + ' mV';
      return { q:`${bits}-bit ADC, ${vref} V reference. Size of one step?`, a:f(step), w:[f(step * 2), f(step / 2), f(vref / bits)], ex:`${vref} / 2^${bits} = ${f(step)}` }; });
  }
  const g = pickOne(t)();
  return { q:`<span class="g-mid">${g.q}</span>`, choices: g.two ? ['0', '1'] : choices(g.a, shuffle(g.w)), answer:String(g.a), explain:g.ex };
}

/* ---------------- Pattern Hunt: sequences and logic ---------------- */
function seqGen(level){
  const L = level, t = [];
  t.push(() => { const a = rint(1, 20), d = rint(2, 9) * (L > 2 && R(2) ? -1 : 1); return [[0,1,2,3,4].map(i => a + d * i), a + d * 5, `adds ${d} each time`]; });
  t.push(() => { const a = rint(1, 5), r = rint(2, 3); return [[0,1,2,3].map(i => a * r ** i), a * r ** 4, `× ${r} each time`]; });
  if (L >= 2){
    t.push(() => { const o = rint(0, 5); return [[1,2,3,4,5].map(i => i * i + o), 36 + o, `n² + ${o}`]; });
    t.push(() => { const a = rint(1, 5), b = rint(1, 6); const s = [a, b]; for (let i = 2; i < 6; i++) s.push(s[i-1] + s[i-2]); return [s, s[4] + s[5], 'each term is the sum of the two before']; });
  }
  if (L >= 3){
    t.push(() => { const a = rint(2, 9), d1 = rint(2, 5), d2 = rint(1, 3); const s = [a]; let d = d1; for (let i = 0; i < 5; i++){ s.push(s[s.length - 1] + d); d += d2; } return [s, s[5] + d, `the gap grows by ${d2}`]; });
    t.push(() => { const a = rint(10, 40), b = rint(2, 6), c = rint(1, 4); const s = [a]; for (let i = 0; i < 5; i++) s.push(i % 2 ? s[s.length - 1] - c : s[s.length - 1] + b); return [s, s[5] + (5 % 2 ? -c : b), `alternately +${b}, −${c}`]; });
  }
  if (L >= 4){
    t.push(() => { const o = rint(-3, 3); return [[1,2,3,4,5].map(i => i ** 3 + o), 216 + o, `n³ ${o < 0 ? '−' : '+'} ${Math.abs(o)}`]; });
    t.push(() => { const p = [2,3,5,7,11,13,17,19,23,29,31]; const i = rint(0, 4); return [p.slice(i, i + 5), p[i + 5], 'prime numbers']; });
    t.push(() => { const a = rint(1, 4); const s = [a]; for (let i = 0; i < 4; i++) s.push(s[i] * 2 + 1); return [s, s[4] * 2 + 1, '× 2, then + 1']; });
  }
  if (L >= 5){
    t.push(() => { const s = [1, 1]; for (let i = 2; i < 6; i++) s.push(s[i-1] * i); return [[1, 2, 6, 24, 120], 720, 'factorials: n!']; });
    t.push(() => { const k = rint(2, 4); const s = [1,2,3,4,5].map(n => n * (n + k)); return [s, 6 * (6 + k), `n(n + ${k})`]; });
    t.push(() => { const s = [1,2,3,4,5].map(n => 2 ** n - n); return [s, 64 - 6, '2ⁿ − n']; });
  }
  const [seq, ans, why] = pickOne(t)();
  return { q:`<span class="g-mid">${seq.join(', ')}, <b>?</b></span>`, choices: choices(ans, shuffle(near(ans, Math.max(3, Math.round(Math.abs(ans) * .15))))), answer:String(ans), explain:`Rule: ${why}` };
}

/* ---------------- Estimate It: order-of-magnitude intuition ---------------- */
// [question, answer, unit, fun fact]; tiers get less familiar
const FACTS = [
 [ ['How many bones in an adult human body?', 206, '', 'Babies are born with about 270; some fuse as you grow.'],
   ['How many states does Nigeria have?', 36, '', 'Plus the Federal Capital Territory, Abuja.'],
   ['How many countries are in Africa?', 54, '', 'The most of any continent.'],
   ['Speed of sound in air, in metres per second?', 343, 'm/s', 'At 20 °C. Count seconds between lightning and thunder, divide by 3: kilometres away.'],
   ['Height of Mount Everest, in metres?', 8849, 'm', 'Measured again in 2020 by China and Nepal together.'],
   ['Normal atmospheric pressure at sea level, in kPa?', 101.3, 'kPa', 'About 1 bar, or 14.7 psi.'],
   ['Roughly what percentage of your body is water?', 60, '%', 'Your brain is closer to 75%.'],
   ['How many days does the Moon take to orbit Earth?', 27.3, 'days', 'The full-moon-to-full-moon cycle is longer (29.5 days) because Earth moves too.'] ],
 [ ['How many litres of water fill an Olympic swimming pool (50 m × 25 m × 2 m)?', 2500000, 'L', '2,500 cubic metres. 1 m³ = 1,000 litres.'],
   ['Distance from Earth to the Moon, in km?', 384400, 'km', 'Light covers it in about 1.3 seconds.'],
   ['How many times does your heart beat in a day?', 100000, '', 'About 70 beats a minute × 1,440 minutes.'],
   ['Seconds in a year?', 31500000, 's', 'About π × 10⁷: a physicist\'s favourite shortcut.'],
   ['Height of the Burj Khalifa, in metres?', 828, 'm', 'The tallest building in the world since 2010.'],
   ['How many times does a honeybee beat its wings per second?', 230, '', 'That fast beat is the buzz you hear.'],
   ['Top flying speed of a honeybee, in km/h?', 25, 'km/h', 'About as fast as a casual cyclist.'],
   ['Power of a typical electric kettle, in watts?', 2000, 'W', 'That\'s why it trips weak sockets and generators.'] ],
 [ ['Length of the River Niger, in km?', 4180, 'km', 'Africa\'s third-longest river, flowing through five countries.'],
   ['Length of the River Nile, in km?', 6650, 'km', 'Usually counted as the longest river in the world.'],
   ['Distance from Earth to the Sun, in km?', 150000000, 'km', 'Sunlight takes about 8 minutes 20 seconds to reach you.'],
   ['Speed of light, in km per second?', 300000, 'km/s', 'More precisely 299,792 km/s in a vacuum.'],
   ['Typical smartphone battery capacity, in mAh?', 4500, 'mAh', 'Most phones today sit between 4,000 and 5,000 mAh.'],
   ['Clock speed of a modern laptop processor, in GHz?', 3, 'GHz', 'Three billion cycles every second.'],
   ['Diameter of a human hair, in micrometres (µm)?', 70, 'µm', 'Hair ranges from about 20 to 180 µm.'],
   ['Wavelength of green light, in nanometres?', 550, 'nm', 'Visible light runs from about 400 nm (violet) to 700 nm (red).'] ],
 [ ['How many neurons are in a human brain?', 86000000000, '', 'About 86 billion, each with up to thousands of connections.'],
   ['Age of the Earth, in years?', 4500000000, 'years', 'About 4.5 billion years, from dating meteorites and old rocks.'],
   ['Roughly how many cells are in a human body?', 37000000000000, '', 'Around 37 trillion. Red blood cells are the most common.'],
   ['Transistors in a flagship phone chip (2023)?', 19000000000, '', 'Apple\'s A17 Pro has about 19 billion.'],
   ['How many flowers do bees visit to make one 500 g jar of honey?', 2000000, '', 'Roughly 2 million. Respect the bees.'],
   ['Population of Nigeria (2024 estimate)?', 230000000, 'people', 'The most populous country in Africa.'],
   ['Bytes in one gigabyte (GB)?', 1000000000, 'bytes', 'A billion. (A gibibyte, GiB, is 1,073,741,824.)'],
   ['Surface gravity on Earth, in m/s²?', 9.81, 'm/s²', 'Drop something and it gains about 35 km/h every second.'] ],
];
const nice = n => { const a = Math.abs(n); if (a >= 1e12) return +(n / 1e12).toPrecision(3) + ' trillion'; if (a >= 1e9) return +(n / 1e9).toPrecision(3) + ' billion'; if (a >= 1e6) return +(n / 1e6).toPrecision(3) + ' million'; return (+n.toPrecision(3)).toLocaleString('en-GB'); };
function estGen(level){
  const tier = Math.min(FACTS.length - 1, Math.floor((level - 1) / 1.5)), [q, ans, unit, fact] = pickOne(FACTS[tier]);
  const f = level >= 5 ? [3, 1 / 3, 10] : level >= 3 ? [10, 1 / 10, 3] : [10, 1 / 10, 100];
  const opts = shuffle([ans, ans * f[0], ans * f[1], ans * f[2] ]).map(nice);
  return { q:`<span class="g-mid" style="font-size:1.05em">${q}</span><small class="note">Pick the closest</small>`, choices: opts, answer: nice(ans), explain: `${nice(ans)}${unit ? ' ' + unit : ''}. ${fact}` };
}

/* ---------------- Unit Dash: conversions against the clock ---------------- */
// [from, to, factor or function, level] ; inputs are chosen so answers come out clean
const UNITS = [
 ['km', 'm', 1000, 1], ['g', 'kg', 0.001, 1], ['mA', 'A', 0.001, 1], ['cm', 'mm', 10, 1], ['h', 'min', 60, 1], ['kW', 'W', 1000, 1],
 ['km/h', 'm/s', 1 / 3.6, 2], ['°C', 'K', c => c + 273, 2], ['L', 'm³', 0.001, 2], ['kPa', 'Pa', 1000, 2], ['min', 's', 60, 2], ['MB', 'kB', 1000, 2],
 ['bar', 'kPa', 100, 3], ['rpm', 'rad/s', 2 * Math.PI / 60, 3], ['inch', 'mm', 25.4, 3], ['kWh', 'MJ', 3.6, 3], ['µF', 'nF', 1000, 3], ['MΩ', 'kΩ', 1000, 3],
 ['hp', 'kW', 0.746, 4], ['mph', 'km/h', 1.609, 4], ['°F', '°C', f => (f - 32) * 5 / 9, 4], ['rad', '°', 180 / Math.PI, 4], ['psi', 'kPa', 6.895, 4], ['N·m', 'kN·m', 0.001, 4],
];
const INPUTS = { 'km/h': [18, 36, 54, 72, 90, 108], '°C': [0, 25, 37, 100, -40], '°F': [32, 50, 68, 98.6, 212], rpm: [60, 120, 300, 600, 3000], rad: [1, 2, 0.5, 3.14], hp: [1, 10, 100, 2], mph: [10, 30, 60, 100], psi: [10, 30, 100, 14.7], kWh: [1, 2, 5, 10], inch: [1, 2, 4, 10, 12] };
const r3 = n => +(+n).toPrecision(4);
function unitGen(level){
  const pool = UNITS.filter(u => u[3] <= Math.min(4, Math.ceil(level / 1.5)) && u[3] >= Math.max(1, Math.ceil(level / 1.5) - 1));
  const [a, b, f] = pickOne(pool), x = INPUTS[a] ? pickOne(INPUTS[a]) : pickOne([2, 3, 5, 7.5, 12, 25, 40, 250, 0.5, 1.2]);
  const conv = typeof f === 'function' ? f : v => v * f, ans = r3(conv(x));
  const wrong = typeof f === 'function' ? [r3(x - 273), r3(ans + 32), r3(x * 1.8 + 32), r3(ans * 2)] : [r3(x / f), r3(ans * 10), r3(ans / 10), r3(ans * 1000)];
  return { q:`<span class="g-big">${x} ${a}</span><small class="note">= ? ${b}</small>`, choices: choices(String(ans), wrong.map(String)), answer: String(ans), explain: `${x} ${a} = ${ans} ${b}${typeof f === 'function' ? '' : ` (×${r3(f)})`}.` };
}

const GAMES = {
  words: { name:'Word Hive', icon:'📖', blurb:'Vocabulary from academic to rare. Missed words come back until you learn them.', gen:wordGen, mode:'round' },
  math:  { name:'Number Sprint', icon:'🧮', blurb:'60 seconds of mental maths: arithmetic up to logs, derivatives and determinants.', gen:mathGen, mode:'sprint' },
  bits:  { name:'Bit Buzz', icon:'⚡', blurb:'Binary, hex, logic gates, Ohm\'s law, dividers, RC circuits. Mechatronics brain food.', gen:bitGen, mode:'round' },
  est:   { name:'Estimate It', icon:'🌍', blurb:'How many litres in an Olympic pool? Guess the right ballpark and learn a fun fact.', gen:estGen, mode:'round' },
  units: { name:'Unit Dash', icon:'📏', blurb:'60 seconds of unit conversions: km/h to m/s, rpm to rad/s, psi to kPa. Exam-useful.', gen:unitGen, mode:'sprint' },
};

const LINES = {
  great: ['Big brain energy. Bisi is impressed (rare).', 'Look at you. Academic weapon. 🐝', 'Honey, that was clean.'],
  ok: ['Not bad. Not bee-autiful either. Again?', 'Solid. Your lecturers would nod.', 'Respectable. One more round?'],
  low: ['Hmm. We don\'t talk about that round.', 'Even bees miss flowers sometimes. Go again.', 'Warm-up round. Obviously.'],
};

/* ---------------- UI ---------------- */
let root, ctx, g = null;
function hub(){
  g = null;
  const pollen = store.get('pollen', 0);
  root.innerHTML = `<section><div class="sh"><h2>Brain break</h2><small>🌼 ${pollen} pollen</small></div>
    <p class="g-intro">Quick games that make you smarter while you procrastinate. They work offline. The levels go up as you get them right, from Freshman to Professor.</p>
    ${window.FTPuzzles ? FTPuzzles.dailyCard() : ''}
    <div class="g-hub">${Object.entries(GAMES).map(([k, x]) => { const lv = store.get('lv-' + k, 1), best = store.get('best-' + k, 0);
      return `<button class="card g-card" data-game="${k}"><span class="g-ico">${x.icon}</span><b>${x.name}</b><small>${x.blurb}</small>
        <span class="g-meta"><span class="pill">${RANKS[lv - 1]} · L${lv}</span>${best ? `<span class="pill">Best ${best}</span>` : ''}</span></button>`; }).join('')}</div>
    ${window.FTPuzzles ? `<div class="sh" style="margin-top:22px"><h2>Puzzles</h2><small>levels that get harder</small></div><div class="g-hub">${FTPuzzles.hubCards()}</div>` : ''}
    ${window.FTFun ? `<div class="sh" style="margin-top:22px"><h2>Just for fun</h2><small>no learning, promise (mostly)</small></div>
    <div class="g-hub">${Object.entries(FTFun.list).map(([k, x]) => { const m = FTFun.meta(k);
      return `<button class="card g-card g-fun" data-fun="${k}"><span class="g-ico">${x.icon}</span><b>${x.name}</b><small>${x.blurb}</small>
        <span class="g-meta">${m ? `<span class="pill">${m}</span>` : ''}</span></button>`; }).join('')}</div>` : ''}
    ${store.get('review', []).length ? `<div class="card g-rev"><b>Words to review</b><div>${store.get('review', []).slice(-12).map(w => `<span class="pill">${w}</span>`).join(' ')}</div></div>` : ''}
  </section>`;
}
function start(key){
  const G = GAMES[key];
  g = { key, G, level: store.get('lv-' + key, 1), startLevel: store.get('lv-' + key, 1), score:0, right:0, total:0, streak:0, wrongRun:0, n:0, missed:[], ends: G.mode === 'sprint' ? Date.now() + 60000 : 0 };
  next();
  if (g.ends) tickTimer();
}
function tickTimer(){
  if (!g || !g.ends) return;
  const left = Math.max(0, g.ends - Date.now()), bar = root.querySelector('.g-time i');
  if (bar) bar.style.width = (left / 600) + '%';
  const s = root.querySelector('.g-secs'); if (s) s.textContent = Math.ceil(left / 1000) + 's';
  if (left <= 0) return finish();
  requestAnimationFrame(tickTimer);
}
function next(){
  if (!g) return;
  if (!g.ends && g.n >= 10) return finish();
  g.n++; g.cur = g.G.gen(g.level); g.answered = false;
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>${g.G.icon} ${g.G.name}</b>
      <span class="pill">L${g.level} · ${RANKS[g.level - 1]}</span></div>
    ${g.ends ? '<div class="g-time"><i></i></div>' : `<div class="g-prog">${Array.from({length:10}, (_, i) => `<i class="${i < g.n - 1 ? 'd' : i === g.n - 1 ? 'c' : ''}"></i>`).join('')}</div>`}
    <div class="g-stats"><span>Score <b>${g.score}</b></span>${g.streak > 1 ? `<span>🔥 ${g.streak} streak</span>` : '<span></span>'}${g.ends ? '<span class="g-secs"></span>' : `<span>${g.n}/10</span>`}</div>
    <div class="card g-q">${g.cur.q}</div>
    <div class="g-ch ${g.cur.choices.length === 2 ? 'two' : ''}">${g.cur.choices.map((c, i) => `<button class="btn g-c" data-gc="${i}">${c}</button>`).join('')}</div>
    <div class="g-ex" id="g-ex" hidden></div>`;
}
function answer(i){
  if (!g || g.answered) return;
  g.answered = true; g.total++;
  const pick = g.cur.choices[i], ok = pick === g.cur.answer;
  root.querySelectorAll('.g-c').forEach((b, j) => { b.disabled = true; if (g.cur.choices[j] === g.cur.answer) b.classList.add('ok'); else if (j === i) b.classList.add('no'); });
  if (ok){ g.right++; g.streak++; g.wrongRun = 0; g.score += 10 * g.level + Math.min(g.streak - 1, 5) * 2;
    if (g.cur.word){ store.set('review', store.get('review', []).filter(w => w !== g.cur.word)); }
    if (g.streak % 3 === 0 && g.level < 6){ g.level++; ctx.toast(`Level up! ${RANKS[g.level - 1]} 🎓`); } }
  else { g.streak = 0; g.wrongRun++; if (g.cur.word){ g.missed.push(g.cur.word); const r = store.get('review', []).filter(w => w !== g.cur.word); r.push(g.cur.word); store.set('review', r.slice(-40)); }
    if (g.wrongRun >= 2 && g.level > 1){ g.level--; g.wrongRun = 0; } }
  const ex = root.querySelector('#g-ex');
  ex.innerHTML = `<b>${ok ? '✓ Correct' : '✗ Not quite'}</b> ${g.cur.explain}${g.ends ? '' : '<button class="btn primary g-next" data-gnext>Next →</button>'}`;
  ex.className = 'g-ex ' + (ok ? 'ok' : 'no'); ex.hidden = false;
  if (!g.ends) setTimeout(() => ex.scrollIntoView({ block:'center', behavior:'smooth' }), 50);
  if (g.ends) setTimeout(() => { if (g && g.answered) next(); }, ok ? 450 : 1300);
}
function finish(){
  const x = g; if (!x) return; g = null;
  const acc = x.total ? Math.round(100 * x.right / x.total) : 0;
  const prevBest = store.get('best-' + x.key, 0), best = Math.max(prevBest, x.score);
  store.set('best-' + x.key, best); store.set('lv-' + x.key, x.level); store.set('pollen', store.get('pollen', 0) + x.score);
  const mood = acc >= 80 ? 'great' : acc >= 50 ? 'ok' : 'low';
  root.innerHTML = `<div class="g-top"><button class="btn small ghost" data-gback>← Games</button><b>${x.G.icon} ${x.G.name}</b></div>
    <div class="card g-end">
      <div class="g-bisi">${window.bisiSvg ? bisiSvg(mood === 'great' ? 'party' : mood === 'ok' ? 'happy' : 'sassy', 96, true) : '🐝'}</div>
      <div class="g-score">${x.score}</div><div>${x.right}/${x.total} right · ${acc}%${x.score > prevBest && prevBest ? ' · <b>New best!</b>' : ''}</div>
      <div class="g-lv">${x.level > x.startLevel ? `Promoted to <b>${RANKS[x.level - 1]}</b> 🎓` : x.level < x.startLevel ? `Back to ${RANKS[x.level - 1]} for now` : `Still ${RANKS[x.level - 1]}`}</div>
      <p>${pickOne(LINES[mood])}</p>
      ${x.missed.length ? `<div class="g-rev"><b>Learn these:</b> ${[...new Set(x.missed)].map(w => { const it = WORDS.flat().find(y => y[0] === w); return `<div><b>${w}</b>: ${it ? it[1] : ''}</div>`; }).join('')}</div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn primary" data-game="${x.key}">Play again</button><button class="btn" data-gback>Other games</button></div>
    </div>`;
  if (mood === 'great' && ctx.confetti) ctx.confetti();
}
let funActive = null;
let pzActive = false;
function onClick(e){
  const pz = e.target.closest('[data-pz]'); if (pz && window.FTPuzzles){ g = null; pzActive = true; FTPuzzles.start(pz.dataset.pz, root, ctx); return; }
  if (e.target.closest('[data-pzdaily]') && window.FTPuzzles){ g = null; pzActive = true; FTPuzzles.startDaily(root, ctx); return; }
  if (pzActive){ if (e.target.closest('[data-gback]')){ FTPuzzles.stop(); pzActive = false; hub(); } return; }
  const fun = e.target.closest('[data-fun]'); if (fun && window.FTFun){ g = null; funActive = fun.dataset.fun; FTFun.start(funActive, root); return; }
  if (funActive){ if (e.target.closest('[data-gback]')){ FTFun.stop(); funActive = null; hub(); } return; }
  const c = e.target.closest('[data-gc]'); if (c) return answer(+c.dataset.gc);
  if (e.target.closest('[data-gnext]')) return next();
  const s = e.target.closest('[data-game]'); if (s) return start(s.dataset.game);
  if (e.target.closest('[data-gback]')) return hub();
}
window.FTGames = {
  mount(el, c){ root = el; ctx = c || {}; if (!root.dataset.wired){ root.addEventListener('click', onClick); root.dataset.wired = 1; } if (!g && !pzActive && !funActive) hub(); },
  back(){ if (pzActive && window.FTPuzzles){ FTPuzzles.stop(); pzActive = false; hub(); return true; } if (funActive && window.FTFun){ FTFun.stop(); funActive = null; hub(); return true; } if (g){ g = null; hub(); return true; } return false; },
  _words: () => WORDS.flat(),
  playing(){ return !!g; },
  _gen: { wordGen, mathGen, bitGen, seqGen, estGen, unitGen },
};
})();
