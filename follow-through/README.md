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
