import math
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any

from app.enums import Classification, OfficialStatus


@dataclass(frozen=True, slots=True)
class MatchableEntity:
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    domain: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@dataclass(frozen=True, slots=True)
class MatchAssessment:
    score: float
    signals: dict[str, Any]
    recommendation: Classification


def text_similarity(left: str | None, right: str | None) -> float | None:
    if not left or not right:
        return None
    return SequenceMatcher(None, left, right).ratio()


def distance_metres(left: MatchableEntity, right: MatchableEntity) -> float | None:
    if None in (left.latitude, left.longitude, right.latitude, right.longitude):
        return None
    assert left.latitude is not None
    assert left.longitude is not None
    assert right.latitude is not None
    assert right.longitude is not None
    radius = 6_371_000.0
    lat1, lat2 = math.radians(left.latitude), math.radians(right.latitude)
    delta_lat = math.radians(right.latitude - left.latitude)
    delta_lon = math.radians(right.longitude - left.longitude)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _status_classification(status: OfficialStatus) -> Classification:
    if status is OfficialStatus.HABILITATED:
        return Classification.MATCHED_HABILITATED
    if status is OfficialStatus.IN_PROCESS:
        return Classification.MATCHED_IN_PROCESS
    return Classification.POSSIBLE_MATCH


def assess_match(
    candidate: MatchableEntity,
    official: MatchableEntity,
    official_status: OfficialStatus,
) -> MatchAssessment:
    phone_exact = bool(candidate.phone and candidate.phone == official.phone)
    domain_exact = bool(candidate.domain and candidate.domain == official.domain)
    name_score = text_similarity(candidate.name, official.name)
    address_score = text_similarity(candidate.address, official.address)
    distance = distance_metres(candidate, official)

    coordinate_score: float | None = None
    if distance is not None:
        if distance <= 100:
            coordinate_score = 1.0
        elif distance <= 500:
            coordinate_score = 0.8
        elif distance <= 2_000:
            coordinate_score = 0.4
        else:
            coordinate_score = 0.0

    comparable: list[tuple[float, float]] = []
    if name_score is not None:
        comparable.append((name_score, 0.38))
    if address_score is not None:
        comparable.append((address_score, 0.34))
    if coordinate_score is not None:
        comparable.append((coordinate_score, 0.28))
    weighted = (
        sum(value * weight for value, weight in comparable)
        / sum(weight for _, weight in comparable)
        if comparable
        else 0.0
    )

    if phone_exact:
        score = max(weighted, 0.99)
    elif domain_exact:
        score = max(weighted, 0.97)
    elif len(comparable) == 1:
        score = min(weighted, 0.64)
    else:
        score = weighted

    strong_combination = len(comparable) >= 2 and score >= 0.9
    if phone_exact or domain_exact or strong_combination:
        recommendation = _status_classification(official_status)
    elif score >= 0.72:
        recommendation = Classification.POSSIBLE_MATCH
    else:
        recommendation = Classification.NOT_MATCHED

    signals: dict[str, Any] = {
        "phone_exact": phone_exact,
        "domain_exact": domain_exact,
        "name_similarity": round(name_score, 4) if name_score is not None else None,
        "address_similarity": round(address_score, 4) if address_score is not None else None,
        "distance_metres": round(distance, 1) if distance is not None else None,
    }
    return MatchAssessment(round(score, 4), signals, recommendation)


def has_minimum_matching_information(entity: MatchableEntity) -> bool:
    direct = bool(entity.phone or entity.domain)
    corroborating = (
        sum(
            value is not None
            for value in (entity.name, entity.address, entity.latitude, entity.longitude)
        )
        >= 2
    )
    return direct or corroborating
