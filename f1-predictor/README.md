# F1 Race Predictor (2026 season finale)

Predicts the finishing order, plus win, podium and points probabilities, for upcoming
Formula 1 races, built for the last two 2026 rounds: **Qatar (Nov 29)** and **Abu Dhabi (Dec 6)**.

## Data
Real results for all 115 races from 2022 to 2026 (2026 is complete through Las Vegas, round 21)
come from the open [F1DB](https://github.com/f1db/f1db) dataset. That covers race results,
qualifying, starting grid, practice times and sprints. `fetch_data.py` downloads it, and F1DB
is updated after every Grand Prix.

## Model
* One row per driver per race. Every feature uses **only information from before that race**:
  * driver form: season average finish, points per race, weighted recent finish, last-3 finishes,
    qualifying form, gap to pole, record against teammate, DNF rate, championship position
  * team form: season and recent finish, recent qualifying gap, constructors' position
  * track history: how much the driver and the team have over- or under-performed at this circuit
    compared with their own season average
  * weekend data (post-qualifying mode): grid, qualifying position and gap, practice pace, sprint result
* **LightGBM LambdaRank** (learning-to-rank) with a gain curve that weights the front of the field
  most heavily, an average of 10 seeds, and recent seasons weighted more.
* The ranking scores become probabilities through a **Plackett-Luce Monte Carlo** (50k simulated
  races, temperature fitted on the backtest) with a per-driver retirement risk.

## How accurate is it? (walk-forward backtest: each race predicted using only earlier races)
45 races (all of 2025 and 2026 through Las Vegas):

| Model | Winner correct | Podium overlap | Top-10 overlap | Spearman | Position MAE |
|---|---|---|---|---|---|
| **Pre-weekend model** | 31% | 55% | 74% | 0.59 | 3.95 |
| Baseline: championship order | 31% | 60% | 74% | 0.59 | 4.06 |
| **Post-qualifying model** | 62% | 66% | **78%** | **0.67** | **3.38** |
| Baseline: grid order | 69% | 68% | 76% | 0.64 | 3.49 |

Takeaways: before qualifying, nothing beats "who's quick right now" by much, and the model is
about level with the standings. After qualifying, the model orders the whole field better than
the grid (best Spearman, MAE and top-10). Pole position is still the single best predictor of the
winner, so **re-run after qualifying**.

## Usage
```bash
pip install -r requirements.txt
python fetch_data.py 2026          # refresh data (after qualifying / after a race)
python backtest.py                 # re-run backtest + calibrate probabilities
python predict.py qatar            # switches to the post-qualifying model once quali data exists
python predict.py abu-dhabi --refresh
```
Outputs go to `results/`.
