"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePayload } = require("../web/app.js");

function payload(override = {}) {
  return {
    task_id: "DEMO-1",
    target_identifier: "SYNTH-1",
    primary_metric: 10,
    secondary_metric: 5,
    status_descriptor: "NOMINAL",
    is_critical_flag: false,
    ...override
  };
}

test("nominal input is routine with no alerts", () => {
  const result = evaluatePayload(payload());
  assert.equal(result.overall_urgency, "ROUTINE");
  assert.equal(result.integrity_status, "VALIDATED_OPTIMAL");
  assert.deepEqual(result.alerts, []);
});

test("threshold boundaries are strict (>, not >=)", () => {
  assert.equal(evaluatePayload(payload({ primary_metric: 25, secondary_metric: 12 })).total_alerts, 0);
  assert.equal(evaluatePayload(payload({ primary_metric: 25.01 })).total_alerts, 1);
  assert.equal(evaluatePayload(payload({ secondary_metric: 12.01 })).total_alerts, 1);
});

test("critical flag escalates regardless of metrics", () => {
  const result = evaluatePayload(payload({ is_critical_flag: true }));
  assert.equal(result.overall_urgency, "CRITICAL_STAT_PANIC");
  assert.equal(result.integrity_status, "RECALIBRATION_REQUIRED");
});

test("descriptor causes elevated alert", () => {
  const result = evaluatePayload(payload({ status_descriptor: "DISCORDANT_ANOMALY" }));
  assert.equal(result.total_alerts, 1);
  assert.equal(result.overall_urgency, "ELEVATED_RISK");
});

test("nonfinite and missing identifiers fail closed", () => {
  assert.throws(() => evaluatePayload(payload({ primary_metric: Infinity })));
  assert.throws(() => evaluatePayload(payload({ secondary_metric: NaN })));
  assert.throws(() => evaluatePayload(payload({ task_id: "" })));
  assert.throws(() => evaluatePayload(payload({ target_identifier: " " })));
});
