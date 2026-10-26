import {
  AIDraftResult,
  CandidatePreferenceExtraction,
  FeedbackCategory,
  PreferenceScope,
  QualityStatus
} from '@replyspark/shared';
import { FeedbackContext, IAIProvider, ReplyGenerationContext } from './ai.types.js';

export class MockAIProvider implements IAIProvider {
  async generateReply(context: ReplyGenerationContext): Promise<AIDraftResult> {
    const { rating, reviewText, reviewerDisplayName, businessName, locationName, activePreferences } = context;
    const nameGreeting = reviewerDisplayName && reviewerDisplayName !== 'Anonymous' ? `${reviewerDisplayName}` : 'there';
    const textLower = (reviewText || '').toLowerCase();

    // Check for escalation flags (legal, safety, food poisoning, discrimination)
    const hasLegalOrSafety = textLower.includes('lawyer') ||
      textLower.includes('sue') ||
      textLower.includes('poison') ||
      textLower.includes('hospital') ||
      textLower.includes('discrimination');

    if (hasLegalOrSafety) {
      return {
        replyText: `Hello ${nameGreeting}, we take this matter very seriously. Please contact our leadership directly at support@${businessName.toLowerCase().replace(/\s+/g, '')}.com so we can address your concerns immediately.`,
        rationale: 'Review contains serious safety, medical, or legal concern. Escalated for direct executive handling.',
        qualityStatus: QualityStatus.ESCALATED,
        qualityNotes: ['Escalation triggered by safety/legal keyword match.'],
        suggestedEscalation: true,
        modelProvider: 'heuristic-rules-engine',
        modelName: 'safety-guard-v1',
        promptVersion: 'v1.0'
      };
    }

    let replyText = '';
    let qualityStatus = QualityStatus.PASSED;
    let rationale = 'Draft generated following brand tone and safety rules.';
    const qualityNotes: string[] = [];

    if (rating >= 4) {
      // Positive reviews
      if (textLower.includes('food') || textLower.includes('delicious') || textLower.includes('risotto') || textLower.includes('dish')) {
        replyText = `Thank you so much for the wonderful review, ${nameGreeting}! We are thrilled that you enjoyed our culinary offerings at ${locationName}. Our kitchen team takes immense pride in crafting memorable dishes, and we can't wait to welcome you back again soon!`;
      } else if (textLower.includes('view') || textLower.includes('atmosphere') || textLower.includes('music') || textLower.includes('sunset')) {
        replyText = `Thank you for the fantastic feedback, ${nameGreeting}! We are delighted that you had a great time soaking in the ambiance at ${locationName}. We appreciate your support and look forward to hosting you for your next visit!`;
      } else {
        replyText = `Thank you for sharing your experience with us, ${nameGreeting}! We are so glad our team at ${locationName} delivered a great visit. We hope to see you again soon!`;
      }
    } else if (rating === 3) {
      // Neutral reviews
      if (!reviewText) {
        replyText = `Thank you for rating ${locationName}, ${nameGreeting}. We are always working to improve our guest experience and would love to hear what could have made your visit 5 stars. Please feel free to share your thoughts with us at feedback@${businessName.toLowerCase().replace(/\s+/g, '')}.com!`;
        rationale = 'No review text provided. Invited guest to share feedback constructively.';
      } else {
        replyText = `Thank you for taking the time to share your balanced feedback, ${nameGreeting}. We appreciate you pointing out what we did well as well as where we can improve. Your insights help us elevate our service at ${locationName}.`;
      }
    } else {
      // Negative reviews (1 or 2 stars)
      qualityStatus = QualityStatus.FLAGGED_WARNING;
      rationale = 'Complaint review. Acknowledged issue respectfully without making unauthorized public refund promises.';
      qualityNotes.push('Checked against policy: no public monetary compensation promised.');

      if (textLower.includes('wait') || textLower.includes('delay') || textLower.includes('slow')) {
        replyText = `Hello ${nameGreeting}, thank you for your candid feedback. We deeply apologize for the extended wait time and service delays you experienced at ${locationName}. This is not indicative of our typical standards, and our management team would appreciate the opportunity to speak with you directly at manager@${businessName.toLowerCase().replace(/\s+/g, '')}.com.`;
      } else if (textLower.includes('cold') || textLower.includes('food') || textLower.includes('taste')) {
        replyText = `Hello ${nameGreeting}, we are genuinely sorry to hear that the quality and temperature of your meal fell short during your visit to ${locationName}. We hold our culinary team to high standards, and we would welcome the chance to learn more and make things right if you could reach out to us at support@${businessName.toLowerCase().replace(/\s+/g, '')}.com.`;
      } else {
        replyText = `Hello ${nameGreeting}, thank you for bringing this to our attention. We are truly sorry that your experience at ${locationName} did not meet expectations. Please reach out to our team at support@${businessName.toLowerCase().replace(/\s+/g, '')}.com so we can investigate and address your concerns directly.`;
      }
    }

    // Check conciseness preference if active
    const concisenessPref = activePreferences.find(p => p.ruleCategory === 'CONCISENESS');
    if (concisenessPref) {
      qualityNotes.push('Applied active rule: concise 2-3 sentence structure.');
    }

    return {
      replyText,
      rationale,
      qualityStatus,
      qualityNotes,
      suggestedEscalation: false,
      modelProvider: 'heuristic-ai',
      modelName: 'replyspark-draft-v1',
      promptVersion: 'v1.0'
    };
  }

  async extractCandidatePreference(context: FeedbackContext): Promise<CandidatePreferenceExtraction | null> {
    const { feedbackCategory, feedbackText, finalEditedText, businessName } = context;

    if (feedbackCategory === FeedbackCategory.WRONG_TONE) {
      return {
        ruleText: `Adopt a more empathetic and conversational tone; avoid stiff or overly corporate phrases for ${businessName}.`,
        ruleCategory: 'TONE_STYLE',
        scope: PreferenceScope.ORGANIZATION,
        confidence: 0.88
      };
    }

    if (feedbackCategory === FeedbackCategory.TOO_LONG) {
      return {
        ruleText: 'Limit replies to maximum 2 sentences for high-efficiency guest responses.',
        ruleCategory: 'CONCISENESS',
        scope: PreferenceScope.ORGANIZATION,
        confidence: 0.92
      };
    }

    if (feedbackCategory === FeedbackCategory.UNSUPPORTED_PROMISE) {
      return {
        ruleText: 'Never promise refunds, discounts, or complimentary items in public review responses.',
        ruleCategory: 'POLICY_SAFETY',
        scope: PreferenceScope.ORGANIZATION,
        confidence: 0.95
      };
    }

    if (feedbackText && feedbackText.trim().length > 10) {
      return {
        ruleText: feedbackText.trim(),
        ruleCategory: 'CUSTOM_PREFERENCE',
        scope: PreferenceScope.ORGANIZATION,
        confidence: 0.85
      };
    }

    return null;
  }
}
