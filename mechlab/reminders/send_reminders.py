"""Send MechLab study reminders by phone push (ntfy) and email.

Run by .github/workflows/study-reminders.yml. Uses only the Python standard library.

Environment variables (set as GitHub Actions secrets; any channel left unset is skipped):
  NTFY_TOPIC          your private ntfy topic name (install the ntfy app and subscribe to it)
  GMAIL_ADDRESS       Gmail address to send from
  GMAIL_APP_PASSWORD  a Gmail "app password" (not your normal password)
  REMINDER_EMAIL_TO   where to send (defaults to GMAIL_ADDRESS)
  APP_URL             optional link to your MechLab page
  EMAIL_SLOTS         which reminders also go by email, comma-separated (default: evening)
"""
import argparse
import datetime as dt
import json
import os
import smtplib
import sys
import urllib.request
from email.message import EmailMessage
from pathlib import Path

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]  # matches datetime.weekday()
LAGOS = dt.timezone(dt.timedelta(hours=1))  # West Africa Time, no daylight saving


def load_courses():
    data = json.loads((Path(__file__).parent / "timetable.json").read_text(encoding="utf-8"))
    return data["courses"]


def on_day(courses, weekday):
    return [c["name"] for c in courses if DAYS[weekday] in c.get("days", [])]


def build(slot, now=None):
    """Return (title, body, click_query) for a slot, or None if there's nothing worth sending."""
    now = now or dt.datetime.now(LAGOS)
    courses = load_courses()
    # Night-owl logic: before 5 AM still counts as the previous day.
    day = now - dt.timedelta(days=1) if now.hour < 5 else now
    today = on_day(courses, day.weekday())
    tomorrow_wd = (day.weekday() + 1) % 7
    tomorrow = on_day(courses, tomorrow_wd)

    if slot == "morning":
        if not today:
            return None
        return (
            "Good morning! Which classes are confirmed today?",
            "Usually today: " + ", ".join(today) + ".\nTap to confirm in MechLab, and do a 10-minute recap before each class (tests are on the last lecture).",
            "?checkin=morning",
        )

    if slot == "evening":
        if tomorrow:
            body = (
                f"Usually tomorrow ({DAYS[tomorrow_wd]}): " + ", ".join(tomorrow) + ".\n"
                "1. Tap to confirm which are really holding.\n"
                "2. Set your alarm for 11:00 PM.\n"
                "3. Then nap. Future you says thank you."
            )
            return "Night check-in: what's confirmed for tomorrow?", body, "?checkin=night"
        if now.weekday() == 5:  # Saturday
            return "Weekly catch-up", "Clear your flashcards, then re-learn the topic that felt shakiest this week.", "?plan=1"
        return "10-minute study habit", "No classes tomorrow, but keep the streak going: clear your due flashcards in MechLab.", "?plan=1"

    if slot == "wake":
        if not tomorrow and not today:
            return None
        parts = []
        if tomorrow:
            parts.append("Revise the last lecture for: " + ", ".join(tomorrow) + " (tests tomorrow!)")
        if today:
            parts.append("5-question quiz on what was taught today: " + ", ".join(today))
        return "WAKE UP, it's study time", "Water first. Then:\n- 10 min flashcards\n- " + "\n- ".join(parts), "?plan=1"

    if slot == "late":
        if not today:
            return None
        return (
            "Quiz, then sleep",
            "Lock in today's classes with a 5-question quiz (" + ", ".join(today) + "), then lights out by 2:30. You did amazing.",
            "?plan=1",
        )
    raise ValueError(slot)


def send_ntfy(topic, title, body, url, urgent=False):
    headers = {"Title": title.encode("ascii", "ignore").decode(), "Tags": "alarm_clock" if urgent else "books", "Priority": "urgent" if urgent else "high"}
    if url:
        headers["Click"] = url
    req = urllib.request.Request(f"https://ntfy.sh/{topic}", data=body.encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        r.read()


def send_email(sender, password, to, title, body, url):
    msg = EmailMessage()
    msg["Subject"] = "MechLab: " + title
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(body + (f"\nOpen MechLab: {url}\n" if url else ""))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(sender, password)
        s.send_message(msg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", choices=["morning", "evening", "wake", "late"], required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    msg = build(args.slot)
    if not msg:
        print("Nothing to send for this slot today.")
        return 0
    title, body, query = msg
    print(f"{title}\n\n{body}")
    if args.dry_run:
        return 0

    base = os.environ.get("APP_URL", "").strip()
    url = base + query if base else ""
    email_slots = os.environ.get("EMAIL_SLOTS", "").strip() or "evening"
    sent, failed = 0, 0
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if topic:
        try:
            send_ntfy(topic, title, body, url, urgent=args.slot == "wake")
            sent += 1
        except Exception as e:  # keep going so email still gets a chance
            print(f"ntfy failed: {e}", file=sys.stderr)
            failed += 1
    sender, pw = os.environ.get("GMAIL_ADDRESS", "").strip(), os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    if sender and pw and args.slot in email_slots.split(","):
        try:
            send_email(sender, pw, os.environ.get("REMINDER_EMAIL_TO", "").strip() or sender, title, body, url)
            sent += 1
        except Exception as e:
            print(f"email failed: {e}", file=sys.stderr)
            failed += 1
    if not (topic or (sender and pw)):
        print("No channels configured (set NTFY_TOPIC and/or GMAIL_ADDRESS + GMAIL_APP_PASSWORD secrets).", file=sys.stderr)
        return 1
    print(f"Sent on {sent} channel(s).")
    return 1 if failed and not sent else 0


if __name__ == "__main__":
    sys.exit(main())
