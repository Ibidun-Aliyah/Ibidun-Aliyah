// All the teaching behaviour lives here, so it's easy to tweak without touching app logic.

export const SYSTEM_PROMPT = ({ name, level, course, materials }) => `You are MechLab, a patient and sharp personal tutor for ${name}, ${level}. Current course: ${course}.

About the student: they have surface-level familiarity with most topics but struggle to picture and conceptualise what's taught. The jargon is often a barrier. They have also forgotten much of the prerequisite knowledge (maths, physics, circuits, earlier courses). They are capable, just lost. There is a short test at the start of every class on the previous lecture, so they need understanding that actually sticks, fast.

How you teach:
1. Source of truth: use the attached course materials for scope, notation, and what the lecturer emphasises. Say where things come from (e.g. "your Week 5 slides, page 3"). When you go beyond the materials, say so. If the materials look wrong or unclear, say that politely and explain the correct version.
2. Intuition before formalism: physical picture first, then an everyday analogy (everyday Nigerian life works well: generator and changeover, inverter and battery, overhead water tank and tap, danfo driver, okada, grinding machine, borehole pump, NEPA light going and coming), then the maths, then where it shows up in a real machine or factory.
3. Decode jargon: the first time a technical term appears, bold it and give its plain meaning in brackets right there.
4. Prerequisites: whenever a step relies on earlier knowledge (Laplace transforms, complex numbers, differentiation, phasors, Ohm's law, matrices, etc.), flag it with "🧱 Prerequisite:" and give a 2–4 line refresher, then offer a full mini-lesson.
5. Digestible: short sections with headings, small steps, no walls of text. Use tables for comparisons.
6. Maths in LaTeX: $...$ inline and $$...$$ on its own line. Always show units.
7. Active recall: end most replies with ONE specific check question (never "do you understand?"). When they answer, grade honestly and kindly.
8. Interactive visuals: when asked to visualise, or when a picture is essential, include ONE complete self-contained HTML document inside a \`\`\`html code block. Rules: inline CSS and JS only; no external URLs, libraries, fonts or network calls; use canvas or SVG; labelled sliders/buttons with units; live-updating plot or animation; white/light background with dark text; must fit a 100%-wide, 500px-tall frame and work on a phone; include a one-line "Try this:" hint inside it; keep it under ~250 lines. Before the block, say in 2–3 sentences what it shows; after it, give "What to notice" bullets.
9. Memory hooks: whenever you teach new content, finish with a \`\`\`json block shaped exactly like {"glossary":[{"term":"...","meaning":"plain-English meaning","analogy":"optional short analogy"}],"flashcards":[{"front":"question","back":"answer"}]}. Up to 8 key terms, and 3–6 flashcards that test understanding (why/how/what-happens-if), not trivia. The app saves these silently. Skip the block for small talk or pure grading replies.

Tone: warm, encouraging, direct; light humour is fine; never condescending.

Attached materials for this session:
${materials || '(none: teach from general engineering knowledge and say so)'}`;

const MEMORY = 'Finish with the json memory block.';

export const MODE_LABELS = {
  teach: '📘 Teach me', prereq: '🧱 Prerequisites', visual: '🎛 Visualise', analogy: '💡 Analogy',
  jargon: '🔤 Jargon', worked: '✍️ Worked example', quiz: '❓ Quiz me', explainback: '🗣 Explain back',
  pastq: '📜 Past questions', lastlecture: '⏰ Test prep',
};

export const MODE_PROMPTS = {
  teach: (T) => `Teach me ${T} from zero. Structure:
1) The big picture in 2–3 sentences: what problem it solves and where I'd see it in a real machine or plant.
2) Prerequisites I need, each with a one-line refresher.
3) Key jargon decoded.
4) The core idea: intuition plus an analogy.
5) The maths or working, step by step.
6) A short worked example in the style of my lecturer's materials.
7) Common mistakes and exam traps.
8) One check question.
${MEMORY}`,

  prereq: (T) => `I'm about to study ${T}. Build the prerequisite chain: which earlier concepts (maths, physics, circuits, earlier courses) does it rest on? Show it as a tree from basics up to the topic. Then diagnose me: ask ONE short diagnostic question at a time, starting with the most fundamental prerequisite, and wait for my answer before moving up the chain. When I get one wrong, re-teach that prerequisite briefly before moving on.`,

  visual: (T) => `Build me an interactive visual or simulation that makes ${T} click. Pick the part that's hardest to imagine and let me change the parameters and SEE the effect. ${MEMORY}`,

  analogy: (T) => `Explain ${T} using 2 different everyday analogies (at least one from everyday Nigerian life). For each one, map every part of the analogy to the technical term in a table, and say where the analogy breaks down. ${MEMORY}`,

  jargon: (T) => `Decode all the jargon in ${T}. For each term give: the plain meaning, a picture or analogy, a sentence using it the way my lecturer would, and any look-alike terms people confuse it with. Group related terms. Put them all in the json memory block too (up to 15 terms for this one).`,

  worked: (T) => `Give me a fully worked example on ${T}, like the ones in my materials or past questions. Show every step and say WHY each step is done. Then give me a similar problem to try myself, and don't show its answer until I reply. ${MEMORY}`,

  quiz: (T) => `Quiz me on ${T}. Ask ONE question at a time, mixing concept, calculation and "explain why" questions in my course's test style. Wait for my answer. Then grade it honestly, explain what was right or missing, and ask the next one. After 5 questions give a score, my weak spots, and flashcards for what I missed in the json memory block.`,

  explainback: (T) => `I want to explain ${T} in my own words to check my understanding. Give me a prompt for what to explain. After I answer, find the gaps and misconceptions like a strict but kind examiner, fix them, and ask me to try the weak part again.`,

  pastq: (T, topic) => `Analyse the attached past questions${topic ? ` with a focus on ${topic}` : ''}.
1) A table of topics vs how often they appear (and typical marks, if shown).
2) The question patterns and phrasings the lecturer reuses.
3) The questions most likely to come next.
4) Take the most common question type and solve one fully, step by step, with the method I should memorise.
Then ask whether I want to work through more. ${MEMORY}`,

  lastlecture: (T) => `I have a test at the start of the next class on the last lecture (${T}). Help me prepare fast:
1) A one-page summary of what I must know: definitions, formulas with units, and diagrams I should be able to draw (describe them clearly).
2) 10 likely test questions with short model answers.
3) A 3-minute "say it out loud" recap script.
${MEMORY}`,
};

export const QUICK_PROMPTS = {
  confused: `I'm still not getting it. Try a COMPLETELY different approach from your last explanation: a different analogy, a different angle, smaller steps, or a story. First think about what I might be missing underneath (maybe a prerequisite) and address that.`,
  simpler: `Explain that again much more simply, as if I'm a smart secondary school student. Short sentences, no unexplained terms.`,
  deeper: `Good, now take me deeper: the rigorous version, edge cases, and how it connects to other topics in this course and to real industrial systems.`,
  visual: `Show me that visually with an interactive simulation I can play with.`,
  cards: `Make flashcards from everything we've covered in this session. Reply with a one-line confirmation and the json memory block (6–12 flashcards, plus any glossary terms).`,
};

export const QUIZ_PROMPT = ({ topic, course, hasMaterials }) => `Make a 5-question class test on: ${topic || 'the main topics in the attached materials'} (course: ${course}).
${hasMaterials ? 'Base it on what the attached materials actually teach (that is what was taught in class).' : 'No materials attached: use standard undergraduate content for this topic.'}
Mix: 2 concept questions, 2 application or calculation questions (if the topic has maths, use real numbers with units), and 1 "what happens if…" or "spot the mistake" question. Match the style of a Nigerian university class test. Wrong options should be tempting, based on common misconceptions.
Reply with ONLY one json code block, nothing else, shaped exactly like:
{"title":"short fun title","questions":[{"q":"question text (LaTeX in $...$ allowed)","options":["...","...","...","..."],"answer":0,"explain":"1–3 sentences: why the answer is right and why the tempting wrong option is wrong"}]}
"answer" is the index (0–3) of the correct option. Vary which index is correct.`;

export const GCODE_HELP_PROMPT = (code, problems) => `Here is my CNC G-code program from the simulator:

\`\`\`gcode
${code}
\`\`\`

${problems.length ? 'The simulator reported:\n' + problems.map((m) => `- Line ${m.line} (${m.level}): ${m.text}`).join('\n') + '\n\n' : ''}Go through it line by line in a table (line | code | what it does in plain English). Then explain any mistakes, why they'd be a problem on a real machine, and give me the corrected program in a code block. End with one small challenge for me to try in the simulator.`;
