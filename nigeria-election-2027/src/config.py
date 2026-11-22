"""Scenario assumptions for the 2027 forecast.

Everything here is a judgement call, not something learned from data.
Change these values to test your own assumptions; the dashboard exposes
the most important ones as sliders.
"""

import os
from datetime import date

ELECTION_DATE = "2027-01-16"
# The run date. Each run is saved to outputs/history.json under this date,
# so the dashboard can show how the forecast moves over time.
DATA_AS_OF = os.environ.get("FORECAST_DATE") or date.today().isoformat()

# --- Monte Carlo -----------------------------------------------------------
N_SIMULATIONS = 20_000
RANDOM_SEED = 2027

# --- Ensemble ----------------------------------------------------------------
# Final logit = w * (ML regression) + (1 - w) * (persistence: 2023 vote base of
# each ticket). The regression captures structural changes (Obi+Kwankwaso merger,
# Amaechi on Atiku's ticket, governor defections); persistence captures real
# 2023 loyalties the few features miss (e.g. Obi's urban vote in Lagos/FCT).
ENSEMBLE_ML_WEIGHT = 0.5

# --- Atiku's candidacy -------------------------------------------------------
# On 5 Nov 2026 the Federal High Court (Abuja) voided the ADC executive's acts,
# including Atiku's nomination. ADC filed a 17-ground appeal and a stay of
# execution; INEC says his name stays on the list pending appeal.
ATIKU_OFF_BALLOT_PROB = 0.25

# --- Economy / incumbency ----------------------------------------------------
# The regression learns an "incumbent party" effect from 2019 and 2023, both
# won by the ruling party. 2024-26 brought subsidy removal, naira devaluation
# and record inflation, so we subtract an extra penalty from Tinubu (logit units).
INCUMBENT_HARDSHIP_SHIFT = -0.15
INCUMBENT_HARDSHIP_SD = 0.15

# --- Governor defections -----------------------------------------------------
# 31 of 36 governors are now APC, many recent PDP defectors. Defecting
# governors rarely carry all their voters, so their learned effect is scaled.
DEFECTOR_GOVERNOR_WEIGHT = 0.5

# --- Uncertainty (logit units) ----------------------------------------------
# Wide on purpose: the model learns from only two past elections, and its
# leave-one-state-out error is large. ~0.25 logit is about 6 points nationally.
NATIONAL_SD = 0.25   # whole-country swing per candidate
ZONE_SD = 0.15       # geopolitical-zone swing per candidate
STATE_SD = 0.25      # state-level noise per candidate
TURNOUT_SD = 0.10    # relative turnout noise per state

# --- Constitutional rule (Section 134) ----------------------------------------
# Winner needs the most votes AND >=25% in at least two-thirds of the 36 states.
# (2023 election tribunal ruling: FCT is treated like any other state, not as a
# separate requirement.)
STATES_NEEDED_25PCT = 24

# --- Minor candidates: fixed vote shares, not modelled by regression ---------
# Seyi Makinde (APM, sitting Oyo governor), Sandy Onor (PDP, Cross River) and
# 13 other candidates. Values are shares of votes cast.
def minor_shares(state: str, zone: str) -> dict:
    makinde = 0.22 if state == "Oyo" else (0.04 if zone == "SW" else 0.005)
    onor = 0.08 if state == "Cross River" else (0.02 if zone in ("SS", "SE") else 0.012)
    others = 0.02
    return {"makinde": makinde, "onor": onor, "others": others}

# --- Where Atiku's voters go if he is removed from the ballot ---------------
# m = Muslim share of the state's population.
def atiku_transfer(m: float) -> dict:
    to_obi = 0.30 + 0.40 * (1 - m)
    to_tinubu = 0.55 - 0.35 * (1 - m)
    return {"obi": to_obi, "tinubu": to_tinubu}  # remainder abstains / minor

# --- Runoff vote transfers (share of an eliminated candidate's votes) --------
RUNOFF_TRANSFER = {
    # from: {to: share}; remainder abstains
    "atiku": {"tinubu": 0.40, "obi": 0.40},
    "obi": {"tinubu": 0.25, "atiku": 0.55},
    "tinubu": {"atiku": 0.45, "obi": 0.30},
    "minor": {"tinubu": 0.30, "atiku": 0.30, "obi": 0.30},
}
