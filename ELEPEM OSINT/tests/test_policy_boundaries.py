from pathlib import Path


def test_forbidden_browser_automation_dependencies_are_absent() -> None:
    pyproject = Path("pyproject.toml").read_text(encoding="utf-8").lower()
    assert "selenium" not in pyproject
    assert "playwright" not in pyproject


def test_all_required_classifications_are_declared() -> None:
    from app.enums import Classification

    assert {item.value for item in Classification} == {
        "MATCHED_HABILITATED",
        "MATCHED_IN_PROCESS",
        "POSSIBLE_MATCH",
        "NOT_MATCHED",
        "INSUFFICIENT_INFORMATION",
        "HUMAN_REVIEW_REQUIRED",
    }
