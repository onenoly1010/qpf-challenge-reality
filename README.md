# QPF Challenge Reality

Front door only. No new cosmology. No payouts.

Open `index.html` locally, or view on GitHub.

First challenge: https://github.com/onenoly1010/qpf-bhu-anomaly-receipt
Pin: `19b35f6ae2691c6ea2c2007fd1dbd0b3a6b62dee`

```
git clone https://github.com/onenoly1010/qpf-bhu-anomaly-receipt
cd qpf-bhu-anomaly-receipt
python3 reproduce.py
```

Expected: BHU = NOT ESTABLISHED
Independent reproduction: not claimed.

## Router demo

`index.html` loads `router.js`, a **keyword-only** prototype router/canonicalizer:

```
RETRIEVE_FRAME → CANONICALIZE → CLASSIFY_GAPS → PROVENANCE → ROUTE
```

Routes: `RECEIPT | CANDIDATE | CHALLENGE | PROMPT_REFINEMENT | CONFLICTING`.
Gap states: `UNKNOWN | ABSENT | UNDEFINED | CONFLICTING` — data, never a
license to fill. Only an exact registered hash **plus** exact registered scope
routes to `RECEIPT`; anything nearby is a `CANDIDATE`. The page never executes
anything and never verifies a claim.

## Regression suite

The suite imports the same `router.js` the page ships, so receipt laundering
(a related receipt promoted to an exact receipt) fails mechanically:

```bash
node --test tests/router.regression.test.js
```

Covered: broader BHU/CMB question → CANDIDATE; exact registered construction →
RECEIPT; modified parameter → CANDIDATE; missing object → ABSENT/CHALLENGE;
conflicting constructions → CONFLICTING with `branch_A` and `branch_B`
preserved; plus invariants (no receipt without exact match, no fabricated
execution, UNKNOWN never filled, fixed stage order).

A cross-check loads `receipt.json` **at commit `19b35f6`** (sibling clone via
`git show <pin>:receipt.json`, falling back to a fetch at that exact commit)
and asserts the router's registered labels equal the file's `cells` field by
field. If the file cannot be read, the test **fails** — it never skips.

Mutation checks prove the cross-check can actually fail (corrupted label,
unavailable pinned sources), running in throwaway scratch copies:

```bash
node tests/mutation-check.js
```

CI (`.github/workflows/regression.yml`) runs both on every push and PR to
`main`. CI has no sibling clone, so the cross-check there exercises the
pinned-fetch fallback. CI is currently dormant (GitHub billing lock) — the
workflow is wired up and starts working once the account can run jobs.

## Pre-push hook

The same gates run locally before every push, no CI minutes required.
One-time enable per clone:

```bash
git config core.hooksPath hooks
```

A failing suite or failing mutation check blocks the push.
