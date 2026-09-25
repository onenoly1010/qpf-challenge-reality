/* QPF Challenge Reality — router / canonicalizer prototype.
 *
 * KEYWORD-ONLY. This is a routing demo, not a live matcher and not a
 * verification service. It never executes anything and never invents values.
 *
 * Pipeline (two canonicalizer stages, order fixed):
 *   RETRIEVE_FRAME -> CANONICALIZE -> CLASSIFY_GAPS -> PROVENANCE -> ROUTE
 *
 * Frozen rules:
 *   prose may drop / scope may not
 *   UNKNOWN = data, not a license to fill
 *   nearby hash -> CANDIDATE ; exact hash + exact scope -> RECEIPT
 *   A better paraphrase is not a stronger receipt.
 *
 * Shared by index.html (browser) and tests/router.regression.test.js (Node),
 * so the regression suite exercises the exact code the page ships.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.QPFRouter = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PIN = "19b35f6ae2691c6ea2c2007fd1dbd0b3a6b62dee";
  var REPO = "onenoly1010/qpf-bhu-anomaly-receipt";

  var STAGES = [
    "RETRIEVE_FRAME",
    "CANONICALIZE",
    "CLASSIFY_GAPS",
    "PROVENANCE",
    "ROUTE"
  ];

  /* Registry of registered constructions. Routing metadata only — no new
   * cosmology. Labels below are copied from the pinned receipt.json and
   * belong to that pinned object alone. */
  var REGISTERED = {
    family: "BHU",
    construction: "Gaztanaga-BHU-2022-2026",
    repository: REPO,
    commit: PIN,
    observation: "CMB large-angle / cutoff (theta_cut cell)",
    registered_threshold_deg: 60,
    /* Tokens that name the registered scope itself (the audit object),
     * as opposed to a broader question about the same family. */
    scope_tokens: /theta[_\s-]?cut|θ[_\s-]?cut|theta\s*>\s*60|θ\s*>\s*60|anomaly audit|audit status|registered status/,
    /* Objects the registered construction does not supply for one test. */
    objects_absent: { P_R: "ABSENT" },
    /* Registered status labels of the pinned object (receipt.json cells). */
    registered_status: {
      HYPOTHESIS_STATUS: "NOT ESTABLISHED",
      theta_cut: "ACCOMMODATION",
      C2: "UNDERDETERMINED",
      S1_S7: "LOCKED"
    },
    /* CONFLICTING routing fixture. branch_B is synthetic and is NOT
     * attributed to any published construction; it exists only so the
     * router regression suite can prove branches are preserved without
     * selecting a winner. */
    conflict_fixture: {
      object: "theta_cut definition",
      fixture: true,
      branches: [
        {
          id: "branch_A",
          construction: "Gaztanaga-BHU-2022-2026",
          definition: "theta_cut is a pre-existing datum (theta > 60 deg)",
          hash: PIN
        },
        {
          id: "branch_B",
          construction: "unregistered-alternative-fixture",
          definition: "theta_cut is a free cut parameter fitted to data",
          hash: null,
          fixture: true
        }
      ]
    }
  };

  var RE_RECEIPT_SAY =
    "Exact object: this question locks the registered construction. " +
    "The registered status belongs to this pinned audit only. " +
    "Reproduce it: cd qpf-bhu-anomaly-receipt && python3 reproduce.py. " +
    "Expected: NOT ESTABLISHED. The page does not recompute Planck.";

  function findThresholds(t) {
    var values = [];
    var re1 = /(\d{2,3})\s*(?:°|deg(?:ree)?s?\b)/g;
    var re2 = /(?:theta|θ)\s*>\s*(\d{2,3})/g;
    var m;
    while ((m = re1.exec(t)) !== null) values.push(parseInt(m[1], 10));
    while ((m = re2.exec(t)) !== null) values.push(parseInt(m[1], 10));
    return values.filter(function (v, i) {
      return values.indexOf(v) === i;
    });
  }

  function formalize(raw) {
    raw = (raw || "").trim();
    var t = raw.toLowerCase();

    /* ---- Stage 1: RETRIEVE_FRAME (establish the reference frame) ---- */
    var bhu = /black.?hole|bhu|gazta/.test(t);
    var cmb = /cmb|cutoff|quadrupole/.test(t);
    var spec = /spectrum|primordial/.test(t);
    var bridge = /bridge/.test(t);
    var supp = /supplement|vitamin|pill/.test(t);
    var proof = /proof|theorem|mathematical/.test(t);
    var conflict =
      /conflict|incompatible|two\s+(?:different\s+)?definitions?|define\b[^.]*\bdifferently/.test(t);
    var hasHash = t.indexOf(PIN) !== -1;
    var scopeToken = REGISTERED.scope_tokens.test(t);
    var thresholds = findThresholds(t);
    var modified = thresholds.some(function (v) {
      return v !== REGISTERED.registered_threshold_deg;
    });

    var frame = {
      family: bhu ? REGISTERED.family : "UNKNOWN",
      construction: bhu ? REGISTERED.construction : null,
      construction_hash: hasHash ? REGISTERED.commit : null,
      observation: spec
        ? "primordial spectrum"
        : cmb
          ? "CMB large-angle / cutoff"
          : "UNKNOWN",
      source: "registry:qpf-challenge-reality",
      retrieved_at: "client-local",
      scope_locked: false
    };

    /* ---- Stage 2: CANONICALIZE + CLASSIFY_GAPS + PROVENANCE + ROUTE ----
     * Precedence: conflict > absent object > modified parameter >
     * exact receipt > family/candidate > everyday prompt refinement. */
    var o = {
      claim: raw,
      stage: STAGES.slice(),
      frame: frame,
      known: {},
      gaps: {},
      provenance: null,
      route: "PROMPT_REFINEMENT",
      nearby: null,
      branches: null,
      receipt: null,
      execution: { proposed: true, script: null, environment: null, outputs: null },
      note: "No value invented. Keyword demo."
    };
    var say = "";

    if (bhu) {
      o.known.family = REGISTERED.family;
      o.known.observation = frame.observation;
      o.provenance = {
        source: frame.source,
        construction_hash: REGISTERED.commit,
        retrieved_at: frame.retrieved_at,
        scope_locked: false
      };
      o.nearby = { pin: PIN, relation: "same family" };

      if (conflict) {
        /* CONFLICTING: never select a winner, preserve every branch. */
        o.gaps.definition = "CONFLICTING";
        o.route = "CONFLICTING";
        o.branches = REGISTERED.conflict_fixture.branches.map(function (b) {
          return { id: b.id, construction: b.construction, definition: b.definition, hash: b.hash, fixture: !!b.fixture };
        });
        o.nearby.relation = "conflicting definitions";
        o.note =
          "Two registered constructions define this object incompatibly. " +
          "QPF does not choose. Both branches are preserved.";
        say = o.note;
      } else if (spec) {
        /* ABSENT: the registered construction does not supply the object
         * required for this test. Cannot execute this test. This is NOT a
         * claim that the theory is unfalsifiable. */
        o.gaps.P_R = REGISTERED.objects_absent.P_R;
        o.route = "CHALLENGE";
        o.nearby.relation = "same family, different test";
        o.note =
          "The registered BHU construction does not supply this object, so " +
          "this test cannot run. That does not mean the whole idea is false.";
        say = o.note;
      } else if (modified) {
        /* Modified parameter: new scope. Related object, not the pinned
         * one. Nothing is inherited from the receipt. */
        o.gaps.version = "UNKNOWN";
        o.route = "CANDIDATE";
        o.known.registered_threshold_deg = REGISTERED.registered_threshold_deg;
        o.known.requested_threshold_deg = thresholds;
        o.nearby.relation = "registered family, modified parameter";
        o.note =
          "You changed a registered parameter, so this is a new scope: " +
          "related object, not the pinned one. Nothing inherits from the " +
          "receipt.";
        say = o.note;
      } else if (hasHash && scopeToken) {
        /* Exact hash + exact registered scope -> RECEIPT. The result below
         * belongs to that object and to no other question. */
        o.route = "RECEIPT";
        o.frame.scope_locked = true;
        o.provenance.scope_locked = true;
        o.nearby = null;
        o.receipt = {
          repository: REGISTERED.repository,
          commit: REGISTERED.commit,
          registered_status: REGISTERED.registered_status,
          reproduces: "audit-status-line",
          does_not_recompute: ["Planck_likelihood", "Pantheon_chi2"]
        };
        o.execution.script = "python3 reproduce.py";
        o.execution.environment = null;
        o.execution.outputs = null;
        o.note =
          "Exact object matched. Registered status labels belong to this " +
          "pinned audit only; they are not a verdict on any other question.";
        say = RE_RECEIPT_SAY;
      } else if (cmb) {
        /* Broader BHU/CMB question (even with the pin appended) does not
         * lock the construction. Nearby -> CANDIDATE. */
        o.gaps.version = "UNKNOWN";
        o.route = "CANDIDATE";
        o.nearby.relation = "scope mismatch";
        o.note =
          "There is a related receipt for one construction. Your question " +
          "does not lock that construction. Related is not the same claim.";
        say = o.note;
      } else {
        o.gaps.version = "UNKNOWN";
        o.route = "CANDIDATE";
        o.note =
          "There is a related receipt. It is not automatically this question.";
        say = o.note;
      }
    } else if (bridge) {
      o.gaps.which_bridge = "UNKNOWN";
      o.gaps.when = "UNKNOWN";
      o.route = "PROMPT_REFINEMENT";
      o.provenance = { source: frame.source, construction_hash: null, retrieved_at: frame.retrieved_at, scope_locked: false };
      say = "This can be checked, but you have not said which bridge or when. Next: name the place and time.";
      o.note = say;
    } else if (supp) {
      o.gaps.product = "UNKNOWN";
      o.gaps.claimed_effect = "UNKNOWN";
      o.route = "PROMPT_REFINEMENT";
      o.provenance = { source: frame.source, construction_hash: null, retrieved_at: frame.retrieved_at, scope_locked: false };
      say = "This can be checked only after the product and the claimed effect are named. A label is not a test.";
      o.note = say;
    } else if (proof) {
      o.gaps.theorem = "UNKNOWN";
      o.gaps.proof_object = "UNKNOWN";
      o.route = "PROMPT_REFINEMENT";
      o.provenance = { source: frame.source, construction_hash: null, retrieved_at: frame.retrieved_at, scope_locked: false };
      say = "A proof exists is not the same object as a specific proof of a named theorem. Name both.";
      o.note = say;
    } else {
      o.gaps.scope = "UNKNOWN";
      o.route = "PROMPT_REFINEMENT";
      o.provenance = { source: frame.source, construction_hash: null, retrieved_at: frame.retrieved_at, scope_locked: false };
      say = "Not enough is specified to test. You can still put it on the table as a draft.";
      o.note = say;
    }

    return { o: o, say: say };
  }

  return {
    PIN: PIN,
    REPO: REPO,
    STAGES: STAGES,
    REGISTERED: REGISTERED,
    formalize: formalize
  };
});
