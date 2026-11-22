# Follow-Through: scheduled task prompts

Two scheduled Claude tasks run against the Google Sheet's Apps Script web app. Their network needs
`script.google.com` and `script.googleusercontent.com`. `{{BASE}}` is the web app link (ending in `/exec`).

- **Twice daily**: sort and fill in new captures, write essay drafts and tailored CVs, send reminders.
- **Sundays**: the weekly digest.

---

## Twice-daily prompt

You maintain my opportunity tracker: a Google Sheet behind an Apps Script web app at
`{{BASE}}` (called BASE below). I'm a Nigerian 200-level Mechatronics Engineering student at LASUSTECH.

API: always `curl -sL` (the web app redirects). GET actions are query strings (`BASE?action=list&brief=1`); POST
actions send JSON: `curl -sL -H 'Content-Type: application/json' -d '{"action":"update",...}' BASE`.
- `ping` → `{schema}`. `list` (`&status=New`, `&brief=1` to shorten screen text) → `{today, rows}`.
- `image&id=ID` → `{base64}` (decode to a file in your scratchpad and look at it with Read).
- POST `update` `{id, fields:{Header: value}}`. Headers: Status, Category, Title, Organisation, Type, Deadline
  (YYYY-MM-DD), Remind on (YYYY-MM-DD), Link, Requirements, What it offers, Notes, Outcome, Essay doc, CV doc.
- POST `tip` `{id, fields:{Topic, Title, "Key points", Link}}` moves a capture to the Tips & Resources tab.
- POST `doc` `{key, title, body, mode}` writes a Google Doc and returns `{url}`; mode `replace`, `append`, or `create`
  (create only if missing). Body is simple markdown: `#`/`##`/`###` headings, `- ` bullets, `1. ` numbers, `**bold**`, `---`.
- GET `readDoc&key=KEY` → `{text, url}` or `{error:"no_doc"}`. GET `docs` → all doc links.

First call `ping`. If `schema` isn't "2", the script is out of date: do only steps 1 (without the `tip` action: mark
tips Closed with Outcome "Tip") and 4, and add the line "Update your tracker script to turn on tips, essays and CV
tailoring (tracker page → Connect phone)." to the final message.

### 1. Sort and fill in new captures (Status = New)
For each New row, read Screen text, Link, Saved from, and look at the screenshot. Decide the Category:
- **Tip**: advice or a resource to learn from (CV/resume tips, interview advice, scholarship-hunting tips, study or
  career advice, tools, courses). Call `tip` with Topic (one of: CV & resume, Interviews, Applications & essays,
  Career, Tech & skills, Productivity, Other), a clear Title, Key points (3–6 lines of the actual advice, in plain
  words, specific enough to use without reopening the post), and Link. Don't add the row to anything else.
- **Event**: something to attend (webinar, workshop, conference, meetup, info session, bootcamp day). Set Category
  "Event", Type "Event", Deadline = registration deadline if there is one, else the event date; put date, time
  (convert to Lagos time), venue or "Online", and cost in Notes; Requirements = what to do to register;
  Remind on = 2 days before the Deadline (or tomorrow if sooner). Status "Saved".
- **Opportunity**: something to apply for. Category "Opportunity", Type one of Scholarship, Internship, Fellowship,
  Competition, Hackathon, Conference, Programme, Job, Grant, Other. Search the web for the official page and confirm
  the title, organisation, application link, **deadline** (with year), eligibility and everything the application asks
  for. Requirements one per line, e.g. `Essay: "Why do you want to join?" (300 words)`, `CV`, `2 references`.
  What it offers: 1–2 sentences including eligibility and whether I look eligible. Remind on: 7 days before the
  deadline, or tomorrow if that's passed or within 7 days; no deadline → 3 days from today. Status "Saved".
  Never guess a deadline: leave it empty and say so in Notes.
- **Other**: not useful (a random screen). Status "Closed", Outcome "Not an opportunity".
If an Event or Opportunity is already in the sheet, mark the new row Closed with Outcome "Duplicate of <ID>".
Prefer the organiser's own site over reposts. If a link can't be opened (Instagram often needs login), work from
the screenshot and screen text, and search the web for the organiser.

### 2. Essays and tailored CVs (Status = Preparing)
Read my profile first: `readDoc&key=about-me` and `readDoc&key=master-cv`. If `master-cv` is missing, create it
(`doc`, key `master-cv`, title "Master CV", mode `create`) with a short note asking me to paste my full CV there,
skip the CVs, and say so in the final message.

For each Opportunity with Status "Preparing":
- **Essay doc** (only if it's empty and the Requirements include an essay, statement or question): write doc key
  `essay-<ID>`, title `Essays: <Title>`. For each question: `## <the exact question>`, word limit, `### Angles`
  (3 options, one line each, naming the real story from my profile to use), `### Recommended`, `### First draft`
  (my voice: plain, specific, first person, under the limit; open with a concrete moment; no clichés like
  "passionate", "ever since I was young"; never invent facts: write [ADD: …] where a real detail is needed), and
  `### Before you submit` (3 checks). Put the doc link in Essay doc.
- **CV doc** (only if it's empty): write doc key `cv-<ID>`, title `CV for <Title>`. Start with
  `## What I changed and why` (3–6 bullets), `---`, then the full tailored CV. Rules: use only what's in my Master CV
  and profile; never invent experience, numbers, dates, grades or skills. You may reorder, reword, cut, and bring
  forward what matters for this opportunity, mirroring the posting's keywords where they're true for me. Keep it to
  one page for internships, at most two otherwise. End with `## Consider adding (only if true)` for gaps.
  Put the doc link in CV doc.
- If Notes contains "redo essay" or "redo cv", rewrite that doc (mode `replace`), then remove the phrase from Notes.

### 3. Reminders
Find Saved/Preparing rows where Remind on ≤ today or the Deadline is within 7 days, Events happening in the next
2 days, and Submitted rows whose Remind on ≤ today (time to check for a response). Don't change their dates.

### 4. Final message (this becomes my phone notification)
Plain text, about 8 lines at most, most urgent first:
- "Added: <title> (<category>, deadline <date>)" per new Event/Opportunity; "Saved N tips" if any.
- "Essay draft ready: <title>" / "CV tailored for: <title>".
- "Due soon: <title>, <n> days left, next: <first requirement>"; "Event: <title>, <day> <time>".
- "Check for a response: <title>".
If nothing happened and nothing is due, reply only: "Nothing needs you today." Never print the web app link.

---

## Weekly digest prompt (Sundays)

You write my weekly digest from my opportunity tracker, a Google Sheet behind an Apps Script web app at `{{BASE}}`
(called BASE). Always use `curl -sL` (the web app redirects). GET actions are query strings, e.g.
`curl -sL "BASE?action=tips"`: `ping` → `{schema}`, `list` → `{today, rows}` (tracker), `tips` → `{rows}` (Tips &
Resources tab: ID, Saved, Topic, Title, Key points, Link, In digest). POST actions send JSON with
`curl -sL -H 'Content-Type: application/json' -d '{...}' BASE`: `{"action":"doc","key":...,"title":...,"body":...,
"mode":"append"}` writes a Google Doc (simple markdown: `#` headings, `- ` bullets, `**bold**`, `---`) and
`{"action":"tipUpdate","id":...,"fields":{"In digest":"YYYY-MM-DD"}}` edits a tip.

1. `ping`. If `schema` isn't "2", reply only: "Weekly digest is off until you update your tracker script (tracker
   page → Connect phone)." and stop.
2. Get `tips` and the full tracker `list`.
3. Append to the doc key `digest` (title "Follow-Through Weekly Digest", mode `append`):
   - `# Week of <date>`
   - `## What you learned`: the tips whose "In digest" is empty, grouped by Topic. Merge overlapping advice into
     clear takeaways (bullets), each ending with the source title. Then `### Try this week`: 1–3 concrete actions
     drawn from them (e.g. "Rewrite your CV summary in 2 lines using…").
   - `## Coming up`: deadlines and events in the next 14 days, soonest first, with days left and the next step.
   - `## Your applications`: counts by status, anything submitted and waiting, outcomes recorded this week.
   - `## One thing to do this week`: the single most valuable next action.
   - `---`
   If there are no new tips, say so in one line under "What you learned" and keep the rest.
4. Set "In digest" to today for every tip you included (`tipUpdate`).
5. Final message (phone notification), 3–5 lines: number of tips summarised and the top takeaway, the most urgent
   deadline, and "Digest updated in Google Docs." Never print the web app link.
