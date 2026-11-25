"""Predict an upcoming race.

    python predict.py qatar            # uses post-qualifying model automatically once quali is published
    python predict.py abu-dhabi --refresh   # re-download latest data from F1DB first
    python predict.py qatar --mode pre      # force the pre-weekend model

Writes results/prediction_<season>_<slug>.csv
"""
import argparse
import json
import pathlib
import subprocess
import sys

import numpy as np
import pandas as pd

import f1model as m

HERE = pathlib.Path(__file__).parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("race", help="grand prix slug, e.g. qatar, abu-dhabi")
    ap.add_argument("--season", type=int, default=2026)
    ap.add_argument("--mode", choices=["auto", "pre", "post"], default="auto")
    ap.add_argument("--refresh", action="store_true", help="re-download data before predicting")
    ap.add_argument("--sims", type=int, default=50000)
    a = ap.parse_args()

    if a.refresh:
        subprocess.run([sys.executable, str(HERE / "fetch_data.py"), str(a.season)], check=True)

    df = m.build_dataset()
    target = df[(df.season == a.season) & (df.slug == a.race)]
    if target.empty:
        sys.exit(f"race {a.race!r} not found for {a.season}")
    rid = target.race_id.iloc[0]
    if target.finish.notna().any():
        print("note: this race already has results; predicting it as if it hadn't happened")
    has_quali = target["quali_pos"].notna().any() if "quali_pos" in target else False
    mode = a.mode if a.mode != "auto" else ("post" if has_quali else "pre")
    feats = m.POST_FEATURES if mode == "post" else m.PRE_FEATURES

    train = df[(df.race_id < rid) & df.finish.notna()]
    models = m.train(train, feats, n_seeds=10)
    target = target.reset_index(drop=True)
    scores = m.score(models, target, feats)

    temps = json.loads((HERE / "results" / "backtest_metrics.json").read_text())["temperature"]
    # retirement risk: driver's last-10-race DNF rate shrunk halfway to the league average
    league = float(train.loc[train.season >= a.season - 1, "d_dnf_rate10"].mean())
    p_dnf = (0.5 * target["d_dnf_rate10"].fillna(league) + 0.5 * league).clip(0.02, 0.3).values
    probs = m.simulate(scores, temps[mode], n=a.sims, p_dnf=p_dnf)
    out = pd.DataFrame({
        "driver": target.driver, "team": target.team,
        "p_win": probs[:, 0], "p_podium": probs[:, :3].sum(1), "p_points": probs[:, :10].sum(1),
        "exp_position": (probs * np.arange(1, probs.shape[1] + 1)).sum(1),
    })
    if mode == "post":
        out["grid"] = target["grid"].fillna(target["quali_pos"])
    out = out.sort_values(["p_win", "p_podium"], ascending=False).reset_index(drop=True)
    out.index += 1
    out.index.name = "pred_pos"
    path = HERE / "results" / f"prediction_{a.season}_{a.race}.csv"
    out.round(4).to_csv(path)

    print(f"\n{a.season} {a.race} — {mode}-{'qualifying' if mode == 'post' else 'weekend'} model, "
          f"trained on {train.race_id.nunique()} races\n")
    show = out.copy()
    for c in ("p_win", "p_podium", "p_points"):
        show[c] = (show[c] * 100).map(lambda v: f"{v:5.1f}%")
    show["exp_position"] = show["exp_position"].map(lambda v: f"{v:4.1f}")
    print(show.to_string())
    print(f"\nsaved {path.relative_to(HERE)}")


if __name__ == "__main__":
    main()
