import { AIDraftResult, CandidatePreferenceExtraction, PreferenceScope } from '@replyspark/shared';

export interface ActivePreferenceRule {
  ruleText: string;
  ruleCategory: string;
  scope?: PreferenceScope;
}

export interface ReplyGenerationContext {
  rating: number;
  reviewText?: string | null;
  reviewerDisplayName?: string | null;
  businessName: string;
  locationName: string;
  address?: string | null;
  activePreferences: ActivePreferenceRule[];
}

export interface FeedbackContext {
  feedbackCategory: string;
  feedbackText?: string | null;
  originalGeneratedText: string;
  finalEditedText?: string | null;
  rating: number;
  businessName: string;
}

export interface IAIProvider {
  generateReply(context: ReplyGenerationContext): Promise<AIDraftResult>;
  extractCandidatePreference(context: FeedbackContext): Promise<CandidatePreferenceExtraction | null>;
}
