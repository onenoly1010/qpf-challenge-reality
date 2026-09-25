#!/usr/bin/env node
/* Mutation checks for the pinned-receipt cross-check.
 *
 * Run: node tests/mutation-check.js
 *
 * Proves the cross-check CAN fail — the two cases that would otherwise rest
 * on a manual run:
 *   1) a corrupted hand-copied label in router.js must fail the field-by-field
 *      comparison against receipt.json at the pinned commit;
 *   2) both pinned sources (sibling clone + raw fetch) unavailable must FAIL,
 *      never skip.
 *
 * Each case runs in a throwaway scratch copy of router.js + the test file.
 * The real working tree is never modified. Exits non-zero if a mutation
 * unexpectedly passes, or if the scratch run fails for the wrong reason.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TEST_FILE = path.join(__dirname, "router.regression.test.js");

function scratchRun(name, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qpf-mutation-"));
  fs.mkdirSync(path.join(dir, "tests"));
  const router = fs.readFileSync(path.join(ROOT, "router.js"), "utf8");
  let test = fs.readFileSync(TEST_FILE, "utf8");
  const mutated = mutate({ router, test });
  fs.writeFileSync(path.join(dir, "router.js"), mutated.router);
  fs.writeFileSync(
    path.join(dir, "tests", "router.regression.test.js"),
    mutated.test
  );
  const r = spawnSync(
    process.execPath,
    ["--test", "tests/router.regression.test.js"],
    { cwd: dir, encoding: "utf8" }
  );
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

function must(label, cond, detail) {
  if (cond) {
    console.log("ok   - " + label);
    return;
  }
  console.error("FAIL - " + label);
  if (detail) console.error(detail);
  process.exitCode = 1;
}

/* Case 1: corrupt a hand-copied label -> cross-check must catch it. */
const c1 = scratchRun("corrupted-label", ({ router, test }) => {
  const out = router.replace(
    'HYPOTHESIS_STATUS: "NOT ESTABLISHED"',
    'HYPOTHESIS_STATUS: "CONFIRMED"'
  );
  if (out === router) {
    throw new Error(
      "mutation anchor not found in router.js — registered_status changed shape; update this check"
    );
  }
  return { router: out, test };
});
must(
  "mutation 1: corrupted router label makes the suite fail",
  c1.status !== 0 &&
    /registered_status\.HYPOTHESIS_STATUS != receipt cells\.overall/.test(c1.out),
  "expected the cross-check failure message; got status=" + c1.status +
    "\n" + c1.out.slice(0, 2000)
);

/* Case 2: both pinned sources broken -> must fail, never skip. */
const c2 = scratchRun("broken-sources", ({ router, test }) => {
  let out = test.replace(
    '"..", "..", "qpf-bhu-anomaly-receipt"',
    '"..", "..", "no-such-sibling"'
  );
  out = out.replace(
    'qpf-bhu-anomaly-receipt/"',
    "qpf-bhu-anomaly-receipt-NOSUCH/\""
  );
  if (out === test) {
    throw new Error(
      "mutation anchors not found in test file — loader paths changed; update this check"
    );
  }
  return { router, test: out };
});
must(
  "mutation 2: unavailable pinned sources fail rather than skip",
  c2.status !== 0 && /failing rather than skipping/.test(c2.out),
  "expected the fail-not-skip message; got status=" + c2.status +
    "\n" + c2.out.slice(0, 2000)
);

if (process.exitCode) {
  console.error("mutation checks FAILED");
} else {
  console.log("mutation checks passed: the cross-check can fail");
}
