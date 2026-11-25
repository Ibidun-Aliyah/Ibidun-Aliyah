"""Feature engineering + model for predicting F1 race finishing order.

Every feature for a race is computed only from races that happened *before* it
(plus, in "post-qualifying" mode, that weekend's practice/qualifying/grid data),
so the walk-forward backtest is an honest estimate of real-world accuracy.
"""
from __future__ import annotations

import json
import math
import pathlib
from collections import defaultdict

import lightgbm as lgb
import numpy as np
import pandas as pd

DATA = pathlib.Path(__file__).parent / "data" / "races.json"
DNF_POS = 20.0  # finishing value used for a retirement in form averages


# ----------------------------------------------------------------------------- helpers
def lap_seconds(t):
    if not t or not isinstance(t, str):
        return np.nan
    try:
        parts = t.split(":")
        return float(parts[-1]) + (60 * float(parts[-2]) if len(parts) > 1 else 0)
    except ValueError:
        return np.nan


def best_quali_time(row):
    times = [lap_seconds(row.get(k)) for k in ("q1", "q2", "q3", "time")]
    times = [x for x in times if not math.isnan(x)]
    return min(times) if times else np.nan


def mean(xs, default=np.nan):
    xs = [x for x in xs if x is not None and not (isinstance(x, float) and math.isnan(x))]
    return float(np.mean(xs)) if xs else default


def ewm(xs, alpha=0.35, default=np.nan):
    v = None
    for x in xs:
        if x is None or (isinstance(x, float) and math.isnan(x)):
            continue
        v = x if v is None else alpha * x + (1 - alpha) * v
    return default if v is None else float(v)


def load_races():
    races = json.loads(DATA.read_text())
    return sorted(races, key=lambda r: (r["season"], r["round"]))


# ----------------------------------------------------------------------------- weekend data
def weekend_features(race, driver_ids):
    """Practice / qualifying / grid / sprint features for one weekend."""
    out = {d: {} for d in driver_ids}
    q = race.get("qualifying-results") or []
    if q:
        times = {x["driverId"]: best_quali_time(x) for x in q}
        pole = np.nanmin(list(times.values())) if any(not math.isnan(v) for v in times.values()) else np.nan
        for x in q:
            if x["driverId"] in out:
                o = out[x["driverId"]]
                o["quali_pos"] = x["position"] if isinstance(x["position"], int) else len(q)
                o["quali_gap_pct"] = 100 * (times[x["driverId"]] / pole - 1) if pole == pole else np.nan
    grid = race.get("starting-grid-positions") or []
    for x in grid:
        if x["driverId"] in out:
            out[x["driverId"]]["grid"] = x["position"] if isinstance(x["position"], int) else len(grid)
    fp_gaps = defaultdict(list)
    for s in ("free-practice-1-results", "free-practice-2-results", "free-practice-3-results"):
        rows = race.get(s) or []
        t = {x["driverId"]: lap_seconds(x.get("time")) for x in rows}
        valid = [v for v in t.values() if not math.isnan(v)]
        if not valid:
            continue
        best = min(valid)
        for d, v in t.items():
            if not math.isnan(v):
                fp_gaps[d].append(100 * (v / best - 1))
    for d in out:
        g = fp_gaps.get(d)
        out[d]["fp_best_gap_pct"] = min(g) if g else np.nan
        out[d]["fp_mean_gap_pct"] = float(np.mean(g)) if g else np.nan
    for x in race.get("sprint-race-results") or []:
        if x["driverId"] in out:
            out[x["driverId"]]["sprint_pos"] = x["position"] if isinstance(x["position"], int) else DNF_POS
    return out


# ----------------------------------------------------------------------------- history state
class History:
    """Accumulates per-driver / per-team results race by race."""

    def __init__(self):
        self.d = defaultdict(list)             # driver -> list of race dicts
        self.t = defaultdict(list)             # (team) -> list of race dicts (per car)
        self.points = defaultdict(float)       # (season, driver) -> points
        self.circuit = defaultdict(list)       # (driver, circuit) -> overperformance list
        self.team_circuit = defaultdict(list)  # (team, circuit) -> overperformance list

    def features(self, season, rnd, circuit, driver, team, teammate):
        dh, th = self.d[driver], self.t[team]
        ds = [x for x in dh if x["season"] == season]
        ts = [x for x in th if x["season"] == season]
        dprev = [x for x in dh if x["season"] == season - 1]
        tprev = [x for x in th if x["season"] == season - 1]
        mates = [x for x in ds if x.get("mate_quali") is not None and x.get("quali") is not None]
        standings = sorted(((p, d) for (s, d), p in self.points.items() if s == season), reverse=True)
        rank = next((i + 1 for i, (_, d) in enumerate(standings) if d == driver), len(standings) + 1)
        tpts = defaultdict(float)
        for (s, d), p in self.points.items():
            if s == season and self.d[d]:
                tpts[self.d[d][-1]["team"]] += p
        trank = sorted(tpts.values(), reverse=True)
        team_rank = trank.index(tpts[team]) + 1 if team in tpts else len(trank) + 1
        return {
            "round": rnd,
            "experience": len(dh),
            "d_season_avg_finish": mean([x["finish"] for x in ds]),
            "d_season_ppr": mean([x["points"] for x in ds]),
            "d_ewm_finish": ewm([x["finish"] for x in dh[-15:]]),
            "d_last3_finish": mean([x["finish"] for x in dh[-3:]]),
            "d_season_avg_quali": mean([x["quali"] for x in ds]),
            "d_last3_quali": mean([x["quali"] for x in dh[-3:]]),
            "d_last5_ppr": mean([x["points"] for x in dh[-5:]]),
            "t_last3_quali": mean([x["quali"] for x in th[-6:]]),
            "t_last5_ppr": mean([x["points"] for x in th[-10:]]),
            "d_ewm_quali": ewm([x["quali"] for x in dh[-15:]]),
            "d_season_quali_gap": mean([x["quali_gap"] for x in ds]),
            "d_dnf_rate10": mean([x["dnf"] for x in dh[-10:]]),
            "d_mech_dnf_rate20": mean([x["mech_dnf"] for x in dh[-20:]]),
            "d_prev_season_avg_finish": mean([x["finish"] for x in dprev]),
            "d_vs_teammate_quali": mean([x["quali"] - x["mate_quali"] for x in mates]),
            "d_champ_rank": rank,
            "d_season_points": self.points.get((season, driver), 0.0),
            "t_season_avg_finish": mean([x["finish"] for x in ts]),
            "t_ewm_finish": ewm([x["finish"] for x in th[-20:]], alpha=0.25),
            "t_last3_finish": mean([x["finish"] for x in th[-6:]]),
            "t_season_avg_quali": mean([x["quali"] for x in ts]),
            "t_season_quali_gap": mean([x["quali_gap"] for x in ts]),
            "t_last3_quali_gap": mean([x["quali_gap"] for x in th[-6:]]),
            "t_prev_season_avg_finish": mean([x["finish"] for x in tprev]),
            "t_champ_rank": team_rank,
            "d_circuit_overperf": mean(self.circuit[(driver, circuit)]),
            "d_circuit_n": len(self.circuit[(driver, circuit)]),
            "t_circuit_overperf": mean(self.team_circuit[(team, circuit)][-4:]),
        }

    def update(self, race, rows):
        season, circuit = race["season"], race["race"]["circuitId"]
        q = {x["driverId"]: x for x in (race.get("qualifying-results") or [])}
        qt = {d: best_quali_time(x) for d, x in q.items()}
        pole = np.nanmin(list(qt.values())) if qt and any(v == v for v in qt.values()) else np.nan
        qpos = {d: (x["position"] if isinstance(x["position"], int) else len(q)) for d, x in q.items()}
        team_of = {r["driver"]: r["team"] for r in rows}
        mates = defaultdict(list)
        for r in rows:
            mates[r["team"]].append(r["driver"])
        for x in race.get("sprint-race-results") or []:
            self.points[(season, x["driverId"])] += x.get("points") or 0
        for r in rows:
            d, t = r["driver"], r["team"]
            season_avg = mean([x["finish"] for x in self.d[d] if x["season"] == season], default=None)
            mate = next((m for m in mates[t] if m != d), None)
            rec = {
                "season": season, "team": t, "finish": r["finish_form"], "points": r["points"],
                "dnf": float(r["dnf"]), "mech_dnf": float(r["mech_dnf"]),
                "quali": qpos.get(d), "mate_quali": qpos.get(mate) if mate else None,
                "quali_gap": 100 * (qt[d] / pole - 1) if d in qt and qt[d] == qt[d] and pole == pole else np.nan,
            }
            self.d[d].append(rec)
            self.t[t].append(rec)
            self.points[(season, d)] += r["points"]
            if season_avg is not None and not r["dnf"]:
                self.circuit[(d, circuit)].append(r["finish_form"] - season_avg)
            tavg = mean([x["finish"] for x in self.t[t] if x["season"] == season][:-1], default=None)
            if tavg is not None and not r["dnf"]:
                self.team_circuit[(t, circuit)].append(r["finish_form"] - tavg)
        del team_of


ACCIDENT_WORDS = ("collision", "accident", "spun", "crash", "damage", "contact")


def race_rows(race):
    rows = []
    for i, x in enumerate(race.get("race-results") or []):
        reason = (x.get("reasonRetired") or "").lower()
        dnf = not isinstance(x["position"], int)
        rows.append({
            "driver": x["driverId"], "team": x["constructorId"], "finish": i + 1,
            "finish_form": float(x["position"]) if not dnf else DNF_POS,
            "points": float(x.get("points") or 0), "dnf": dnf,
            "mech_dnf": dnf and reason != "" and not any(w in reason for w in ACCIDENT_WORDS)
                        and x["position"] not in ("DSQ", "DNS"),
        })
    return rows


def entry_list(race, races, hist):
    """Drivers expected to start a race: from its own data if published, else the latest race."""
    for key in ("starting-grid-positions", "qualifying-results", "free-practice-1-results"):
        rows = race.get(key) or []
        if rows:
            return [(x["driverId"], x["constructorId"]) for x in rows]
    done = [r for r in races if r.get("race-results")]
    return [(x["driverId"], x["constructorId"]) for x in done[-1]["race-results"]]


# ----------------------------------------------------------------------------- dataset
def build_dataset(races=None):
    races = races or load_races()
    hist, frames = History(), []
    for race in races:
        circuit = race["race"]["circuitId"]
        rows = race_rows(race)
        entries = [(r["driver"], r["team"]) for r in rows] or entry_list(race, races, hist)
        teams = defaultdict(list)
        for d, t in entries:
            teams[t].append(d)
        wk = weekend_features(race, [d for d, _ in entries])
        finish = {r["driver"]: r["finish"] for r in rows}
        for d, t in entries:
            mate = next((m for m in teams[t] if m != d), None)
            f = hist.features(race["season"], race["round"], circuit, d, t, mate)
            f.update(wk[d])
            f.update({
                "season": race["season"], "race_round": race["round"], "slug": race["slug"],
                "circuit": circuit, "driver": d, "team": t,
                "street": int(race["race"].get("circuitType") == "STREET"),
                "finish": finish.get(d, np.nan),
            })
            frames.append(f)
        if rows:
            hist.update(race, rows)
    df = pd.DataFrame(frames)
    df["race_id"] = df["season"] * 100 + df["race_round"]
    # within-race relative versions of key form features (rank among the field)
    for c in ["d_ewm_finish", "t_ewm_finish", "t_season_avg_finish", "d_season_avg_quali",
              "t_season_quali_gap", "d_season_ppr", "t_last3_quali_gap", "d_last5_ppr", "t_last3_quali"]:
        asc = c not in ("d_season_ppr", "d_last5_ppr")
        df[c + "_rk"] = df.groupby("race_id")[c].rank(ascending=asc, na_option="keep")
    if "quali_pos" in df:
        df["grid_minus_team_avg"] = df["grid"] - df["t_season_avg_quali"]
    return df


PRE_FEATURES = [
    "round", "experience", "street",
    "d_season_avg_finish", "d_season_ppr", "d_ewm_finish", "d_last3_finish",
    "d_season_avg_quali", "d_ewm_quali", "d_season_quali_gap", "d_dnf_rate10", "d_mech_dnf_rate20",
    "d_prev_season_avg_finish", "d_vs_teammate_quali", "d_champ_rank", "d_season_points",
    "t_season_avg_finish", "t_ewm_finish", "t_last3_finish", "t_season_avg_quali",
    "t_season_quali_gap", "t_last3_quali_gap", "t_prev_season_avg_finish", "t_champ_rank",
    "d_circuit_overperf", "d_circuit_n", "t_circuit_overperf",
    "d_ewm_finish_rk", "t_ewm_finish_rk", "t_season_avg_finish_rk", "d_season_avg_quali_rk",
    "t_season_quali_gap_rk", "d_season_ppr_rk", "t_last3_quali_gap_rk",
    "d_last3_quali", "d_last5_ppr", "t_last3_quali", "t_last5_ppr", "d_last5_ppr_rk", "t_last3_quali_rk",
]
WEEKEND_FEATURES = ["grid", "quali_pos", "quali_gap_pct", "fp_best_gap_pct", "fp_mean_gap_pct",
                    "sprint_pos", "grid_minus_team_avg"]
POST_FEATURES = PRE_FEATURES + WEEKEND_FEATURES


# ----------------------------------------------------------------------------- model
PARAMS = dict(
    objective="lambdarank", metric="ndcg", ndcg_eval_at=[3, 10],
    learning_rate=0.03, num_leaves=15, min_data_in_leaf=30, feature_fraction=0.7,
    bagging_fraction=0.8, bagging_freq=1, lambda_l2=5.0, verbose=-1,
    label_gain=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 19, 22, 26, 31, 38, 47, 60] + [60] * 10,
    seed=7,
)
N_ROUNDS = 300
SEASON_DECAY = 0.7  # weight multiplier per season into the past


def relevance(finish):
    return np.clip(21 - finish, 0, 30).astype(int)  # P1 -> 20 ... P21+ -> 0


def train(df, features, n_seeds=5):
    df = df.dropna(subset=["finish"]).sort_values(["race_id", "driver"])
    groups = df.groupby("race_id", sort=True).size().values
    w_race = SEASON_DECAY ** (df.groupby("race_id")["season"].first().max() - df.groupby("race_id")["season"].first())
    ds = lgb.Dataset(df[features], relevance(df["finish"].values), group=groups,
                     free_raw_data=False)
    ds.set_weight(df["race_id"].map(w_race).values)
    return [lgb.train({**PARAMS, "seed": s}, ds, N_ROUNDS) for s in range(n_seeds)]


def score(models, df, features):
    return np.mean([m.predict(df[features]) for m in models], axis=0)


def simulate(scores, temperature, n=20000, rng=None, p_dnf=None):
    """Plackett-Luce Monte Carlo: returns array [driver, position] probabilities.

    p_dnf: optional per-driver retirement probability; a retired car drops to the back.
    """
    rng = rng or np.random.default_rng(0)
    s = np.asarray(scores) / temperature
    g = rng.gumbel(size=(n, len(s))) + s  # Gumbel-max trick == Plackett-Luce sampling
    if p_dnf is not None:
        g -= 1e3 * (rng.random((n, len(s))) < np.asarray(p_dnf))
    order = np.argsort(-g, axis=1)
    pos = np.empty_like(order)
    pos[np.arange(n)[:, None], order] = np.arange(len(s))
    probs = np.zeros((len(s), len(s)))
    for k in range(len(s)):
        probs[:, k] = (pos == k).mean(axis=0)
    return probs
