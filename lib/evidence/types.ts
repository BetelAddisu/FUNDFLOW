export type EvidenceState =
  | 'self_reported'
  | 'inferred'
  | 'document_supported'
  | 'visually_observed'
  | 'verified'
  | 'not_established'
  | 'contradicted';

export interface EvidenceField {
  state: EvidenceState;
  value?: unknown;
  confidence?: number;
  source?: string;
  notes?: string;
}

/** Flat dot-path evidence map used internally by the session service */
export interface FlatEvidenceItem {
  value: unknown;
  state: EvidenceState;
  confidence: number;
  notes?: string;
  isApproximate?: boolean;
  timestamp: number;
  originalText?: string;
  sourceField?: string; // for inferred values: which field(s) it was inferred from
}

export type FlatEvidence = Record<string, FlatEvidenceItem>;