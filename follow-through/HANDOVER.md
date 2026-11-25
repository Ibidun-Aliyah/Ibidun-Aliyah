# Follow-Through: handover for a new Claude session

Read this first. It's everything a new session needs to keep building Follow-Through with Aliyah without
re-learning it. (The repo is **public**: no private links, keys or personal details are written here. See
"Private things and where to find them".)

---

## 1. Who and what

- **Aliyah**: an engineering (Mechatronics) undergraduate in Lagos, Nigeria. Her level, school and other details are in
  her tracker profile (section 4). Android phone (no laptop most days). First time using Claude. Builds and tests everything on her phone.
- **Follow-Through**: her personal opportunity tracker. She saves scholarships/internships/hackathons/events from any app;
  AI sorts them into a Google Sheet; the app nags her until she applies ("as annoying as Duolingo"); AI helps with essays,
  CV tailoring, eligibility and interview prep. Mascot: **Bisi the bee** (passive-aggressive, occasionally sweet, bee puns).
- **A friend** uses the **iPhone/web version** with her own private tracker (invited via the in-app invite).
- Tools are all **free**: her own Google Apps Script + Sheet, a free Gemini API key (instant AI), and Claude scheduled
  tasks (background checks/scouting).

### How Aliyah likes to work
- Plain, friendly explanations; short steps; she's on a phone. Nigerian English/pidgin is welcome ("sha", "o").
- **Show mockups before implementing visual changes** (design canvas), then build what she picks.
- After every app change: build the APK, send it with `SendUserFile`, and summarise what changed in a few bullets.
- She often can't update the Apps Script (needs a laptop): **prefer changes that work without a script update**; batch
  script changes and remind her (she likes reminders at **7pm Lagos**).
- She's honest when she doesn't like something ("these are even worse"): ask focused questions, don't guess again.
- Voice typing mangles words ("Bisi" → "busy"/"BC", "Jerry" = probably "cherry"). Ask if unsure.

---

## 2. Architecture

```
Phone (Android app, Java)           Google (her own account)                  Claude (scheduled tasks)
 bubble · share · screenshots ─────▶ Apps Script web app (Code.gs) ◀────────── hourly check, daily scout,
 WebView dashboard (assets/)  ◀──── Google Sheet "Opportunities Tracker"        weekly digest
 widgets · notifications · alarms    Docs (essays, CVs, About me) · Gmail emails
iPhone/web: docs/ on GitHub Pages ──▶ same kind of script (each person has their own)
```

### Folders
| Path | What |
| --- | --- |
| `follow-through/apps-script/Code.gs` | The backend. JSON actions via `doGet`/`doPost`. `SCHEMA` constant = version. |
| `follow-through/android/` | Android app (Java, no AndroidX, minSdk 30). `releases/follow-through.apk` = latest build. |
| `follow-through/android/app/src/main/assets/` | The dashboard (shared by Android and web): `dashboard.html` (UI + logic), `bisi.js` (Bisi SVGs + lines), `grunge.js` (Loser-core look + beetle Bisi), `games.js` (Word Hive, Number Sprint, Bit Buzz), `fun.js` (Bee Chess engine + lessons + tutor, Bisi Flight, Honey Drop, Pollen Pairs), `welcome.js` (first-run tour, profile, carousel combiner), `fonts/`. |
| `follow-through/web/` | `web.js` (stands in for the Android bridge in browsers: fetch to the script, notes, settings/setup, invite envelope, iPhone Shortcuts guide), `sw.js` (offline), `build.py` (builds `docs/`). |
| `docs/` | The built web app served by **GitHub Pages**. Rebuild with `python3 follow-through/web/build.py`. Also holds `version.json` + `follow-through.apk` (the Android app's update check reads these). |
| `follow-through/README.md` | User-facing feature documentation (kept up to date). |

### Android app (package `com.followthrough.bubble`)
- `BubbleService`: accessibility overlay bubble (tap = capture screen text + link + screenshot; taps within 6 s = carousel
  slides of one post; hold = voice card; drag to bottom = hide). Also feeds `Focus` (Scroll guard).
- `MainActivity`: WebView + JS bridge `Android.*` (request, notes, voice, share, fetchPage, clipText, appVersion,
  checkUpdate, focusGet/Set, …). `Tracker`: HTTP to the script, offline queue, page-text enrichment for links, carousel
  `combine()`. `Nag`/`NagJob`: hourly refresh, notifications, widget, effort-aware urgency. `Widgets`: Nectar jar,
  Brain snack, Sticky note, Quick save. `Notes` + `NoteReminderReceiver`: local notes with exact alarms. `VoiceCard`/
  `VoiceActivity`: speech. `ShareActivity` (incl. SEND_MULTIPLE), `ClipActivity`, `Updates` (version check), `Focus`.
- Build: `cd follow-through/android && ./gradlew -q lintDebug assembleDebug` (SDK at `/root/android-sdk` in the old
  container; a new container may need the SDK installed: see section 6).

### The script (`Code.gs`)
- Actions: ping, dashboard, capture, list, update, image, tip, tips, tipUpdate, doc, readDoc, docs, delete, suggest,
  asset, stats, emailNow, emailSettings, profile/getProfile (v9), plus AI actions (process, essay, tailor, uploadCv,
  cvAdd, setKey, eligibility, review, interview) using Gemini.
- `readDocText_('about-me')` feeds sorting, eligibility, essays and interview prep. v9 adds a stored PROFILE in front.
- Emails via MailApp + hourly `emailTick` trigger (installed by running `authorize`). Signed action links.
- **Updating the script** (Aliyah does it): tracker page → Connect phone → Copy code → paste in Apps Script → Save →
  (run `authorize` only if new Google permissions) → Deploy → Manage deployments → ✎ → **New version** → Deploy.
  Never "New deployment" (it changes the link). The tracker page is a private claude.ai artifact (see section 4) whose
  "Connect phone" section embeds the current `Code.gs`; republish it whenever `Code.gs` changes.

---

## 3. Current state (25 Nov 2026)

- **App version 6.3** (versionCode 33) built and pushed. The next build should be 6.4 / 34.
- **Script**: repo has **schema 9** (profile store). Aliyah's live script may still be **schema 8** until she updates;
  check with `curl -sL "<web app URL>?action=ping"`. Everything in the app works on 8 (profile falls back to the
  About-me doc).
- **Looks**: Hive (default), Garden, Loser-core (dark grunge, beetle Bisi, made from the friend's mood board).

### Features (all shipped)
Capture (bubble, share incl. multi-image, screenshots upload with carousel combine, Quick add ＋ with SOS mode, voice,
copied link) · Gemini instant sorting (+ page text read on the phone) · rescue card for saves misfiled as "not an
opportunity" · effort-aware priorities (start-by dates, 🍯 effort tags, Tracker sort) · "Why not?" reasons when dropping
things + History chart · eligibility/essay review/interview prep · notes & reminders · widgets · Scroll guard · emails ·
nectar streak · stickers/celebrations · offline mode · welcome tour + profile · invite (envelope) for iPhone/Android
friends · in-app update banner + notification · games (Word Hive, Number Sprint, Bit Buzz; Bee Chess with 12 lessons +
tutor, Bisi Flight, Honey Drop, Pollen Pairs).

### Ideas / pending (ask Aliyah before starting)
- **Semester planner** (timetable, course deadlines, exams, CGPA): she wants it "in the future"; start with mockups.
- Chess: she had another chess idea but forgot ("leave it as is for now").
- Beetle Bisi for Android widgets/notifications in Loser-core (currently bee PNGs).
- "Jerry" game request: built Honey Drop as a guess (cherry-style merge); confirm.
- Merge the work branch into `main` and point GitHub Pages at `main` (see section 5).

---

## 4. Private things and where to find them (never commit these)

- **Her web app URL** (the key to her tracker): in the Android app (Settings), and inside the scheduled task prompts
  (use `list_triggers` / `get_trigger`). Treat it as a secret: don't print it in notifications or commit it.
- Her email, date of birth, CGPA and other profile details live in her tracker (About me doc / profile), not here.
- Private claude.ai artifacts (owner-only):
  - Tracker page with "Connect phone" + embedded Code.gs: `https://claude.ai/artifact/UH9o39HH3w8NQkTTXw8kuu`
  - Design canvas (all mockups: looks, Bisi, loading screens, widgets, gothic rounds, Loser-core):
    `https://claude.ai/artifact/1R9J8FuakuBgwJ78ptcuKi`
- Web app for iPhone/web users: `https://ibidun-aliyah.github.io/Ibidun-Aliyah/` (public, contains no data).

### Scheduled tasks (Claude, on her account)
| Name | When (Lagos) | What |
| --- | --- | --- |
| Follow-Through: hourly check | :17 past, 07–23 | confirms deadlines online, sorts leftovers, writes essays/CVs for Preparing rows, reminders at 07/19 |
| Follow-Through: Bisi's daily scout | 11:23 daily | searches widely, checks eligibility, adds up to 8 Suggested picks with an Eligibility verdict |
| Follow-Through: weekly digest | Sun 18:43 | appends tips + upcoming deadlines to the digest Doc |
| SIWES openings watch | Mon/Thu 08:41 | watches SIWES programmes (separate project) |
All prompts read her app profile (level, CGPA, etc.) from the tracker; update prompts with `update_trigger`.

---

## 5. Git, releases, GitHub Pages

- Repo `Ibidun-Aliyah/Ibidun-Aliyah` (**public**). All Follow-Through work is on branch **`ccr-56053f25-of024x`**.
- **GitHub Pages serves `/docs` from that branch.** A new session will be told to use a different branch. If it pushes
  elsewhere, the iPhone version and the update check won't update. Options: (a) ask Aliyah's permission to keep pushing to
  `ccr-56053f25-of024x`, or (b) merge it into `main` (with her OK) and switch Pages (repo Settings → Pages → Branch:
  `main`, `/docs`). Also update `INVITE_BASE`/`Updates.SITE` only if the Pages URL changes.
- **Release ritual** (every app change):
  1. Bump `versionCode`/`versionName` in `follow-through/android/app/build.gradle`; write one line in
     `follow-through/android/whatsnew.txt` (shown in the in-app update banner).
  2. `./gradlew -q lintDebug assembleDebug`; copy `app/build/outputs/apk/debug/app-debug.apk` to `releases/follow-through.apk`.
  3. `python3 follow-through/web/build.py` (copies assets + APK + version.json into `docs/`).
  4. Update `follow-through/README.md` **and add an entry to the Running log (section 7)**; commit (message ends with
     the session's attribution lines); push.
  5. `SendUserFile` the APK with a short caption.

---

## 6. Testing and gotchas

- Test the dashboard with Playwright from the **scratchpad** (never run screenshot scripts with cwd inside `assets/`:
  screenshots once ended up in the APK). Open `assets/dashboard.html` directly (demo data) or serve `docs/` and mock the
  script with `context.route('https://script.google.com/**', …)` so nothing touches her real sheet.
- Android emulator (slow, software only): `ANDROID_I_WANT_MY_TCG=yes emulator -avd ft -no-window -no-audio -gpu
  swiftshader_indirect -no-snapshot -accel off`; a temporary preview Activity can render RemoteViews widgets for screenshots
  (remove it afterwards).
- Chess engine: `perft` tests in `fun.js` (`module.exports = { Chess }`), all 5 standard positions pass; lessons were
  verified solvable by BFS.
- Android pitfalls hit before: apostrophes must be escaped in `strings.xml`; `NewApi` lint (guard API 31+ calls);
  lambdas need effectively-final variables; `InputStream.readAllBytes` is API 33+.
- The sandbox network blocks many sites (github.io, scholarship sites): use WebSearch / the web-fetch agent; the scheduled
  tasks can search the web.
- When editing `dashboard.html` with Python string replaces, assert the old text exists first (several edits silently
  failed before when text had changed).

---

## 7. Running log (newest last). **Add an entry for every request, before replying.**

Aliyah asked (25 Nov 2026) that this document update itself with everything she asks from now on, so nothing is lost
if the conversation is summarised or a new session starts. Rule: after finishing each request, append one entry here
(date · what she asked · what was done/decided · anything pending), commit and push with the change.

- **25 Nov · Daily scout ("web scraping")**: asked for Bisi to find *anything* she's eligible for from all over the
  internet, assess eligibility, and list it; she handles requirements herself. Done: the weekly-picks task became
  **"Follow-Through: Bisi's daily scout"** (11:23 Lagos daily, up to 8 picks, Strong/Possible eligibility verdict written
  to the Eligibility column via `update`). For-you cards show the verdict and sort best-first, with "See all". v6.3.
- **25 Nov · Handover document**: asked what happens when the context window fills up and for a handover so nothing is
  lost. Explained: the session auto-summarises and continues; only a brand-new session starts blank. Wrote this file +
  root `CLAUDE.md`. Told her to tell new sessions: read this file and keep pushing to `ccr-56053f25-of024x`.
- **25 Nov · Keep the handover updated automatically**: asked that every later request be written here so nothing after
  the handover's creation gets cut off. Done: this Running log + the standing rule in `CLAUDE.md` and the release ritual.
