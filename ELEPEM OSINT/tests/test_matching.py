from app.enums import Classification, OfficialStatus
from app.matching import MatchableEntity, assess_match, distance_metres


def test_exact_phone_maps_official_status() -> None:
    candidate = MatchableEntity(name="residencial sol", phone="+59829001234")
    official = MatchableEntity(name="hogar sol", phone="+59829001234")
    result = assess_match(candidate, official, OfficialStatus.HABILITATED)
    assert result.score == 0.99
    assert result.recommendation is Classification.MATCHED_HABILITATED
    assert result.signals["phone_exact"] is True


def test_name_only_never_creates_confident_match() -> None:
    entity = MatchableEntity(name="residencial del prado")
    result = assess_match(entity, entity, OfficialStatus.HABILITATED)
    assert result.score == 0.64
    assert result.recommendation is Classification.NOT_MATCHED


def test_nearby_coordinates_are_measured() -> None:
    left = MatchableEntity(latitude=-34.9011, longitude=-56.1645)
    right = MatchableEntity(latitude=-34.9012, longitude=-56.1646)
    distance = distance_metres(left, right)
    assert distance is not None
    assert distance < 20
