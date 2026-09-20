"""Checks each listing field against the Atlassian character limits."""
import pathlib
import re
import sys

LIMITS = {
    "App name": 60,
    "Tagline": 130,
    "Summary": 250,
    "More details": 1000,
    "Highlight title": 50,
    "Highlight summary": 220,
    "Highlight caption": 220,
    "Release summary": 80,
    "Release notes": 1000,
}

text = pathlib.Path("marketing/listing.md").read_text()
fails = 0


def report(label, body):
    global fails
    limit = LIMITS[label]
    n = len(body.strip())
    ok = n <= limit
    if not ok:
        fails += 1
    print(f"{'ok ' if ok else 'OVER'}  {label:<18} {n:>4} / {limit}")


def section(name):
    m = re.search(rf"^## {re.escape(name)}\n(.*?)(?=\n## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def strip_notes(body):
    # Drop the blockquote guidance and markdown bold labels before counting.
    body = re.sub(r"^> .*$", "", body, flags=re.M)
    return body.strip()


report("App name", strip_notes(section("App name")))
report("Tagline", strip_notes(section("Tagline")))
report("Summary", strip_notes(section("Summary")))
report("More details", strip_notes(section("More details")))

for i in (1, 2, 3):
    body = section(f"Highlight {i}")
    for field, label in (
        ("Title", "Highlight title"),
        ("Summary", "Highlight summary"),
        ("Caption", "Highlight caption"),
    ):
        m = re.search(rf"\*\*{field}:\*\* (.*?)(?=\n\n|\Z)", body, re.S)
        report(label, m.group(1) if m else "")

report("Release summary", strip_notes(section("Release summary")))
report("Release notes", strip_notes(section("Release notes")))

print("\nem dashes in listing:", text.count("—"))
sys.exit(1 if fails else 0)
