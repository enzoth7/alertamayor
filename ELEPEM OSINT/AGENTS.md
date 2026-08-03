# Uruguay ELEPEM OSINT

## Purpose

Discover publicly advertised long-term care facilities in Uruguay and compare
them with authoritative government records.

The system supports safeguarding triage. It does not determine that abuse,
mistreatment, illegality, or regulatory non-compliance occurred.

## Required classifications

- MATCHED_HABILITATED
- MATCHED_IN_PROCESS
- POSSIBLE_MATCH
- NOT_MATCHED
- INSUFFICIENT_INFORMATION
- HUMAN_REVIEW_REQUIRED

Never automatically classify a facility as:

- illegal
- abusive
- guilty
- fraudulent
- unregistered

"Not matched" means only that no sufficiently confident match was located in
the official datasets available on the recorded date.

## Collection boundaries

- Use official APIs and public web-search results.
- Do not access private accounts or private groups.
- Do not automate authenticated Facebook or Instagram sessions.
- Do not bypass rate limits, CAPTCHAs, or access controls.
- Do not identify residents from photographs.
- Do not perform face recognition.
- Store every source URL, search query, and retrieval timestamp.
- Require human approval before referrals or publication.