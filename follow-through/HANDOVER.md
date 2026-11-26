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

## 3. Current state (26 Nov 2026)

- **App version 6.7** (versionCode 37) built and pushed. The next build should be 6.8 / 38.
- **v6.5 module `assets/hive.js`** (FTHive): bee-path timeline in each opportunity sheet, Bee Pouch pane (`p-pouch`:
  documents in app storage via `Android.pouchPut/Get/Del/Open` or IndexedDB on web, metadata `ft-pouch`; essays in
  `ft-essays`), Today's plan (`ft-plan`, ticks requirements), heatmap + report card (Progress), Wall of wins (History),
  WhatsApp + Scriptable iPhone widget help cards (Me, `#me-hive`).
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
- **26 Nov · Event follow-ups (ideas only, waiting for her picks)**: asked for follow-ups for events (did you attend /
  still want to go, etc.) and for suggestions to choose from. Offered 14 numbered ideas: 1 "Are you going?" (Going/
  Maybe/Not going → why), 2 "Registered yet?" + save ticket link, 3 day-before prep card (Lagos time, map/join link,
  what to bring, traffic "leave by"), 4 calendar with 3h/1h alarms, 5 morning-of notification with Join/Directions,
  6 networking cheat sheet (Gemini), 7 "Did you go?" evening after (Attended/Missed/Cancelled → why), 8 quick recap
  (people/learned/opportunities mentioned → auto-captures), 9 people-you-met + 48h follow-up message drafts (Gemini),
  10 certificate/slides chaser after a week, 11 one-tap "Add to my CV" (cvAdd), 12 rate 1–5 to tune the daily scout,
  13 events stats + stickers in History, 14 next-year reminder for annual events. **Pending: build the numbers she picks.**
- **26 Nov · Built event follow-ups 1,2,3,5,6,7,8,9,12,13,14** (she clarified she'd also wanted *general* feature
  ideas, not just events). New `assets/events.js` (state in localStorage `ft-ev`; outcomes written to the row:
  Outcome Attended/Missed/Cancelled/Not going + Notes lines "Registered ✓", "Recap: rated N/5 · learned · met", "Met: …").
  Today cards (Did you go? / TODAY-TOMORROW prep / Are you going?), panel in the event sheet, recap sheet (rating, people,
  learnings, opportunities → `capture`), people-you-met → local reminder note with drafted message, next-year note for
  annual events, History event stats, stickers. Android `Nag.eventNudges`: 07–11 "Today: …" with Join/Directions, 19–22
  "How was …?". v6.4. Not built: 4 (calendar alarms), 10 (certificate chaser), 11 (Add to CV). **Pending:** she'll pick
  from a list of general feature ideas (sent in the same reply); scout prompt could also prefer events rated 4–5/5.
- **26 Nov · Picked general features (to build, in this order)**: ✅ wanted: **1 Application timeline as a bee path**
  (Bisi flies flower to flower through the stages and fills a **nectar pot at the end = Submitted**; whimsical),
  **3 Document vault** (she called it "document portal"/"B pawns"; she's tired of hunting for documents; quick access),
  **4 Essay library** (she can't find her old essays, so it'll mostly fill up with new ones + the AI drafts),
  **6 Monthly report card**, **8 Smart daily plan**, **10 WhatsApp capture**, **11 Results celebration wall**,
  **12 Deadline heatmap**, **15 widget for the iPhone friend**. ❌ Not now: reference tracker (most of her applications
  don't need references), interview mode, study buddy, exam-season mode, CGPA/semester planner, Bisi voice notes.
  Notes: WhatsApp capture can't be a free WhatsApp bot (paid API); free route = WhatsApp's Share → Follow-Through (Android,
  already works) / iPhone Share → shortcut. iPhone widget: free **Scriptable** app widget script (fetches her own script's
  dashboard JSON), or a Shortcuts widget. Document vault without a script update = files kept in the app (IndexedDB)
  with categories; Drive copy needs a script action later.
- **26 Nov · Built the picked features (v6.5)**: bee-path timeline (5 flowers Found→Read up→Gather→Polish→Submit nectar
  pot that fills with progress; Bisi bobs at the current flower), **Bee Pouch** (her "B pawns": documents auto-sorted into
  folders by filename, open/send to WhatsApp/Gmail via Downloads/Bee Pouch, kept on the phone; plus **essay library**,
  "Save to essay library" under Review my draft, and "you've written something similar" hints on opportunities),
  **Today's plan** (≤4 steps within ~2h weekdays/3h weekends; ticking ticks the requirement), **busy-ness heatmap**
  (12 weeks, counts effort spread before deadlines), **monthly report card** (A–E per subject, Bisi's comment, share),
  **Wall of wins** (framed accepted/shortlisted/interview + "brave tries"), **Save from WhatsApp** how-to (Share sheet;
  a bot would cost money), **iPhone widget** = Scriptable script copied from Me (contains her private URL, generated on
  device only). No script update needed. Pending: her feedback; Pouch has no Drive backup yet (would need a script
  action); maybe backup/export of the pouch later.
- **26 Nov · "App not responding, only notes work"** (she skipped installing 6.4, network was bad): not the skipped version
  (APKs are full installs) and not v6.5's JS (replayed her real 58 rows: all tabs <10 ms). Cause: `Tracker.call` waited
  up to 330 s per request on a weak connection, and the dashboard first flushed the offline queue file by file. Fix:
  only AI actions keep 330 s (`AI_SLOW`); dashboard 40 s, others 25 s; queue flush stops at the first failure.
  Released as **6.6/36**. The emulator never finished booting (30+ min, no KVM), so the fix wasn't run on a device;
  **Pending:** her confirmation it's responsive on a weak connection.
- **26 Nov · 6.6 showed blank Tracker/Progress/Pouch** (screenshots). Real cause of the "not responding" too: on startup
  with a cached dashboard, the first `render()` ran **before** `FTEvents.init`, `FTEvents.todayCards` threw (H null), which
  aborted the script before `load()` and the FTHive/FTWelcome inits (bug since v6.4; my tests missed it because they
  started without `ft-dash` cached). Fix (6.7/37): inits first, then `try{render()}` and `load()`; every render section
  wrapped in `part()` so one failure can't blank the app; FTEvents exports guarded until init. **Bee Pouch got its own
  tab** (7 tabs, label font .8rem; Today entry card removed, Me card kept). Testing lesson: always also test with
  `localStorage['ft-dash']` pre-filled and a hung network (scratchpad `t/cached.js`). Her data was never lost.
