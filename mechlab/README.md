# MechLab ⚙️

A personal AI study lab for my mechatronics courses. Upload lecture notes, slides, photos of handwritten notes and past questions; MechLab teaches them back in whatever format makes it click, rebuilds forgotten prerequisites, decodes the jargon, and reminds me to read before every class.

## What it does

**🏠 Home**
- **Night and morning check-ins.** At night it asks which classes are confirmed for tomorrow; in the morning, which are confirmed for today. It learns each weekday's real pattern from your answers and shows its guess as a %.
- **Tonight's plan.** A timeline built around your sleep: nap at 7:30 PM → wake at 11 PM → flashcards → revise tomorrow's courses → quiz on today's → sleep by 2:30 AM.
- **Rewards.** Sparkles ✨, levels (Curious Cadet → Mechatronics Mastermind), badges, a streak and confetti, with Gigi the gear cheering you on.

**📘 Learn**: modes that teach your uploaded notes until they click:

| Mode | What you get |
|---|---|
| 📘 Teach me | Full lesson from zero: big picture → prerequisites → jargon → intuition → maths → worked example → exam traps |
| 🧱 Prerequisites | Maps the chain of earlier knowledge a topic needs, quizzes you up the chain and re-teaches what you've forgotten |
| 🎛 Visualise | Generates a live interactive simulation for the concept |
| 💡 Analogy · 🔤 Jargon · ✍️ Worked example · ❓ Quiz me · 🗣 Explain back · 📜 Past questions · ⏰ Test prep | |

**🎀 Quiz**: 5-question multiple-choice tests on what was taught today, with instant explanations. Missed questions turn into flashcards automatically.

**🧪 Labs**: practise for real, in the browser:
- **⚙️ CNC G-code Studio** (Industrial Automation): write G and M codes and watch a simulated mill cut your part, with a top view, side view and position readout. It explains every line in plain English and catches mistakes the way a real machine would (no feed rate, spindle off, rapid move into the material, bad arc centre…). It includes examples, a searchable cheat sheet and 4 challenges.
- **👁️ Vision Lab** (Computer Vision): grayscale, threshold, blur, sharpen, Sobel edges and custom kernels, with a pixel inspector that shows the convolution maths for any pixel you tap. Plus **train your own image classifier** with your camera (k-nearest neighbours) and watch it predict live.

**💌 Cards**: spaced-repetition flashcards and a glossary that fill themselves in.

---|---|
| 📘 Teach me | Full lesson from zero: big picture → prerequisites → jargon → intuition → maths → worked example → exam traps |
| 🧱 Prerequisites | Maps the chain of earlier knowledge a topic needs, then quizzes you up the chain and re-teaches what you've forgotten |
| 🎛 Visualise | Generates a live interactive simulation (sliders, plots, animation) for the concept |
| 💡 Analogy | Two everyday analogies, mapped term by term, with where each one breaks down |
| 🔤 Jargon | Decodes every technical term in plain English and saves it to your glossary |
| ✍️ Worked example | Step-by-step solution with the *why* of each step, then one for you to try |
| ❓ Quiz me | One question at a time, graded, with weak spots turned into flashcards |
| 🗣 Explain back | You explain it, it finds the gaps like an examiner |
| 📜 Past questions | Topic frequency table, repeated patterns, likely questions, one fully solved |
| ⏰ Test prep | One-page summary + 10 likely test questions for tomorrow's class test |

Plus: **😵 Still confused** (tries a completely different approach), a **glossary** that builds itself, **spaced-repetition flashcards** created automatically from every lesson, a **study streak**, and **phone + email reminders** tied to your timetable.

---

## Setup (about 15 minutes total)

### 1. Get a free Gemini API key (2 min)
1. Go to **aistudio.google.com**, sign in with Google, click **Get API key → Create API key**.
2. Copy it (starts with `AIza…`).

### 2. Put MechLab online with GitHub Pages (5 min)
1. Merge this branch into `main`.
2. On GitHub: repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
3. After a minute, MechLab is at `https://<your-username>.github.io/<repo-name>/mechlab/`
4. Open it, go to **Settings**, paste your Gemini key, press **Load my models**, then **Test connection**.
5. **Install it as an app.** Phone (Chrome): open the link → ⋮ menu → **Add to Home screen / Install app**. iPhone (Safari): Share → **Add to Home Screen**. Laptop (Chrome/Edge): click the install icon in the address bar. It then opens in its own window, like a real app.

> GitHub Pages is free for public repositories. Your notes and keys are **not** uploaded to GitHub. They stay in your browser.

### 3. Phone + email reminders (8 min)
Reminders run on GitHub's servers, so they arrive even when MechLab is closed. Tapping one opens MechLab at the right spot:

| Time (Lagos) | Reminder |
|---|---|
| 6:33 AM | Confirm today's classes (class days only) |
| 7:13 PM | Confirm tomorrow's classes, set your 11 PM alarm, nap |
| 10:52 PM | ⏰ **Wake up, study time** (urgent priority, rings louder) |
| 1:31 AM | Do today's quiz, then sleep |

Only the 7 PM one is also emailed (change it with a repository **variable** `EMAIL_SLOTS`, e.g. `evening,wake`).

> **Use a real phone alarm for 11 PM too.** GitHub sometimes runs scheduled jobs 5–30 minutes late, so the notification is a backup, not your alarm clock. **Settings → Download alarms (.ics)** adds all of these as calendar events with alerts.

**Phone (free ntfy app):**
1. Install **ntfy** from the Play Store / App Store.
2. Tap **+**, subscribe to a topic name only you know, e.g. `mechlab-` followed by random letters (`mechlab-k7q2xw9p`). Anyone who knows the name can see your reminders, so make it unguessable.

**Email (Gmail):**
1. Turn on 2-Step Verification on your Google account.
2. Go to **myaccount.google.com/apppasswords**, create an app password called "MechLab", and copy the 16-letter code.

**Connect them to GitHub:**
1. Repo **Settings → Secrets and variables → Actions → New repository secret**, and add:
   - `NTFY_TOPIC`: your topic name
   - `GMAIL_ADDRESS`: your Gmail address
   - `GMAIL_APP_PASSWORD`: the 16-letter app password
   - `REMINDER_EMAIL_TO` (optional): a different address to receive reminders
2. Under the **Variables** tab, add `APP_URL` = your MechLab link (so tapping the reminder opens it).
3. Test it: **Actions → Study reminders → Run workflow**. You should get a phone notification and an email within a minute.

Notes:
- Scheduled reminders only run from the repo's default branch (`main`), so merge first.
- GitHub can be a few minutes late on scheduled runs.
- GitHub pauses scheduled workflows in public repos after 60 days without any commits. If reminders stop, go to Actions and re-enable it.
- To change reminder times, edit the two `cron:` lines in `.github/workflows/study-reminders.yml` (times are UTC; Lagos is UTC+1).

### 4. When the timetable changes
Edit the courses and days in **MechLab → Settings → Courses & timetable**, press **Copy timetable.json**, and paste it over `mechlab/reminders/timetable.json` on GitHub (pencil icon → paste → Commit).

You can also **Download calendar (.ics)** and import it into Google Calendar as an extra set of alerts.

---

## Using Claude instead of Gemini (optional)
In Settings, switch the provider to **Anthropic Claude** and paste an API key from **platform.claude.com** (Claude Pro does *not* include API access; API credits are separate). Pick the model:
- **Opus 5.5**: best explanations; roughly $0.10–$0.50 per lesson depending on how big your PDFs are
- **Sonnet 5.5**: about half of Opus
- **Haiku 5.5**: about 1/40 of Opus; $25 would last the whole semester

Ticked materials are cached, so follow-up questions in the same session cost much less than the first message.

## Privacy
- API keys and all your files, sessions, flashcards and glossary are stored only in this browser (IndexedDB). Use **Settings → Export backup** before clearing browser data or changing phones.
- When you study, the ticked materials are sent directly from your browser to Google (Gemini) or Anthropic (Claude). On Gemini's free tier, Google may use the content to improve its products. That's fine for course notes, but don't upload private documents.

## Files
```
mechlab/
  index.html, style.css, app.js   the app (no build step)
  prompts.js                      all the teaching instructions; tweak these to change how it teaches
  labs/gcode.js                   G-code interpreter + CNC simulator
  labs/vision.js                  image filters + camera classifier
  manifest.webmanifest, sw.js     makes it installable and work offline
  vendor/                         bundled libraries (marked, DOMPurify, KaTeX, Anthropic SDK)
  reminders/timetable.json        timetable used by the reminder job
  reminders/send_reminders.py     sends ntfy + email reminders
.github/workflows/study-reminders.yml
```

Run locally: `cd mechlab && python3 -m http.server 8000`, then open http://localhost:8000.
