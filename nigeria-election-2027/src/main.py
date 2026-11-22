"""Run the whole pipeline: features -> train -> simulate -> outputs + dashboard.

    python src/main.py
"""

import json
from pathlib import Path

import numpy as np

import config as C
import features
import model
import simulate

ROOT = Path(__file__).resolve().parent.parent


def main():
    train_df = features.training_rows()
    fit = model.train(train_df)
    print(f"Ridge alpha={fit['alpha']}  leave-one-state-out MAE={fit['cv_mae']:.3f}  "
          f"state-winner accuracy={fit['cv_state_winner_acc']:.0%}  train MAE={fit['train_mae']:.3f}  "
          f"CV logit resid sd={fit['cv_logit_resid_sd']:.2f}")
    for f, v in sorted(fit["coefs"].items(), key=lambda x: -abs(x[1])):
        print(f"  {f:16s} {v:+.3f}")

    fc, states, sh23, cands = features.forecast_rows()
    inp = simulate.build_inputs(fc, states, sh23, fit["coefs"], fit["intercept"])
    sim = simulate.run(inp)
    summary = simulate.summarise(sim, inp)

    print(f"\nRunoff probability: {summary['runoff_prob']:.0%}")
    for c, d in summary["candidates"].items():
        line = f"  {c:9s} share {d['mean_share']:.1%} (80% range {d['p10']:.1%}-{d['p90']:.1%})"
        if "win_prob" in d:
            line += f"  WIN {d['win_prob']:.1%}  25%-states {d['states_25pct_mean']:.1f}"
        print(line)
    print("  scenarios:", json.dumps(summary["scenarios"]))

    # Inputs for the dashboard's in-browser what-if simulator
    whatif = {
        "states": inp["states"], "zones": inp["zones"], "zone_idx": inp["zone_idx"].tolist(),
        "muslim": inp["muslim"].round(3).tolist(), "turnout": inp["turnout"].round(0).tolist(),
        "lin": inp["lin"].round(4).tolist(), "gov_defector": inp["gov_defector"].round(4).tolist(),
        "minor": inp["minor"].round(4).tolist(), "is_fct": inp["is_fct"].tolist(),
        "config": {k: getattr(C, k) for k in (
            "ATIKU_OFF_BALLOT_PROB", "INCUMBENT_HARDSHIP_SHIFT", "INCUMBENT_HARDSHIP_SD",
            "DEFECTOR_GOVERNOR_WEIGHT", "ENSEMBLE_ML_WEIGHT", "NATIONAL_SD", "ZONE_SD", "STATE_SD", "TURNOUT_SD",
            "STATES_NEEDED_25PCT")},
        "runoff_transfer": C.RUNOFF_TRANSFER,
    }
    hist_2023 = (
        __import__("pandas").read_csv(ROOT / "data" / "results_2023.csv").set_index("state")
    )
    out = {
        "generated": C.DATA_AS_OF, "election_date": C.ELECTION_DATE,
        "n_simulations": C.N_SIMULATIONS,
        "candidates_meta": {c["id"]: {k: c[k] for k in ("name", "party", "mate", "color")}
                            for c in cands["2027"]},
        "model": {k: fit[k] for k in ("alpha", "cv_mae", "cv_state_winner_acc", "train_mae", "cv_logit_resid_sd",
                                      "coefs", "intercept", "cv_table")},
        "forecast": summary,
        "history_2023": {s: hist_2023.loc[s].to_dict() for s in hist_2023.index},
        "whatif": whatif,
        "map": json.loads((ROOT / "data" / "nigeria_map.json").read_text()),
    }
    (ROOT / "outputs").mkdir(exist_ok=True)
    (ROOT / "outputs" / "forecast.json").write_text(json.dumps(out, indent=1, default=float))

    tpl = ROOT / "dashboard" / "template.html"
    if tpl.exists():
        html = tpl.read_text().replace("/*__DATA__*/null", json.dumps(out, default=float))
        (ROOT / "dashboard" / "index.html").write_text(html)
        print("\nDashboard written to dashboard/index.html")


if __name__ == "__main__":
    main()
