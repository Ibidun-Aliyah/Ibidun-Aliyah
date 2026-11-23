# Follow-Through

See an opportunity → tap the bubble → it lands in your Google Sheet, filled in, with reminders.

```
 Phone (any app)                 Google Sheet ("Tracker")            Claude (twice a day)
 ┌──────────────┐  tap bubble   ┌────────────────────────┐  reads   ┌──────────────────────────┐
 │ Instagram /  │ ───────────▶  │ new row: screen text,  │ ◀──────▶ │ looks at the screenshot, │
 │ LinkedIn /   │  text + link  │ link, screenshot       │  writes  │ searches online, fills   │
 │ browser …    │  + screenshot │ Status = New           │          │ deadline + requirements, │
 └──────────────┘               └────────────────────────┘          │ sends your reminders     │
                                                                    └──────────────────────────┘
```

| Folder | What it is |
| --- | --- |
| `android/` | The floating-bubble app (Java, Android 11+). `releases/` has the ready-to-install APK. |
| `apps-script/Code.gs` | The script that turns your Google Sheet into the tracker's backend. |
| `enrich-task.md` | What the scheduled Claude task does with each new capture. |

## Setup (about 10 minutes)

### 1. The sheet (works from a phone browser)
1. In Chrome, open **script.google.com** → **New project** (tick ⋮ → *Desktop site* if it looks squashed).
2. Delete the sample code, paste all of `apps-script/Code.gs`, tap save.
3. **Deploy → New deployment → ⚙ → Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. Deploy, then
   **Authorize access** (Google warns it's unverified: **Advanced → Go to … → Allow**; it's your own script).
4. Copy the **Web app URL** (ends in `/exec`). That link is your connection code: keep it private.
   The tracker sheet ("Opportunities Tracker") is created in your Drive the first time the phone app connects.

The tracker page's **Connect phone** button walks through the same steps with a Copy button for the code.

### 2. The phone app
1. On your Android phone, download `android/releases/follow-through.apk` from this repo and open it. Allow
   "install unknown apps" for your browser when asked.
2. Open **Follow-Through**, paste the Web app link, tap **Save & test**. You should see "Connected" and an **Open my tracker sheet** button.
3. Tap **Open settings** → *Downloaded apps* → **Follow-Through bubble** → on.
   If it's greyed out ("restricted setting"): back in the app tap **App info** → ⋮ → **Allow restricted settings**,
   then switch it on.

### 3. Claude does the rest
Send Claude your Web app link and it sets up the twice-daily task that fills in new captures and pushes your
reminders.

## The app
Opening Follow-Through shows your **dashboard**, live from the sheet: what needs you today, your pipeline, the
next 30 days of deadlines, what you've saved each week, every opportunity/event/tip, and **My CV** (upload your
current CV, or describe something new and it's added). Tap any item to change its status, snooze it, or get
**essays** and a **tailored CV** written in under a minute. ⚙ opens Settings (sheet link, Gemini key, bubble).

**Instant sorting** uses a free Gemini API key (aistudio.google.com/apikey), stored only in your own Apps Script.
Captures are sorted seconds after you save them; the twice-daily Claude check then confirms deadlines online.
After updating the script, run `authorize` once in the editor (it now also needs permission to reach Gemini),
then deploy a new version.

## Bisi the bee 🐝
Follow-Through's mascot, with six moods (happy, worried, sassy, sleepy, party, crying) that follow how you're doing.
Bisi talks on the dashboard, the widget, notifications and emails: mostly passive-aggressive, occasionally sweet.
Source: `android/app/src/main/assets/bisi.js` (SVG + lines); PNGs in `res/drawable-nodpi/`.

## Looks
The app is hand-drawn: paper texture, wobbly ink outlines, sticker shadows, taped cards, pencil-hatched shading.
Tap 🎨 to pick **Hive** (honey and bee black, honeycombs, honey drips; your pipeline as honey jars) or **Garden**
(leaves, a vine, flowers and Dot the ladybug; your pipeline as plants growing from seed to bloom), and **Auto / Light /
Dark** (Hive starts in Light). Bisi comes in two styles: Polished on the dashboard, Plushie on the widget and in
notifications. The widget follows the look you pick.

## Emails
Your daily streak is your **nectar** 🍯: any real action collects a day of it, and Bisi cries if you spill the jar.

Sent from your own Gmail by the script's hourly timer (installed by running `authorize`), so they arrive even when
the phone is off: ☀️ morning brief (7:00), ⏳ deadline countdown at 7/3/1/0 days (9:00), 📬 results check (10:00),
😤 "you ignored me" for untouched deadlines ≤ 2 days away (18:00), 📊 Sunday digest (20:00). Buttons in emails
(I applied ✓, Remind me tomorrow, Accepted, Rejected…) update the sheet in one tap through signed links.

## Notes & reminders
The **Notes** tab is a sticky-note pad kept on the phone: checklists, colours, pins, search, and reminders at an exact
time (they ring even if the app is closed, and come back after a restart; buttons: Done ✓, 10 min, 1 hour).
**Hold Bisi's bubble** and talk (a small Bisi card listens right over the app you're in; it asks for the microphone once): “Call mum at 6pm” becomes a reminder, anything else a note, or send it to the
tracker as an opportunity. Typing a time in a note (“submit form tomorrow at 9am”) sets the reminder for you.

## Scroll guard
After an hour (you choose 30 min–2 h) in TikTok, Instagram, X, YouTube, Snapchat and similar apps, Bisi starts nudging
every 15 minutes with your most urgent task and its next step ("You could knock out a chunk in ~15 minutes if you locked
in"), getting sassier each time. Buttons: **🔒 Lock in** (opens your tasks), **10 more min**, **Not today**. A 5-minute
break, or opening Follow-Through, resets the clock. Set it up in **Me → Scroll guard** (WhatsApp and Telegram are off by
default). It uses the bubble's accessibility service and only sees which app is open, never what's on screen.

## iPhone, iPad and laptop (web version)
`docs/` is a web version of the same dashboard (built from the Android assets by `web/build.py`, plus `web/web.js`,
which stands in for the Android app). Served by GitHub Pages, it installs to an iPhone Home Screen with Bisi's icon and
works offline. Each person connects their **own** script (the welcome screen walks through it, with a Copy button for
`Code.gs`), adds a free Gemini key, and can set up iPhone Shortcuts for "Share → Save to Follow-Through" and Back Tap
screenshots. Notes with a time offer **Add to Calendar** (a web app can't ring on its own); the script's emails do the
rest of the nagging. Not on iPhone: the floating bubble and Scroll guard (iOS doesn't allow them).
After changing the dashboard, run `python3 follow-through/web/build.py` and commit `docs/`.

## More widgets
Long-press the home screen → Widgets → Follow-Through: **Nectar jar** (your streak as a honey jar that tips and drips at
7 pm if you haven't acted), **Brain snack** (a word, maths or circuits question a day; tap to reveal, Play opens the
games), **Sticky note** (your pinned note, or the next reminder; tick checklist items right there) and **Quick save**
(Say it · Paste link · Note, without opening the app).

## Updates
The Android app checks `docs/version.json` on the website and shows "Follow-Through x.y is out" with an **Update**
button that downloads the newest APK. The web version updates itself. `web/build.py` writes `version.json` from
`build.gradle` and `android/whatsnew.txt`.

## Brain break (games)
Four quick learning games, all offline, on **Today → Bored? Brain break** (or Me). **Word Hive** (vocabulary from
academic to rare; missed words come back until you learn them), **Number Sprint** (60-second mental maths, up to logs,
derivatives, determinants and integrals), **Bit Buzz** (binary/hex, logic gates, Ohm's law, dividers, RC, ADCs, two's
complement) and **Pattern Hunt** (sequences). Levels go Freshman → Professor: three right in a row moves you up, two
wrong moves you down, and your level is kept.

## Offline
Without internet the app shows your last saved tracker, and notes, reminders, games, Scroll guard and the bubble all
keep working. Status changes, edits, deletes and captures are saved on the phone and sent when you're back online.
Sorting, AI help (essays, CV, eligibility…) and live updates need a connection.

## Applied history
The dashboard's **Applied history** tab lists everything you've applied to by month, with results (Accepted,
Shortlisted, Interview, Rejected, No response, Waiting), your success rate, applications per month, and a
**Copy list** button for essays and your portfolio. Marking something Submitted records the date; tap a result
when you hear back.

## The nagging (on purpose)
Add the **Follow-Through widget** to your home screen (long-press the home screen → Widgets). It shows your streak 🔥,
the most urgent thing in a nagging voice, and your next deadlines; it turns amber, then red, as deadlines get close.
The app also checks every hour (08:00–22:00) and sends notifications that escalate until you act: a morning summary,
repeat nudges every 3 hours (2 when something closes today), a streak warning after 7 pm, and a poke when you haven't
saved anything for 3 days. Notifications have **Tomorrow** and **I applied ✓** buttons.

## What it does with each capture
| Kind | Where it goes |
| --- | --- |
| **Opportunity** (scholarship, internship, job, fellowship…) | Tracker tab, with deadline, requirements and a reminder |
| **Event** (webinar, workshop, conference…) | Tracker tab, Category "Event", reminded 2 days before |
| **Tip / resource** (CV tips, career advice…) | Tips & Resources tab, summarised in the Sunday digest |

**Essays and CVs:** set an opportunity's Status to **Preparing**. On the next run Claude writes two Google Docs in
the *Follow-Through* Drive folder: essay angles plus first drafts, and a CV tailored from your **Master CV** with a
"what I changed and why" note. Their links appear in the *Essay doc* and *CV doc* columns. Write `redo essay` or
`redo cv` in Notes to get a fresh version.

**Weekly digest:** every Sunday evening the *Follow-Through Weekly Digest* doc gets a new section with your saved tips
condensed into takeaways, what's due in the next two weeks, and where your applications stand.

## Updating the script
Paste the new `Code.gs`, save, then **Deploy → Manage deployments → ✎ → Version: New version → Deploy**. This keeps
the same web app link. ("New deployment" makes a new link, and the phone app would stop saving.)

## Using it
- **Tap the bubble**: saves what's on screen. It turns ✓ green when it's in the sheet.
- **Drag** it anywhere; it tucks into the edge. **Hold** it to talk (reminder, note or opportunity). Drag it to the bottom edge to hide it for a while.
- **Share → Save to Follow-Through** works from any app too.
- No internet? Captures wait on the phone and send themselves later.
- In the sheet, change **Status** as you go: New → Saved → Preparing → Submitted → Closed.

## Building the app yourself
```
cd android
echo "sdk.dir=/path/to/Android/sdk" > local.properties
./gradlew assembleDebug        # → app/build/outputs/apk/debug/app-debug.apk
```
