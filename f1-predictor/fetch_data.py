"""Download real F1 results (2022-2026) from the open F1DB dataset on GitHub.

F1DB (https://github.com/f1db/f1db) is updated after every Grand Prix.
Folder names are <round>-<grand-prix-slug>, so we discover them by probing.
"""
import concurrent.futures as cf
import json
import pathlib
import sys

import requests
import yaml

BASE = "https://raw.githubusercontent.com/f1db/f1db/main/src/data/seasons"
OUT = pathlib.Path(__file__).parent / "data"
SEASONS = [int(s) for s in sys.argv[1:]] or [2022, 2023, 2024, 2025, 2026]
SLUGS = """australia china japan bahrain saudi-arabia miami emilia-romagna monaco spain
canada austria great-britain belgium hungary netherlands italy azerbaijan singapore
united-states mexico sao-paulo las-vegas qatar abu-dhabi barcelona-catalunya madrid
barcelona france portugal russia turkey styria eifel tuscany malaysia""".split()
FILES = ["race.yml", "race-results.yml", "qualifying-results.yml", "starting-grid-positions.yml",
         "free-practice-1-results.yml", "free-practice-2-results.yml", "free-practice-3-results.yml",
         "sprint-race-results.yml", "sprint-qualifying-results.yml"]
S = requests.Session()


def get(url):
    r = S.get(url, timeout=30)
    return r.text if r.status_code == 200 else None


def probe(season, rnd, slug):
    d = f"{rnd:02d}-{slug}"
    return (season, rnd, d) if get(f"{BASE}/{season}/races/{d}/race.yml") else None


def main():
    OUT.mkdir(exist_ok=True)
    found = {}
    with cf.ThreadPoolExecutor(32) as ex:
        jobs = [ex.submit(probe, s, r, g) for s in SEASONS for r in range(1, 25) for g in SLUGS]
        for j in cf.as_completed(jobs):
            if (res := j.result()):
                found[(res[0], res[1])] = res[2]
    races = []
    with cf.ThreadPoolExecutor(32) as ex:
        futs = {(s, r, f): ex.submit(get, f"{BASE}/{s}/races/{d}/{f}")
                for (s, r), d in found.items() for f in FILES}
        for (s, r), d in sorted(found.items()):
            entry = {"season": s, "round": r, "slug": d.split("-", 1)[1]}
            for f in FILES:
                txt = futs[(s, r, f)].result()
                entry[f.replace(".yml", "")] = yaml.safe_load(txt) if txt else None
            races.append(entry)
            n = len(entry["race-results"] or [])
            print(f"{s} R{r:02d} {d:28s} results={n}")
    (OUT / "races.json").write_text(json.dumps(races, default=str))
    print(f"saved {len(races)} races")


if __name__ == "__main__":
    main()
