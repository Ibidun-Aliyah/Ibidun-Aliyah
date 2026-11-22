# Daily update playbook

The forecast is refreshed once a day until results are declared. Every update follows
these rules so changes stay consistent and traceable.

## 1. Gather the news (last 48 hours)

Search for Nigerian election news since the last entry in `data/news_log.json`. Prefer
established outlets: Premium Times, Channels TV, The Cable, Punch, Vanguard, ThisDay,
Guardian Nigeria, Daily Trust, BBC, Reuters, AP, and INEC's own releases. A claim needs
one of these, or two independent outlets, before it changes the model. Opinion pieces,
partisan press releases and social-media claims are never enough on their own.

## 2. Decide whether it is significant

| News | Significant? | What to change |
|---|---|---|
| Court of Appeal / Supreme Court ruling on Atiku's candidacy | Yes, high | `ATIKU_OFF_BALLOT_PROB` in `src/config.py`: 0.02 if he is confirmed, 0.95 if he is removed and INEC acts on it, about 0.6 if removed but a further appeal is pending |
| A main candidate withdraws, dies, is disqualified or a ticket changes | Yes, high | `data/candidates.json` and, if needed, the transfer rules in `config.py` |
| A party merger, or a major candidate stepping down for another | Yes, high | Add the merged ticket's 2023 base to `base_2023`; move the minor candidate's share in `minor_shares` |
| A sitting governor changes party or openly backs another candidate | Yes, medium | `gov_2027` and `gov_2027_recent_defector` in `data/states.csv` |
| Election date moved, or INEC changes rules | Yes, medium | `ELECTION_DATE` and any rule constants |
| Scientific poll (random sample, published method, n ≥ 1,000, e.g. NOIPolls) | Yes, medium | Record it in the log. Nudge `INCUMBENT_HARDSHIP_SHIFT` by at most ±0.1 per poll, only if it clearly disagrees with the model |
| Major economic shock (fuel price, naira, inflation release) | Usually low | Move `INCUMBENT_HARDSHIP_SHIFT` by at most ±0.05 |
| Large-scale insecurity likely to cut voting in a region | Medium | Note it; widen `ZONE_SD` slightly if it affects a whole zone |
| Endorsements by ex-presidents, religious or traditional leaders | Low | Log only, no model change |
| Online/Twitter polls, rallies, crowd sizes, rumours | No | Log at most as "low" with "Not used" |

Limits: no single day moves any parameter by more than the amounts above, except
for court rulings and candidate changes, which are facts rather than estimates.

## 3. Record and rebuild

1. Add one entry per significant story to `data/news_log.json`:
   `date`, `headline`, `source`, `url`, `impact` (high/medium/low), `model_change`
   (what changed in plain words, or "No model change").
2. Run `python src/main.py`. This appends today's forecast to `outputs/history.json`
   and rebuilds `dashboard/index.html` (the tracker chart and news feed update).
3. Commit with a message like `Daily update 2026-11-23: <one-line summary>` and push.
4. Republish the dashboard.

Run the daily rebuild even on quiet days, so the tracker has a point for every day.
