# AppTracker

Follows your applications (fellowships, jobs, scholarships, programmes…) from **"we received your
application"** to the **final email**, so a life-changing email never gets buried again.

- Reads only emails that look like applications (Gmail filters first, then AI checks them).
- Understands each email: organisation, stage, decision, *"you'll hear back by…"* windows, and
  *"confirm your spot by…"* deadlines.
- Pins important emails in Gmail (star, important, `AppTracker` label) and **rescues them from Spam**.
- Alerts you on **WhatsApp** and in the **Android app**, and keeps reminding you until you tap **Handled**.
- Counts down deadlines (3 days, 24 h, 6 h, 1 h, overdue).
- Tells you when a response window passes with **no news** (check Spam, the portal, or follow up).
- For applications that never email you: **share the page to the app** and it reads the dates itself.

```
Gmail ─► Apps Script in your Google account ─► Claude (reads only the matching emails)
                 │  cases, actions, alerts in a Google Sheet
                 ├─► WhatsApp (CallMeBot)     instant, repeats until handled
                 └─► Android app + widget     syncs every 15 min, alarm-style alerts
```

Everything runs inside **your own Google account**. There is no server to host. Each person who uses it
sets up their own copy (about 15 minutes).

---

## 1. Get the keys you'll need

| What | Where | Notes |
|---|---|---|
| **Claude API key** | [console.anthropic.com](https://console.anthropic.com) → API Keys | Add some credit. See *Cost* below. |
| **WhatsApp (CallMeBot) key** | [callmebot.com → Free WhatsApp API](https://www.callmebot.com/blog/free-api-whatsapp-messages/) | Save their number in your contacts, send them the activation message from WhatsApp, and they reply with your `apikey`. Free for messages to yourself. |

## 2. Install the script

1. Go to [script.google.com](https://script.google.com) → **New project**. Name it `AppTracker`.
2. Delete the sample code and paste all of [`apps-script/Code.gs`](apps-script/Code.gs).
3. **Project Settings** (⚙️) → tick **Show "appsscript.json" manifest file**. Back in the editor, open
   `appsscript.json` and replace it with [`apps-script/appsscript.json`](apps-script/appsscript.json).
   (Change `"timeZone"` if you're not in Nigeria.)
4. **Project Settings → Script Properties → Add**:

   | Property | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your Claude API key |
   | `WHATSAPP_PHONE` | your number with country code, e.g. `+2348012345678` |
   | `CALLMEBOT_APIKEY` | the key CallMeBot sent you |

5. In the editor, pick **`setup`** in the function dropdown → **Run**.
   Google will warn that the app isn't verified. That's expected, because it's your own script:
   **Advanced → Go to AppTracker (unsafe) → Allow**.
6. Open **Executions** (or the log at the bottom) and copy the **APP_TOKEN** it printed.
7. **Deploy → New deployment** → type **Web app** → *Execute as:* **Me**, *Who has access:* **Anyone** → Deploy.
   Copy the URL ending in `/exec`.
8. Add one more Script Property: `WEB_APP_URL` = that URL. (This puts a "✅ Tap when handled" link
   in WhatsApp alerts.)
9. Run **`testWhatsApp`**. You should get a WhatsApp message.
10. Run **`testClaude`**. The log shows what it understood from your latest application-looking email.
11. Optional: run **`backfill`** once to pick up applications from the last 30 days.

From now on it checks every 5 minutes and sends a morning summary at 7:00.

## 3. Install the Android app

1. Download the APK: from the latest **AppTracker Android build** run in this repo's **Actions** tab
   (artifact `AppTracker-apk`), or use the file shared with you.
2. Open it on your phone and allow **Install unknown apps** when asked.
3. Open AppTracker → ⚙️ → paste the **web app URL** and **APP_TOKEN** → **Test connection** → Save.
4. Allow notifications. Then, in ⚙️:
   - **Allow full-screen alerts.** Acceptances and deadlines then show up like an alarm, even on the lock screen.
   - In notification settings, let the *Critical* channel **override Do Not Disturb**.
5. Long-press your home screen → **Widgets** → **AppTracker**.
6. Applied somewhere that won't email you? Use **Share → AppTracker** on the application page, or tap
   **Log application**.

## How alerts work

| Level | Examples | What happens |
|---|---|---|
| 🚨 **Critical** | Accepted / offer, interview or test invite, anything with a deadline, deadline countdowns | WhatsApp immediately, then **every 3 h until you tap Handled** (max 12, paused 23:00–06:00). Full-screen alert on the phone. The notification comes back 10 min after you swipe it away. |
| 📌 **Important** | Shortlisted, rejection, response window opens, "no news yet" | One WhatsApp message and one notification |
| ℹ️ **Info** | "We received your application" | Shown in the app and the morning summary only |

Tapping **Done** on a to-do silences every alert about it. A case closes on a rejection, withdrawal or
completion email (graduation, wrap-up, certificate), or when you tap **Mark finished**.

## Settings (optional Script Properties)

| Property | Default | |
|---|---|---|
| `CLAUDE_MODEL` | `claude-opus-5-5` | Set to `claude-haiku-5-5` to cut AI cost by ~40× (see below) |
| `CLAUDE_EFFORT` | `low` | How hard the model thinks per email |
| `REMIND_EVERY_HOURS` | `3` | Gap between WhatsApp reminders for unhandled critical alerts |
| `MAX_REMINDERS` | `12` | Stop re-sending one alert after this many |
| `QUIET_START_HOUR` / `QUIET_END_HOUR` | `23` / `6` | No *repeat* reminders in this window (first alerts still go out) |
| `MAX_EMAILS_PER_RUN` | `15` | Safety cap per 5-minute run |
| `DIGEST_HOUR` | `7` | Morning summary hour (re-run `setup` after changing) |

## Cost

Only emails that match the keyword search are sent to Claude, and each email is sent only once.
These are rough figures, assuming about 3,000 words in and 500 out per email:

- `claude-opus-5-5` (default): about **$0.02 per email**, roughly **$3–10/month** at 5–15 matching emails a day.
- `claude-haiku-5-5`: about **$0.0005 per email**, a few cents a month. It should handle this task
  well. Try it if cost matters.

Check real usage on the Anthropic console. You can set a monthly spend limit there.

## Privacy

- Gmail is searched **on Google's side** for application keywords and senders of open cases. Other
  emails are never opened by the script.
- Matching emails are sent to the Claude API for reading. Under Anthropic's standard API terms, API
  data isn't used for training.
- Your data lives in a Google Sheet named **AppTracker data** in your Drive. Delete it any time.
- The app talks only to your own Apps Script URL, protected by your `APP_TOKEN`. Don't share the
  token; anyone with it can read your tracked applications.

## Sharing with friends

Each person installs **their own copy** of the script (step 2). It reads their own Gmail, so nobody
sees anyone else's email. They can install the same APK and paste in their own URL and token.

## Known limits

- **Android 14+ lets you swipe away any notification.** AppTracker brings critical ones back after
  10 minutes and keeps sending WhatsApp reminders, so you still get the message.
- The app syncs every **15 minutes** (Android's minimum for background work). **WhatsApp is the
  instant channel.**
- CallMeBot is a free, unofficial service: it can be slow or rate-limited. The app is the backup.
- Google limits free accounts to about 90 minutes of script run time per day. Checking every 5 minutes
  normally uses well under that.
- Programmes that only post results on a portal or social media can't be read automatically.
  The "no news" alert reminds you to check them.

## Developing

- Backend tests (fake Gmail/Sheets/Claude/WhatsApp, full lifecycle):
  `node app-tracker/apps-script/test/run-tests.js`
- Android: `cd app-tracker/android && ./gradlew assembleDebug` (needs the Android SDK).
- For updates to install over an older APK, every build must use the same signing key. Create a
  keystore once, then add repo secrets `APPTRACKER_KEYSTORE_B64` (base64 of the `.jks`),
  `APPTRACKER_KEYSTORE_PASSWORD`, `APPTRACKER_KEY_ALIAS` and `APPTRACKER_KEY_PASSWORD`. Without
  them, CI signs with a throwaway debug key, so you'll need to uninstall before installing a newer build.
