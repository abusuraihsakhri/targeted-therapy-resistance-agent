"""Regressions for HMAC verification, PHI checks, and numeric validation."""
import os

import pytest
from pydantic import ValidationError

os.environ.setdefault("AUDIT_SECRET_KEY", "test-audit-secret-key-2026-secure")

from agents.base import AuditTrail, AuditLogger, SecurityException
from agents.models import SystemTaskPayload
from agents.supervisor import SystemSupervisor


def test_audit_integrity_detects_mutated_signed_fields():
    audit = AuditTrail(secret_key="a-secret-longer-than-16")
    audit.log("test", "reviewer", "CREATE", {"status": "ok"})
    audit.log("test", "reviewer", "VERIFY", {"status": "ok"})
    assert audit.verify_integrity()

    audit.logs[-1]["current_hash"] = "0" * 64
    assert not audit.verify_integrity()


def test_audit_integrity_detects_modified_actor():
    audit = AuditTrail(secret_key="a-secret-longer-than-16")
    audit.log("test", "reviewer", "CREATE", {"status": "ok"})
    audit.logs[0]["actor"] = "imposter"
    assert not audit.verify_integrity()


def test_audit_snapshot_is_independent():
    audit = AuditTrail(secret_key="a-secret-longer-than-16")
    audit.log("test", "reviewer", "CREATE", {"status": "ok"})
    snapshot = audit.get_trail()
    snapshot[0]["actor"] = "modified"
    snapshot.clear()
    assert audit.verify_integrity()
    assert len(audit.get_trail()) == 1


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf")])
def test_nonfinite_metrics_rejected(value):
    with pytest.raises(ValidationError):
        SystemTaskPayload(task_id="test", target_identifier="SYNTH", primary_metric=value)
    with pytest.raises(ValidationError):
        SystemTaskPayload(task_id="test", target_identifier="SYNTH", primary_metric=1, secondary_metric=value)


def test_nested_attribute_identifiers_rejected():
    AuditLogger.reset()
    payload = SystemTaskPayload(
        task_id="TASK-SYNTH",
        target_identifier="SPECIMEN-SYNTH",
        primary_metric=10.0,
        attributes={"annotations": {"patient_id": "MRN-994827"}},
    )
    with pytest.raises(SecurityException):
        SystemSupervisor().process_task(payload)
