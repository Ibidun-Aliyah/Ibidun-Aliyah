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

### 1. The sheet
1. Create a new Google Sheet (name it e.g. *Opportunities Tracker*).
2. **Extensions → Apps Script**. Delete what's there, paste all of `apps-script/Code.gs`, save.
3. Pick `setup` in the function menu and click **Run**. Allow the permissions it asks for (it's your own script;
   Google shows an "unverified app" warning: **Advanced → Go to project**).
4. **Deploy → New deployment → ⚙ → Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. Deploy and copy the
   web app URL.
5. Open **View → Logs / Execution log** from the `setup` run and copy the token. Your **connection code** is:
   `<web app URL>?token=<token>`. Keep it private; anyone with it can add rows to your sheet.

### 2. The phone app
1. On your Android phone, download `android/releases/follow-through.apk` from this repo and open it. Allow
   "install unknown apps" for your browser when asked.
2. Open **Follow-Through**, paste the connection code, tap **Save & test**. You should see "Connected".
3. Tap **Open settings** → *Downloaded apps* → **Follow-Through bubble** → on.
   If it's greyed out ("restricted setting"): back in the app tap **App info** → ⋮ → **Allow restricted settings**,
   then switch it on.

### 3. Claude does the rest
Send Claude your connection code and it sets up the twice-daily task that fills in new captures and pushes your
reminders.

## Using it
- **Tap the bubble**: saves what's on screen. It turns ✓ green when it's in the sheet.
- **Drag** it anywhere; it tucks into the edge. **Hold** it to hide it for an hour.
- **Share → Save to Follow-Through** works from any app too.
- No internet? Captures wait on the phone and send themselves later.
- In the sheet, change **Status** as you go: New → Saved → Preparing → Submitted → Closed.

## Building the app yourself
```
cd android
echo "sdk.dir=/path/to/Android/sdk" > local.properties
./gradlew assembleDebug        # → app/build/outputs/apk/debug/app-debug.apk
```
