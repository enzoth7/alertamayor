from app.services.exports import _spreadsheet_safe


def test_csv_export_neutralizes_spreadsheet_formulas() -> None:
    assert _spreadsheet_safe('=HYPERLINK("https://example.test")') == (
        '\'=HYPERLINK("https://example.test")'
    )
    assert _spreadsheet_safe("Residencial Ejemplo") == "Residencial Ejemplo"
