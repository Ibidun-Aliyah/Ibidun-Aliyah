"""Walk-forward backtest: for each race, train only on earlier races, then predict it.

Usage: python backtest.py [first_season]   (default 2025 -> tests all of 2025 + 2026)
Writes results/backtest_metrics.json (incl. calibrated Plackett-Luce temperatures).
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from scipy.optimize import minimize_scalar

import f1model as m

OUT = pathlib.Path(__file__).parent / "results"
OUT.mkdir(exist_ok=True)


def pl_loglik(scores, finish, T, top=3):
    """Log-likelihood of the actual top-`top` order under Plackett-Luce(scores / T)."""
    s = scores / T
    order = np.argsort(finish)
    remaining = list(order)
    ll = 0.0
    for k in range(top):
        i = order[k]
        logs = s[remaining]
        ll += s[i] - (logs.max() + np.log(np.exp(logs - logs.max()).sum()))
        remaining.remove(i)
    return ll


def metrics(pred_rank, finish):
    top3_pred = set(np.argsort(pred_rank)[:3])
    top3_true = set(np.argsort(finish)[:3])
    top10_pred = set(np.argsort(pred_rank)[:10])
    top10_true = set(np.argsort(finish)[:10])
    return {
        "winner_hit": float(np.argmin(pred_rank) == np.argmin(finish)),
        "podium_overlap": len(top3_pred & top3_true) / 3,
        "top10_overlap": len(top10_pred & top10_true) / 10,
        "spearman": spearmanr(pred_rank, finish).statistic,
        "mae": float(np.mean(np.abs(pd.Series(pred_rank).rank().values - finish))),
    }


def main(first_season=2025):
    df = m.build_dataset()
    done = df.dropna(subset=["finish"])
    test_ids = sorted(done.loc[done.season >= first_season, "race_id"].unique())
    rows, store = [], {"pre": [], "post": []}
    for rid in test_ids:
        train_df = done[done.race_id < rid]
        test = done[done.race_id == rid].reset_index(drop=True)
        finish = test["finish"].values
        rec = {"race_id": int(rid), "slug": test.slug.iloc[0]}
        for mode, feats in (("pre", m.PRE_FEATURES), ("post", m.POST_FEATURES)):
            models = m.train(train_df, feats, n_seeds=3)
            s = m.score(models, test, feats)
            store[mode].append((s, finish))
            for k, v in metrics(-s, finish).items():
                rec[f"{mode}_{k}"] = v
            rec[f"{mode}_pred_winner"] = test.driver.iloc[int(np.argmax(s))]
        # baselines
        for k, v in metrics(test["grid"].fillna(25).values, finish).items():
            rec[f"grid_{k}"] = v
        champ = test["d_champ_rank"].values.astype(float)
        for k, v in metrics(champ, finish).items():
            rec[f"champ_{k}"] = v
        rec["winner"] = test.driver.iloc[int(np.argmin(finish))]
        rows.append(rec)
        print(f"{rid} {rec['slug']:<22} winner={rec['winner']:<18} pre={rec['pre_pred_winner']:<18} "
              f"post={rec['post_pred_winner']:<18}", flush=True)

    res = pd.DataFrame(rows)
    res.to_csv(OUT / "backtest_races.csv", index=False)
    summary = {}
    for season_filter, label in ((None, "all"), (2025, "2025"), (2026, "2026")):
        sub = res if season_filter is None else res[res.race_id // 100 == season_filter]
        if sub.empty:
            continue
        summary[label] = {
            f"{mode}": {k: round(float(sub[f"{mode}_{k}"].mean()), 3)
                        for k in ("winner_hit", "podium_overlap", "top10_overlap", "spearman", "mae")}
            for mode in ("pre", "post", "grid", "champ")
        }
        summary[label]["n_races"] = len(sub)
    # calibrate PL temperature per mode (fit on predictions made before seeing each race)
    temps = {}
    for mode, pairs in store.items():
        f = lambda T: -sum(pl_loglik(s, fin, T) for s, fin in pairs)
        temps[mode] = float(minimize_scalar(f, bounds=(0.05, 20), method="bounded").x)
    summary["temperature"] = temps
    (OUT / "backtest_metrics.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 2025)
