export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
  STAFF = 'STAFF'
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED'
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR'
}

export enum WorkflowStatus {
  SYNCED = 'SYNCED',
  DRAFT_PENDING = 'DRAFT_PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REGENERATING = 'REGENERATING',
  PUBLISH_QUEUED = 'PUBLISH_QUEUED',
  PUBLISHED = 'PUBLISHED',
  PUBLISH_FAILED = 'PUBLISH_FAILED'
}

export enum QualityStatus {
  PASSED = 'PASSED',
  FLAGGED_WARNING = 'FLAGGED_WARNING',
  ESCALATED = 'ESCALATED'
}

export enum FeedbackCategory {
  WRONG_TONE = 'WRONG_TONE',
  TOO_GENERIC = 'TOO_GENERIC',
  TOO_LONG = 'TOO_LONG',
  TOO_SHORT = 'TOO_SHORT',
  REPEATS_CUSTOMER = 'REPEATS_CUSTOMER',
  UNSUPPORTED_PROMISE = 'UNSUPPORTED_PROMISE',
  MISSES_COMPLAINT = 'MISSES_COMPLAINT',
  INCORRECT_INFO = 'INCORRECT_INFO',
  UNWANTED_WORDING = 'UNWANTED_WORDING',
  OTHER = 'OTHER'
}

export enum PreferenceScope {
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  ONE_TIME = 'ONE_TIME'
}

export enum PreferenceStatus {
  CANDIDATE = 'CANDIDATE',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  REJECTED = 'REJECTED'
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ReviewFilterParams {
  locationId?: string;
  status?: WorkflowStatus;
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AIDraftResult {
  replyText: string;
  rationale?: string;
  qualityStatus: QualityStatus;
  qualityNotes?: string[];
  suggestedEscalation: boolean;
  modelProvider: string;
  modelName: string;
  promptVersion: string;
}

export interface CandidatePreferenceExtraction {
  ruleText: string;
  ruleCategory: string;
  scope: PreferenceScope;
  confidence: number;
}
