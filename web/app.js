"use strict";

/*
 * Local, deterministic demonstration of the generic threshold rules in
 * agents/workers.py. This does NOT interpret variants or recommend treatment.
 */
function evaluatePayload(input) {
  const payload = {
    task_id: String(input.task_id || "").trim(),
    target_identifier: String(input.target_identifier || "").trim(),
    primary_metric: Number(input.primary_metric),
    secondary_metric: Number(input.secondary_metric),
    status_descriptor: String(input.status_descriptor || "").trim(),
    is_critical_flag: input.is_critical_flag === true
  };

  if (!payload.task_id || !payload.target_identifier ||
      payload.task_id.length > 120 || payload.target_identifier.length > 120) {
    throw new Error("Provide short, synthetic task and target identifiers.");
  }
  if (!Number.isFinite(payload.primary_metric) ||
      !Number.isFinite(payload.secondary_metric)) {
    throw new Error("Primary and secondary measurements must be finite numbers.");
  }
  if (payload.status_descriptor.length > 200) {
    throw new Error("The status descriptor must be at most 200 characters.");
  }

  const alerts = [];
  if (payload.primary_metric > 25) {
    alerts.push({
      worker: "InvariantQCWorker",
      urgency: "ELEVATED_RISK",
      summary: "Primary metric above demonstration boundary (25)"
    });
  }
  if (payload.is_critical_flag || payload.secondary_metric > 12) {
    alerts.push({
      worker: "SafetyEscalationWorker",
      urgency: payload.is_critical_flag ? "CRITICAL_STAT_PANIC" : "ELEVATED_RISK",
      summary: "Critical flag or secondary metric above demonstration boundary (12)"
    });
  }
  if (/(DISCORDANT|ANOMALY|MUTANT|VIOLATION|FAIL|REJECT)/i.test(payload.status_descriptor)) {
    alerts.push({
      worker: "ProtocolConformanceWorker",
      urgency: "ELEVATED_RISK",
      summary: "Descriptor matches a demonstration alert keyword"
    });
  }
  const critical = alerts.some(a => a.urgency === "CRITICAL_STAT_PANIC");
  const urgency = critical ? "CRITICAL_STAT_PANIC" :
    alerts.length ? "ELEVATED_RISK" : "ROUTINE";
  return {
    mode: "local_deterministic_demonstration",
    task_id: payload.task_id,
    target_identifier: payload.target_identifier,
    overall_urgency: urgency,
    integrity_status: critical ? "RECALIBRATION_REQUIRED" :
      alerts.length ? "DISCORDANT_ANOMALY" : "VALIDATED_OPTIMAL",
    total_alerts: alerts.length,
    alerts: alerts,
    note: "Generic demonstration rules only; no molecular interpretation or clinical validation."
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { evaluatePayload };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("audit-form");
    const result = document.getElementById("result");
    const error = document.getElementById("error");
    const download = document.getElementById("download");
    let latest = null;
    let count = 0;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      error.textContent = "";
      download.disabled = true;
      try {
        latest = evaluatePayload({
          task_id: document.getElementById("task_id").value,
          target_identifier: document.getElementById("target_identifier").value,
          primary_metric: document.getElementById("primary_metric").value,
          secondary_metric: document.getElementById("secondary_metric").value,
          status_descriptor: document.getElementById("status_descriptor").value,
          is_critical_flag: document.getElementById("is_critical_flag").checked
        });
        result.textContent = JSON.stringify(latest, null, 2);
        count += 1;
        document.getElementById("tasks").textContent = String(count);
        document.getElementById("status").textContent = latest.overall_urgency;
        download.disabled = false;
      } catch (err) {
        latest = null;
        result.textContent = "No valid evaluation has been generated.";
        error.textContent = err.message;
      }
    });

    download.addEventListener("click", function () {
      if (!latest) return;
      const blob = new Blob([JSON.stringify(latest, null, 2) + "\n"],
        { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resistance-demo-result.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  });
}
