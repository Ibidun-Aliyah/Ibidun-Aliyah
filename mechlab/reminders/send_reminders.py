"""Send MechLab study reminders by phone push (ntfy) and email.

Run by .github/workflows/study-reminders.yml. Uses only the Python standard library.

Environment variables (set as GitHub Actions secrets; any channel left unset is skipped):
  NTFY_TOPIC          your private ntfy topic name (install the ntfy app and subscribe to it)
  GMAIL_ADDRESS       Gmail address to send from
  GMAIL_APP_PASSWORD  a Gmail "app password" (not your normal password)
  REMINDER_EMAIL_TO   where to send (defaults to GMAIL_ADDRESS)
  APP_URL             optional link to your MechLab page
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
    now = now or dt.datetime.now(LAGOS)
    courses = load_courses()
    today = on_day(courses, now.weekday())
    tomorrow_wd = (now.weekday() + 1) % 7
    tomorrow = on_day(courses, tomorrow_wd)

    if slot == "morning":
        if not today:
            return None
        title = "Classes today: " + ", ".join(today)
        body = (
            "Each class may open with a test on the last lecture.\n"
            "Before each one, spend 10 minutes on MechLab > Today > Quick prep.\n\n"
            + "\n".join(f"- {c}" for c in today)
        )
        return title, body

    # evening
    if tomorrow:
        title = "Read tonight for tomorrow's tests"
        body = (
            f"Tomorrow ({DAYS[tomorrow_wd]}): " + ", ".join(tomorrow) + ".\n\n"
            "Plan (about 45 minutes):\n"
            "1. Open MechLab > Today > 'Revise last lecture' for each course.\n"
            "2. Do the Test prep questions out loud.\n"
            "3. Clear your due flashcards.\n"
        )
    elif now.weekday() == 5:  # Saturday
        title = "Weekly catch-up"
        body = "Clear your flashcards, then re-learn the topic that felt shakiest this week. Add any new notes to the Library."
    else:
        title = "10-minute study habit"
        body = "No classes tomorrow, but keep the streak going: clear your due flashcards in MechLab."
    return title, body


def send_ntfy(topic, title, body, url):
    headers = {"Title": title.encode("ascii", "ignore").decode(), "Tags": "books", "Priority": "high"}
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
    ap.add_argument("--slot", choices=["morning", "evening"], required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    msg = build(args.slot)
    if not msg:
        print("Nothing to send for this slot today.")
        return 0
    title, body = msg
    print(f"{title}\n\n{body}")
    if args.dry_run:
        return 0

    url = os.environ.get("APP_URL", "").strip()
    sent, failed = 0, 0
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if topic:
        try:
            send_ntfy(topic, title, body, url)
            sent += 1
        except Exception as e:  # keep going so email still gets a chance
            print(f"ntfy failed: {e}", file=sys.stderr)
            failed += 1
    sender, pw = os.environ.get("GMAIL_ADDRESS", "").strip(), os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    if sender and pw:
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
