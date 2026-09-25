/* Regression suite for the QPF Challenge Reality router/canonicalizer.
 *
 * Run: node --test tests/
 *
 * These tests make receipt laundering mechanically difficult: a related
 * receipt must never be promoted to an exact receipt, a missing value must
 * never be filled, an unexecuted path must never look executed, and
 * conflicting branches must never be collapsed to a winner.
 *
 * The suite imports the SAME router.js the public page ships.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const router = require("../router.js");
const { formalize, PIN } = router;

const CLAIM_BROAD_CMB = "Does the Black Hole Universe explain the CMB cutoff?";
const CLAIM_EXACT =
  "Reproduce the registered BHU theta_cut anomaly audit status, pin " + PIN;
const CLAIM_MODIFIED =
  "Repeat the registered BHU anomaly audit at theta > 45 degrees, pin " + PIN;
const CLAIM_ABSENT =
  "Does the black-hole universe predict the primordial spectrum?";
const CLAIM_CONFLICTING =
  "Do two constructions define theta_cut differently for the black-hole universe?";

function run(claim) {
  return formalize(claim).o;
}

/* ---------------------------- TEST 1 ---------------------------- */
test("TEST 1: broader BHU/CMB question routes to CANDIDATE, not RECEIPT", () => {
  const o = run(CLAIM_BROAD_CMB);

  assert.equal(o.route, "CANDIDATE");
  assert.notEqual(o.route, "RECEIPT");
  assert.equal(o.gaps.version, "UNKNOWN");
  assert.equal(o.provenance.scope_locked, false);
  assert.equal(o.frame.scope_locked, false);
  assert.equal(o.nearby.pin, PIN, "nearby receipt must be offered, not inherited");
  assert.equal(o.receipt, null, "a related receipt must not be attached");
  assert.match(formalize(CLAIM_BROAD_CMB).say, /isn't necessarily the same claim|does not lock/i);
});

/* ---------------------------- TEST 2 ---------------------------- */
test("TEST 2: exact registered construction (hash + registered scope) routes to RECEIPT", () => {
  const o = run(CLAIM_EXACT);

  assert.equal(o.route, "RECEIPT");
  assert.equal(o.provenance.scope_locked, true);
  assert.equal(o.frame.scope_locked, true);
  assert.equal(o.provenance.construction_hash, PIN);
  assert.ok(o.receipt, "exact object carries its receipt");
  assert.equal(o.receipt.commit, PIN);
  assert.equal(o.receipt.repository, "onenoly1010/qpf-bhu-anomaly-receipt");
  assert.equal(o.receipt.registered_status.HYPOTHESIS_STATUS, "NOT ESTABLISHED");
  assert.equal(o.nearby, null);
  // The receipt belongs to the object; it is not a verdict on other claims.
  assert.match(o.note, /pinned audit only/i);
  // Registered labels must match the pinned receipt.json cells.
  assert.equal(o.receipt.registered_status.theta_cut, "ACCOMMODATION");
  assert.equal(o.receipt.registered_status.C2, "UNDERDETERMINED");
  assert.equal(o.receipt.registered_status.S1_S7, "LOCKED");
});

/* ---------------------------- TEST 3 ---------------------------- */
test("TEST 3: modified parameter routes to CANDIDATE and inherits nothing", () => {
  const o = run(CLAIM_MODIFIED);

  assert.equal(o.route, "CANDIDATE");
  assert.notEqual(o.route, "RECEIPT");
  assert.equal(o.gaps.version, "UNKNOWN");
  assert.equal(o.provenance.scope_locked, false);
  assert.equal(o.receipt, null, "modified scope must not inherit the receipt");
  assert.equal(o.nearby.pin, PIN);
  assert.deepEqual(o.known.requested_threshold_deg, [45]);
  assert.equal(o.known.registered_threshold_deg, 60);
  assert.match(formalize(CLAIM_MODIFIED).say, /new scope|Nothing inherits/i);
});

/* ---------------------------- TEST 4 ---------------------------- */
test("TEST 4: missing required object routes ABSENT / CHALLENGE, never 'unfalsifiable'", () => {
  const o = run(CLAIM_ABSENT);

  assert.equal(o.gaps.P_R, "ABSENT");
  assert.equal(o.route, "CHALLENGE");
  assert.equal(o.receipt, null);
  assert.equal(o.provenance.scope_locked, false);
  const text = (o.note + " " + formalize(CLAIM_ABSENT).say).toLowerCase();
  assert.ok(!text.includes("unfalsifiable"),
    "ABSENT must not be translated into UNFALSIFIABLE THEORY");
  assert.match(o.note, /cannot run|cannot execute/i);
  assert.match(o.note, /does not mean the whole idea is false/i);
});

/* ---------------------------- TEST 5 ---------------------------- */
test("TEST 5: conflicting constructions route CONFLICTING and preserve both branches", () => {
  const o = run(CLAIM_CONFLICTING);

  assert.equal(o.route, "CONFLICTING");
  assert.equal(o.gaps.definition, "CONFLICTING");
  assert.ok(Array.isArray(o.branches) && o.branches.length >= 2,
    "both branches must be preserved");
  const ids = o.branches.map((b) => b.id);
  assert.ok(ids.includes("branch_A"), "branch_A preserved");
  assert.ok(ids.includes("branch_B"), "branch_B preserved");
  // No winner may be selected.
  assert.equal(o.winner, undefined);
  assert.equal(o.selected, undefined);
  assert.equal(o.receipt, null, "conflict must not silently resolve to a receipt");
  assert.equal(o.provenance.scope_locked, false);
  assert.equal(o.branches.filter((b) => b.id === "branch_A").length, 1);
  assert.equal(o.branches.filter((b) => b.id === "branch_B").length, 1);
});

/* ------------------- RECEIPT-LAUNDERING INVARIANTS ------------------- */

test("INVARIANT: only exact hash + exact scope may produce a RECEIPT", () => {
  const broadWithPin = run(CLAIM_BROAD_CMB + " pin " + PIN);
  assert.notEqual(broadWithPin.route, "RECEIPT",
    "appending the pin to a broader question must not launder it into a receipt");
  assert.equal(broadWithPin.receipt, null);

  const paraphrase = run(
    "Is the Gaztanaga black-hole-universe theta-cut story right?"
  );
  assert.notEqual(paraphrase.route, "RECEIPT",
    "a better paraphrase is not a stronger receipt");
  assert.equal(paraphrase.receipt, null);

  const missingScope = run("pin " + PIN);
  assert.notEqual(missingScope.route, "RECEIPT",
    "a bare hash with no registered scope is not an exact object");
});

test("INVARIANT: no route other than RECEIPT carries a receipt or a locked scope", () => {
  const claims = [
    CLAIM_BROAD_CMB,
    CLAIM_MODIFIED,
    CLAIM_ABSENT,
    CLAIM_CONFLICTING,
    "Is this bridge open?",
    "Does this supplement actually do what it claims?",
    "Did this mathematical proof establish the theorem?",
    "Did the moon land upside down?",
    CLAIM_BROAD_CMB + " pin " + PIN
  ];
  for (const c of claims) {
    const o = run(c);
    assert.notEqual(o.route, "RECEIPT");
    assert.equal(o.receipt, null, `receipt attached for: ${c}`);
    assert.equal(o.provenance.scope_locked, false, `scope locked for: ${c}`);
  }
});

test("INVARIANT: unexecuted paths stay visibly proposed, never fabricated", () => {
  const claims = [
    CLAIM_BROAD_CMB,
    CLAIM_EXACT,
    CLAIM_MODIFIED,
    CLAIM_ABSENT,
    CLAIM_CONFLICTING,
    "Is this bridge open?",
    "Just some everyday sentence."
  ];
  for (const c of claims) {
    const o = run(c);
    assert.equal(o.execution.proposed, true, `executed for: ${c}`);
    assert.equal(o.execution.environment, null, `environment set for: ${c}`);
    assert.equal(o.execution.outputs, null, `outputs fabricated for: ${c}`);
    const json = JSON.stringify(o);
    assert.ok(!/REPRODUCTION: SAME STATUS/.test(json),
      "run output must never be fabricated by the router");
  }
});

test("INVARIANT: UNKNOWN routes to PROMPT_REFINEMENT and is never filled in", () => {
  const o = run("Is this bridge open?");
  assert.equal(o.gaps.which_bridge, "UNKNOWN");
  assert.equal(o.gaps.when, "UNKNOWN");
  assert.equal(o.route, "PROMPT_REFINEMENT");
  // The router must not guess a bridge or a time.
  assert.equal(o.known.which_bridge, undefined);
  assert.equal(o.known.when, undefined);
  assert.equal(o.receipt, null);
});

/* --------------- PINNED-RECEIPT CROSS-CHECK (anti-self-confirmation) ---------------
 *
 * TEST 2 above compares the router against its own registered_status copy.
 * This test binds that copy to the actual pinned object: it loads receipt.json
 * AT COMMIT 19b35f6 (never the working tree, never a branch tip) and asserts
 * the router's labels equal the file's cells field by field.
 *
 * Source order:
 *   1) sibling clone, read via `git show <pin>:receipt.json` (offline-safe)
 *   2) raw fetch of the file at that exact commit
 * If neither yields the file, THIS TEST FAILS. It never skips.
 */

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const SIBLING_DIR = path.resolve(__dirname, "..", "..", "qpf-bhu-anomaly-receipt");
const RAW_PINNED_URL =
  "https://raw.githubusercontent.com/onenoly1010/qpf-bhu-anomaly-receipt/" +
  PIN +
  "/receipt.json";

async function loadPinnedReceipt() {
  const attempts = [];
  try {
    const blob = execFileSync(
      "git",
      ["-C", SIBLING_DIR, "show", PIN + ":receipt.json"],
      { encoding: "utf8", maxBuffer: 1024 * 1024 }
    );
    return { source: "git:" + SIBLING_DIR + "@" + PIN, receipt: JSON.parse(blob) };
  } catch (e) {
    attempts.push("sibling `git show " + PIN + ":receipt.json` -> " + e.message);
  }
  try {
    const res = await fetch(RAW_PINNED_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return { source: RAW_PINNED_URL, receipt: await res.json() };
  } catch (e) {
    attempts.push(RAW_PINNED_URL + " -> " + e.message);
  }
  throw new Error(
    "pinned receipt.json unavailable at commit " + PIN +
    " — failing rather than skipping:\n  " + attempts.join("\n  ")
  );
}

test("CROSS-CHECK: router's registered labels equal pinned receipt.json cells, field by field", async () => {
  const { source, receipt } = await loadPinnedReceipt();

  // --- Identity of the pinned object ---
  assert.equal(receipt.package, "qpf-bhu-anomaly-receipt");
  assert.ok(
    router.REPO.endsWith(receipt.package),
    `router repository ${router.REPO} does not name the pinned package`
  );
  assert.equal(
    receipt.which_version,
    router.REGISTERED.construction,
    "construction identity drift between router registry and pinned receipt"
  );

  // --- Field-by-field label comparison (router copy vs. file cells) ---
  const cells = receipt.cells;
  const status = router.REGISTERED.registered_status;
  const mapping = {
    // router label            -> receipt cell        , normalizer
    HYPOTHESIS_STATUS: ["overall", (s) => String(s).replace(/_/g, " ")],
    theta_cut: ["theta_cut", null],
    C2: ["C2", null],
    S1_S7: ["S1_S7", null]
  };
  for (const key of Object.keys(mapping)) {
    const [cell, normalize] = mapping[key];
    assert.ok(cell in cells, `receipt.json cells missing ${cell}`);
    const expected = normalize ? normalize(cells[cell]) : cells[cell];
    assert.equal(
      status[key],
      expected,
      `router registered_status.${key} != receipt cells.${cell} (${source})`
    );
  }
  // Every router status key must map to a real cell — no invented labels.
  assert.deepEqual(
    Object.keys(status).sort(),
    ["C2", "HYPOTHESIS_STATUS", "S1_S7", "theta_cut"]
  );
  // The overall cell must never be upgraded: NOT_ESTABLISHED stays as filed.
  assert.equal(cells.overall, "NOT_ESTABLISHED");

  // --- The RECEIPT-route block must also agree with the file ---
  const o = formalize(CLAIM_EXACT).o;
  assert.equal(o.route, "RECEIPT");
  assert.equal(o.receipt.commit, PIN);
  assert.equal(o.receipt.reproduces, receipt.reproduces);
  assert.deepEqual(o.receipt.does_not_recompute, receipt.does_not_recompute);
  assert.deepEqual(
    o.receipt.registered_status,
    status,
    "RECEIPT-route labels drifted from the registry"
  );
});

test("INVARIANT: pipeline stages are declared in fixed order", () => {
  for (const c of [CLAIM_BROAD_CMB, CLAIM_EXACT, "Is this bridge open?"]) {
    const o = run(c);
    assert.deepEqual(o.stage, [
      "RETRIEVE_FRAME",
      "CANONICALIZE",
      "CLASSIFY_GAPS",
      "PROVENANCE",
      "ROUTE"
    ]);
    assert.equal(o.provenance.source, "registry:qpf-challenge-reality");
    assert.ok(o.provenance.retrieved_at, "provenance must record retrieval");
  }
});
