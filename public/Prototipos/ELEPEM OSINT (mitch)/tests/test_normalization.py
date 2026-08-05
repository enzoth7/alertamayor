from app.normalization import normalize_address, normalize_domain, normalize_name, normalize_phone


def test_uruguay_phone_normalization() -> None:
    assert normalize_phone("099 123 456") == "+59899123456"
    assert normalize_phone("+598 2 900 1234") == "+59829001234"
    assert normalize_phone("not a phone") is None


def test_text_and_domain_normalization() -> None:
    assert normalize_name("Residencial Los Álamos S.R.L.") == "residencial los alamos"
    assert normalize_address("Av. Italia 1234") == "avenida italia 1234"
    assert normalize_domain("https://WWW.Ejemplo.uy/contacto") == "ejemplo.uy"
