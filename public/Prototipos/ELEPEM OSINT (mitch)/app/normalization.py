import re
import unicodedata
from dataclasses import dataclass
from urllib.parse import urlsplit

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_SPACE = re.compile(r"\s+")
_LEGAL_SUFFIXES = {
    "sa",
    "srl",
    "sas",
    "ltda",
    "limitada",
    "sociedad",
    "anonima",
}
_ADDRESS_REPLACEMENTS = {
    "av": "avenida",
    "avda": "avenida",
    "cno": "camino",
    "dr": "doctor",
    "gral": "general",
    "pje": "pasaje",
}


@dataclass(frozen=True, slots=True)
class NormalizedFields:
    name: str | None
    address: str | None
    phone: str | None
    domain: str | None


def _ascii_lower(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).lower()


def normalize_text(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    normalized = _NON_ALNUM.sub(" ", _ascii_lower(value))
    return _SPACE.sub(" ", normalized).strip() or None


def normalize_name(value: str | None) -> str | None:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    tokens = [token for token in normalized.split() if token not in _LEGAL_SUFFIXES]
    for dotted_suffix in (("s", "r", "l"), ("s", "a", "s"), ("s", "a")):
        if tuple(tokens[-len(dotted_suffix) :]) == dotted_suffix:
            tokens = tokens[: -len(dotted_suffix)]
            break
    return " ".join(tokens) or normalized


def normalize_address(value: str | None) -> str | None:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    tokens = [_ADDRESS_REPLACEMENTS.get(token, token) for token in normalized.split()]
    return " ".join(tokens)


def normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    digits = "".join(char for char in value if char.isdigit())
    if not digits:
        return None
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("598") and len(digits) == 11:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 9:
        digits = digits[1:]
    if len(digits) == 8:
        return f"+598{digits}"
    return f"+{digits}" if 8 <= len(digits) <= 15 else None


def normalize_domain(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    candidate = value.strip()
    parsed = urlsplit(candidate if "://" in candidate else f"https://{candidate}")
    host = parsed.hostname
    if host is None:
        return None
    host = host.lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    try:
        return host.encode("idna").decode("ascii")
    except UnicodeError:
        return None


def normalize_fields(
    *, name: str | None, address: str | None, phone: str | None, website: str | None
) -> NormalizedFields:
    return NormalizedFields(
        name=normalize_name(name),
        address=normalize_address(address),
        phone=normalize_phone(phone),
        domain=normalize_domain(website),
    )
