# Launch Signal

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kriptmwan/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![reward](https://make.fun/badge/token-radar-01/kriptmwan/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

An original offline protocol research desk built on the make.fun starter's Node protocol and vendored dossier library. The dashboard is rewritten: capital/momentum map, sortable and paginated research table, category/network search, separate token-recorded view, evidence inspector and conditional farming workflows.

## Run

Requires Node 22.18 or later; no packages or network needed at runtime.

```sh
node main.ts --input /path/to/kit/input/snapshot.json --output out
node --test tests/model.test.ts
```

Open `out/dashboard/index.html` directly in a browser. The grader can run `node main.ts` with `/input` and `/output`, or `MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR`.

## Model

Base implied value = TVL × 0.25 × (1 + clamp(7d growth, −60, 120)/100 × 0.72) × (0.58 + min(tracked days,1460)/1460 × 0.42), rounded to positive whole dollars. Unknown growth uses 0%; unknown age uses 365 days. These assumptions are a research proxy, not a fitted valuation or launch forecast. Scenario bounds are 0.55× and 1.65× base, not statistical confidence intervals.

The official watchlist is fully retained. Additional below-floor candidates must lack token markers and exclude CEX/versioned names. Early rows may be restricted or wrapped products; the available ten-field dataset cannot prove independence. Recorded-token protocols are kept separate. Evidence completeness counts growth, age, category and chain; it is not a safety rating.

Farm plans derive from category, chain, TVL and age, carry illustrative costs/time, and require checking real app eligibility before any transaction. No token, reward or qualification is claimed. The browser displays the exact plan written to board.json.

## Evidence

`screenshots/` holds real 1440×1000 browser captures: board, protocol detail, and early Lending filter. No external assets or browser requests are required. Build output is deliberately ignored; run the command to regenerate it from the kit snapshot.

MIT. The starter's `vendor/makefun-board.ts` remains the authoritative dossier writer.

