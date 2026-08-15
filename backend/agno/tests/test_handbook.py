from sejuk_assistant.knowledge.handbook import organization_handbook


def test_handbook_contains_reviewed_role_and_payment_guidance() -> None:
    handbook = organization_handbook()
    assert "## Manager" in handbook
    assert "Contact an admin first" in handbook
    assert "Escalate the issue to a manager" in handbook
