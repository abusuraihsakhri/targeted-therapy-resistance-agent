import pytest
from resistome_sentinel import ResistanceMutationScannerAgent, BypassPathwayDetectorAgent, NextLineTherapyAdvisorAgent, ResistomeCoordinator, main


def test_sub_agents():
    a1 = ResistanceMutationScannerAgent()
    alerts1 = a1.evaluate({"metric_primary": 35.0})
    assert len(alerts1) == 1

    a2 = BypassPathwayDetectorAgent()
    alerts2 = a2.evaluate({"critical_flag": True})
    assert len(alerts2) == 1

    a3 = NextLineTherapyAdvisorAgent()
    alerts3 = a3.evaluate({"status_text": "DISCORDANT_FINDING"})
    assert len(alerts3) == 1


def test_coordinator():
    coord = ResistomeCoordinator()
    dossier = coord.audit_case({"case_id": "TEST-100", "metric_primary": 10.0, "metric_secondary": 2.0})
    assert dossier["overall_status"] == "CONCORDANT_NORMAL"
    assert dossier["total_alerts"] == 0

    ans = coord.query_assistant("What are the guidelines?")
    assert "guidelines" in ans or "standards" in ans


def test_cli():
    assert main(["audit", "--case-id", "CLI-01"]) == 0
    assert main(["chat", "What", "is", "the", "system", "status?"]) == 0


def test_domain_registry():
    from resistome_sentinel import DomainKnowledgeRegistry
    assert DomainKnowledgeRegistry.ZERO_PHI_COMPLIANCE is False
    assert DomainKnowledgeRegistry.HIPAA_SAFE_HARBOR == "NOT_VERIFIED"
    assert "PRO" in DomainKnowledgeRegistry.SYSTEM_VERSION


def test_false_string_critical_flag_is_not_true():
    """CSV fields are strings; 'False' must not trigger a critical alert."""
    from resistome_sentinel import ResistomeCoordinator
    result = ResistomeCoordinator().audit_case({
        "case_id": "SYNTH-C1", "metric_primary": "10",
        "metric_secondary": "2", "critical_flag": "False", "status_text": "NORMAL",
    })
    assert result["overall_status"] == "CONCORDANT_NORMAL"
    assert result["critical_count"] == 0


def test_advisory_only_is_not_reported_as_concordant():
    result = ResistomeCoordinator().audit_case({
        "case_id": "SYNTH-C2", "metric_primary": 10,
        "metric_secondary": 2, "status_text": "DISCORDANT",
    })
    assert result["total_alerts"] == 1
    assert result["overall_status"] == "ADVISORY_ACTIVE"
