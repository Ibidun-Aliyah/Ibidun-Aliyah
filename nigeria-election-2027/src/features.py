"""Turn raw election data into one row per (election, state, candidate)."""

import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"
NORTH = {"NW", "NE", "NC"}
OTHERS_SHARE_2023 = 0.025  # ~2.5% of 2023 votes went to the 14 minor parties

FEATURES = [
    "prev_logit",      # candidate's (or merged ticket's) previous vote share, logit
    "no_prev",         # 1 if the candidate has no previous base in this vehicle
    "home_state",      # candidate's state of origin
    "home_zone",       # candidate's geopolitical zone
    "mate_home_state", # running mate's state
    "mate_zone",       # running mate's zone
    "religion_match",  # how well the ticket's faith matches the state's population
    "north_match",     # northern candidate in a northern state, or south/south
    "governor",        # state governor belongs to the candidate's party
    "incumbent",       # candidate's party holds the presidency
]


def logit(p):
    p = np.clip(p, 0.005, 0.995)
    return np.log(p / (1 - p))


def load():
    states = pd.read_csv(DATA / "states.csv").set_index("state")
    old = pd.read_csv(DATA / "results_2015_2019.csv").set_index("state")
    r23 = pd.read_csv(DATA / "results_2023.csv").set_index("state")
    total23 = r23.sum(axis=1) / (1 - OTHERS_SHARE_2023)
    shares23 = r23.div(total23, axis=0)
    shares23["total_votes"] = total23
    cands = json.loads((DATA / "candidates.json").read_text())
    return states, old, shares23, cands


def _row(c, state, s, year, prev, gov_party, defector_weight):
    m = s["muslim_share"]
    rel = lambda r: m if r == "M" else 1 - m
    gov = 0.0
    if gov_party == c["party"]:
        gov = defector_weight if (year == 2027 and s["gov_2027_recent_defector"]) else 1.0
    return {
        "year": year, "state": state, "zone": s["zone"], "cand": c["id"],
        "prev_logit": logit(prev) if prev is not None else logit(0.02),
        "no_prev": 0 if prev is not None else 1,
        "home_state": int(state == c["home_state"]),
        "home_zone": int(s["zone"] == c["home_zone"]),
        "mate_home_state": int(state == c["mate_state"]),
        "mate_zone": int(s["zone"] == c["mate_zone"]),
        "religion_match": 0.6 * rel(c["religion"]) + 0.4 * rel(c["mate_religion"]),
        "north_match": int((c["home_zone"] in NORTH) == (s["zone"] in NORTH)),
        "governor": gov,
        "incumbent": c["incumbent"],
    }


def training_rows():
    """2019 and 2023 candidate-state rows with the actual vote share as target."""
    states, old, sh23, cands = load()
    rows = []
    for state, s in states.iterrows():
        apc15, apc19 = old.loc[state, "apc_share_2015"], old.loc[state, "apc_share_2019"]
        # 2019: two-horse race (minor parties ~3%)
        prev19 = {"buhari": apc15, "atiku": 1 - apc15}  # Atiku inherits PDP's 2015 base
        actual19 = {"buhari": apc19 * 0.97, "atiku": (1 - apc19) * 0.97}
        for c in cands["2019"]:
            r = _row(c, state, s, 2019, prev19[c["id"]], s["gov_2019"], 1.0)
            r["share"] = actual19[c["id"]]
            rows.append(r)
        # 2023: four-way race
        prev23 = {"tinubu": apc19, "atiku": 1 - apc19, "obi": None, "kwankwaso": None}
        for c in cands["2023"]:
            r = _row(c, state, s, 2023, prev23[c["id"]], s["gov_2023"], 1.0)
            r["share"] = sh23.loc[state, c["result_col"]]
            rows.append(r)
    df = pd.DataFrame(rows)
    df["target"] = logit(df["share"].values)
    return df


def forecast_rows(defector_weight=1.0):
    """2027 candidate-state rows (no target). Defector weight 1.0 by default so
    the simulation can rescale the governor term itself."""
    states, old, sh23, cands = load()
    rows = []
    for state, s in states.iterrows():
        base = sh23.loc[state]
        for c in cands["2027"]:
            prev = float(sum(base[p] for p in c["base_2023"]))
            r = _row(c, state, s, 2027, prev, s["gov_2027"], defector_weight)
            r["defector"] = int(s["gov_2027_recent_defector"])
            r["governor_raw"] = int(s["gov_2027"] == c["party"])
            rows.append(r)
    return pd.DataFrame(rows), states, sh23, cands
