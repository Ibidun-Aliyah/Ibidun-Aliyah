"""Ridge regression: learn how identity, history and party machinery move votes."""

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

from features import FEATURES

ALPHAS = [0.1, 0.3, 1, 3, 10, 30]


def predict_shares(model, df):
    """Predict logits, convert to probabilities and normalise within each
    (year, state) so the main candidates' shares are consistent."""
    p = 1 / (1 + np.exp(-model.predict(df[FEATURES])))
    out = df[["year", "state"]].copy()
    out["p"] = p
    total_actual = df.groupby(["year", "state"])["share"].transform("sum")
    out["pred"] = out["p"] / out.groupby(["year", "state"])["p"].transform("sum") * total_actual
    return out["pred"].values


def leave_one_state_out(df, alpha):
    """Hide each state completely, train on the other 36, predict the hidden one."""
    errs, lerrs, winners_ok, n = [], [], 0, 0
    for st in df["state"].unique():
        tr, te = df[df.state != st], df[df.state == st].copy()
        m = make_pipeline(StandardScaler(), Ridge(alpha=alpha)).fit(tr[FEATURES], tr["target"])
        te["pred"] = predict_shares(m, te)
        errs.extend(np.abs(te["pred"] - te["share"]))
        lp = np.clip(te["pred"], .005, .995)
        lerrs.extend(np.log(lp / (1 - lp)) - te["target"])
        for _, g in te.groupby("year"):
            n += 1
            winners_ok += int(g.loc[g["pred"].idxmax(), "cand"] == g.loc[g["share"].idxmax(), "cand"])
    return float(np.mean(errs)), winners_ok / n, float(np.std(lerrs))


def train(df):
    cv = {a: leave_one_state_out(df, a) for a in ALPHAS}
    best = min(cv, key=lambda a: cv[a][0])
    model = make_pipeline(StandardScaler(), Ridge(alpha=best)).fit(df[FEATURES], df["target"])
    # Coefficients back in raw-feature units, so they can be applied to new rows
    scaler, ridge = model[0], model[1]
    coefs = ridge.coef_ / scaler.scale_
    intercept = ridge.intercept_ - float(np.sum(coefs * scaler.mean_))
    in_sample = predict_shares(model, df)
    return {
        "model": model,
        "alpha": best,
        "cv_mae": cv[best][0],
        "cv_state_winner_acc": cv[best][1],
        "cv_logit_resid_sd": cv[best][2],
        "cv_table": {str(a): {"mae": v[0], "winner_acc": v[1]} for a, v in cv.items()},
        "train_mae": float(np.mean(np.abs(in_sample - df["share"]))),
        "coefs": dict(zip(FEATURES, map(float, coefs))),
        "intercept": float(intercept),
    }
