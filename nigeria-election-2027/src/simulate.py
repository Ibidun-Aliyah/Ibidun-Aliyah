"""Monte Carlo simulation of the 16 January 2027 presidential election."""

import numpy as np

import config as C
from features import FEATURES

MAIN = ["tinubu", "atiku", "obi"]
MINOR = ["makinde", "onor", "others"]
ALL = MAIN + MINOR


def build_inputs(fc, states, sh23, coefs, intercept):
    """Split each candidate-state logit into a fixed part and the governor part,
    so the governor-defection weight can be changed without retraining."""
    order = list(states.index)
    S, K = len(order), len(MAIN)
    lin = np.zeros((S, K))
    gov = np.zeros((S, K))
    for _, r in fc.iterrows():
        i, k = order.index(r["state"]), MAIN.index(r["cand"])
        lin[i, k] = intercept + sum(coefs[f] * r[f] for f in FEATURES if f != "governor")
        gov[i, k] = coefs["governor"] * r["governor_raw"] * (1 if r["defector"] else 0)
        # store non-defector governor effect directly in lin
        if r["governor_raw"] and not r["defector"]:
            lin[i, k] += coefs["governor"]
    # Ensemble with the persistence baseline (2023 vote base of each ticket)
    w = C.ENSEMBLE_ML_WEIGHT
    persist = fc.pivot(index="state", columns="cand", values="prev_logit").loc[states.index, MAIN].values
    lin = w * lin + (1 - w) * persist
    gov = w * gov
    minors = np.array([[C.minor_shares(s, states.loc[s, "zone"])[m] for m in MINOR] for s in order])
    zones = sorted(states["zone"].unique())
    return {
        "states": order,
        "zone_idx": np.array([zones.index(states.loc[s, "zone"]) for s in order]),
        "zones": zones,
        "muslim": states["muslim_share"].values.astype(float),
        "turnout": sh23.loc[order, "total_votes"].values.astype(float),
        "lin": lin, "gov_defector": gov, "minor": minors,
        "is_fct": np.array([s == "FCT" for s in order]),
    }


def run(inp, n=C.N_SIMULATIONS, seed=C.RANDOM_SEED, atiku_off_prob=C.ATIKU_OFF_BALLOT_PROB,
        hardship=C.INCUMBENT_HARDSHIP_SHIFT, defector_w=C.DEFECTOR_GOVERNOR_WEIGHT,
        noise_mult=1.0):
    rng = np.random.default_rng(seed)
    S, K, Z = inp["lin"].shape[0], len(MAIN), len(inp["zones"])

    logits = inp["lin"] + defector_w * inp["gov_defector"]
    logits = np.broadcast_to(logits, (n, S, K)).copy()
    logits += noise_mult * rng.normal(0, C.NATIONAL_SD, (n, 1, K))
    logits += noise_mult * rng.normal(0, C.ZONE_SD, (n, Z, K))[:, inp["zone_idx"], :]
    logits += noise_mult * rng.normal(0, C.STATE_SD, (n, S, K))
    logits[:, :, 0] += rng.normal(hardship, C.INCUMBENT_HARDSHIP_SD, (n, 1))

    p = 1 / (1 + np.exp(-logits))
    minor = inp["minor"] * np.exp(noise_mult * rng.normal(0, 0.25, (n, S, len(MINOR))))
    main_total = 1 - minor.sum(-1, keepdims=True)
    shares = np.concatenate([p / p.sum(-1, keepdims=True) * main_total, minor], axis=-1)

    # Atiku removed from the ballot in some simulations
    off = rng.random(n) < atiku_off_prob
    if off.any():
        tr = C.atiku_transfer(inp["muslim"])
        a = shares[off, :, 1]
        shares[off, :, 0] += a * tr["tinubu"]
        shares[off, :, 2] += a * tr["obi"]
        shares[off, :, 5] += a * (1 - tr["tinubu"] - tr["obi"])
        shares[off, :, 1] = 0

    turnout = inp["turnout"] * np.exp(noise_mult * rng.normal(0, C.TURNOUT_SD, (n, S)))
    votes = shares * turnout[..., None]
    national = votes.sum(1) / votes.sum((1, 2))[:, None]

    # Section 134: most votes + 25% in 24 of 36 states
    states25 = (shares[:, ~inp["is_fct"], :K] >= 0.25).sum(1)
    leader = national[:, :K].argmax(1)
    outright = states25[np.arange(n), leader] >= C.STATES_NEEDED_25PCT

    # Runoff: leader vs the other candidate who won the most states
    state_wins = np.stack([(shares[:, :, :K].argmax(-1) == k).sum(1) for k in range(K)], 1)
    sw = state_wins.astype(float) + national[:, :K] * 1e-3  # tie-break by votes
    sw[np.arange(n), leader] = -1
    sw[off, 1] = -1
    challenger = sw.argmax(1)

    winner = leader.copy()
    runoff_idx = np.where(~outright)[0]
    for i in runoff_idx:
        a, b = leader[i], challenger[i]
        va, vb = national[i, a], national[i, b]
        for k in range(K):
            if k in (a, b):
                continue
            t = C.RUNOFF_TRANSFER[MAIN[k]]
            va += national[i, k] * t.get(MAIN[a], 0)
            vb += national[i, k] * t.get(MAIN[b], 0)
        m = national[i, K:].sum()
        va += m * C.RUNOFF_TRANSFER["minor"][MAIN[a]]
        vb += m * C.RUNOFF_TRANSFER["minor"][MAIN[b]]
        winner[i] = a if va >= vb else b

    return {
        "national": national, "shares": shares, "states25": states25, "leader": leader,
        "outright": outright, "winner": winner, "challenger": challenger,
        "atiku_off": off, "state_wins": state_wins,
    }


def summarise(sim, inp):
    nat, sh, w = sim["national"], sim["shares"], sim["winner"]
    K = len(MAIN)
    pct = lambda x, q: float(np.percentile(x, q))
    cands = {}
    for k, c in enumerate(ALL):
        d = {
            "mean_share": float(nat[:, k].mean()),
            "p10": pct(nat[:, k], 10), "p90": pct(nat[:, k], 90),
        }
        if k < K:
            d.update({
                "win_prob": float((w == k).mean()),
                "win_prob_first_round": float(((w == k) & sim["outright"]).mean()),
                "states_25pct_mean": float(sim["states25"][:, k].mean()),
                "states_won_mean": float(sim["state_wins"][:, k].mean()),
                "share_hist": np.histogram(nat[:, k], bins=40, range=(0, 0.6))[0].tolist(),
            })
        cands[c] = d
    on = ~sim["atiku_off"]
    scen = {}
    for label, mask in (("atiku_on_ballot", on), ("atiku_off_ballot", ~on)):
        if mask.sum():
            scen[label] = {"n": int(mask.sum()),
                           **{c: float((w[mask] == k).mean()) for k, c in enumerate(MAIN)}}
    states = []
    for i, s in enumerate(inp["states"]):
        winners = sh[:, i, :].argmax(-1)
        states.append({
            "state": s,
            "zone": inp["zones"][inp["zone_idx"][i]],
            "share": {c: float(sh[:, i, k].mean()) for k, c in enumerate(ALL)},
            "win_prob": {c: float((winners == k).mean()) for k, c in enumerate(ALL)},
            "p25": {c: float((sh[:, i, k] >= 0.25).mean()) for k, c in enumerate(MAIN)},
        })
    return {
        "candidates": cands,
        "runoff_prob": float((~sim["outright"]).mean()),
        "atiku_off_rate": float(sim["atiku_off"].mean()),
        "scenarios": scen,
        "states": states,
    }
