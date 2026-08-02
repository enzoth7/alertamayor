export const REVIEW_ACTIONS: readonly string[];
export const EVIDENCE_TIERS: readonly string[];
export type CandidateReviewInput = {
  candidateId: string;
  action: string;
  status: string;
  evidenceTier: "A" | "B" | "C";
  reviewNote: string;
  matchedResidencialId: string | null;
  corrections: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
};
export function validateCandidateReviewInput(value: unknown): CandidateReviewInput;
