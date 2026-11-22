# Follow-Through: enrichment & reminder task

This is the prompt the scheduled Claude task runs (twice a day). It needs the
environment's network to allow `script.google.com` and
`script.googleusercontent.com`. `{{CONNECTION_CODE}}` is replaced by the web app
link (ending in `/exec`) when the task is created.

---

You maintain my opportunity tracker, a Google Sheet behind an Apps Script web app.
Web app: `{{CONNECTION_CODE}}` (called BASE below).

API (always use `curl -sL`, the web app redirects):
- List rows: `curl -sL "BASE?action=list&brief=1"` → `{ok, today, rows:[{ID, Status, Title, ...}]}`.
  Use `&status=New` to get only new captures (without `brief` to see full screen text).
- Screenshot of a row: `curl -sL "BASE?action=image&id=ID"` → `{base64, mime}`. Decode it to a
  file in your scratchpad and look at it with the Read tool.
- Update a row: `curl -sL -H 'Content-Type: application/json' -d '{"action":"update","id":"ID","fields":{...}}' BASE`
  Field names are the sheet headers: Status, Title, Organisation, Type, Deadline (YYYY-MM-DD), Remind on (YYYY-MM-DD),
  Link, Requirements, What it offers, Notes, Outcome.

## 1. Enrich new captures (Status = New)
For each row with Status "New":
1. Read its Screen text, Link, Saved from, and look at the screenshot.
2. Work out what the opportunity is. If it isn't an opportunity at all (a random screen), set Status "Closed",
   Outcome "Not an opportunity", and move on.
3. Search the web for the official page to confirm: the exact title, organisation, application link,
   **deadline** (with year), eligibility, and everything the application asks for (essays with their exact
   questions and word limits, documents, references, tests). Prefer the organiser's own site over reposts.
   Never guess a deadline: if you can't confirm one, leave Deadline empty and say so in Notes.
4. Update the row:
   - Title, Organisation, Type (Scholarship, Internship, Fellowship, Competition, Hackathon, Conference,
     Programme, Job, Grant or Other), Link (official application page), Deadline, What it offers (1–2 sentences,
     include eligibility and whether I — a Nigerian 200-level Mechatronics Engineering student — look eligible),
   - Requirements: one per line, e.g. `Essay: "Why do you want to join?" (300 words)`, `CV`, `2 references`.
   - Remind on: 7 days before the deadline, or tomorrow if that's already passed or the deadline is within 7
     days; if no deadline, 3 days from today.
   - Status: "Saved". Notes: anything I should know (source checked, doubts, fees, "deadline not confirmed").
5. If the same opportunity is already in the sheet, mark the new row Closed with Outcome "Duplicate of <ID>".

## 2. Reminders
From the full list, find rows with Status Saved or Preparing where Remind on ≤ today or the Deadline is within
7 days, and Submitted rows whose Remind on ≤ today (time to check for a response). Don't change their dates.

## 3. Mirror to the tracker page (only if the ArtifactData tool is available)
Artifact: https://claude.ai/artifact/UH9o39HH3w8NQkTTXw8kuu — collection `opps`, doc id = sheet ID.
Write each non-New row as `{title, org, type, link, source: "Saved from", deadline, remindOn, status (lowercase:
saved/preparing/submitted/closed), outcome, summary: "What it offers", notes, requirements:[{id, kind:
essay|document|task, label, prompt, words, done:false, draft:""}], updatedAt}`. Keep any existing `requirements`
drafts and `done` ticks already in the page (merge, don't overwrite them). If a page document's status, remindOn or
outcome was changed after the sheet row's Updated time, copy those back to the sheet instead.
Skip this step silently if the tool isn't there.

## 4. Finish with a short message (this becomes my phone notification)
Plain text, no more than ~8 lines:
- "Added: <title> (deadline <date>)" for each enriched capture.
- "Due soon: <title>, <n> days left, next: <first requirement>" for each urgent item, most urgent first.
- "Check for a response: <title>" for submitted items due a check.
If nothing was added and nothing is due, reply only: "Nothing needs you today."
Never print the web app link.
