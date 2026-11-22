# Nigeria 2027 Presidential Election Forecast

A machine-learning project that predicts the winner of Nigeria's presidential
election on **16 January 2027**, with an interactive dashboard.

**Current forecast (data as of 22 Nov 2026):** Bola Tinubu (APC) ~75% chance to win ·
Atiku Abubakar (ADC) ~13% · Peter Obi (NDC) ~13% · ~18% chance of a runoff.

Open `dashboard/index.html` in any browser to explore it.

## How it works

```
data/  ──► features.py ──► model.py (ridge regression) ──► simulate.py (Monte Carlo) ──► dashboard/index.html
```

1. **Data** (`data/`): state results for 2015, 2019 and 2023, each state's zone, religious
   mix, registered voters and governor's party in every cycle, and the 2027 tickets.
2. **Features** (`src/features.py`): one row per election × state × candidate with ten
   features: previous vote base, home state/zone, running mate's state/zone, faith match,
   North/South match, governor's party, incumbency.
3. **Model** (`src/model.py`): a scikit-learn ridge regression predicts each candidate's
   vote share (log-odds). The strength of regularisation is picked by
   **leave-one-state-out cross-validation**: hide a state, train on the rest, predict it.
4. **Ensemble**: the model is averaged 50/50 with a persistence baseline (each 2027 ticket
   keeps its 2023 vote base; Obi + Kwankwaso merge the Labour and NNPP votes).
5. **Simulation** (`src/simulate.py`): 20,000 runs add national, zonal and state swings,
   an economic penalty on the incumbent, turnout noise and a chance that Atiku is removed
   from the ballot (his nomination was voided by a court on 5 Nov 2026; appeal pending).
   Each run applies the constitutional rule (most votes + 25% in 24 of 36 states) and a
   runoff when nobody meets it.
6. **Dashboard** (`dashboard/`): summary, an interactive map of Nigeria (hover for numbers,
   click a state for its 2027-vs-2023 breakdown, filter by geopolitical zone, colour by
   projected winner or by each candidate's chance of 25%), the 25% rule, vote-share
   distributions, the model's learned weights, and a what-if lab that re-runs the
   simulation in the browser.

## Run it

```bash
pip install -r requirements.txt
python src/main.py          # trains, simulates, writes outputs/forecast.json and dashboard/index.html
```

Change the assumptions in `src/config.py` (Atiku ballot risk, economic penalty, governor
defection weight, uncertainty) and run again.

State borders come from Natural Earth (public domain), simplified into SVG paths by
`tools/build_map.py` and saved in `data/nigeria_map.json`. You only need to re-run that
script to rebuild the map with a different level of detail.

## Model quality and limits

- Leave-one-state-out error: ~13 points per candidate per state; picks the right state
  winner ~65% of the time. Two past elections is very little training data, so the
  simulation uses wide uncertainty on purpose.
- Historical figures are compiled from public INEC results; 2015/2019 are rounded two-party
  shares and 2023 counts match INEC's national totals within 0.1%. Verify against
  INEC (inecnigeria.org) before citing any single state.
- No scientific national polls were available; online polls were left out because their
  samples are self-selected.
- Not modelled: rigging, vote buying, violence, low turnout in insecure areas, late
  alliances or withdrawals.

## Ideas to extend it

- Add local-government-level results and 2011 data for more training rows.
- Add economic indicators by state (inflation, food prices, unemployment).
- Update `data/candidates.json` and `config.py` when the Court of Appeal rules on Atiku.
