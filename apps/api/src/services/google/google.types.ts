export interface GoogleAccountDto {
  name: string;
  accountName: string;
  type: string;
  role: string;
}

export interface GoogleLocationDto {
  name: string;
  locationName: string;
  title: string;
  address?: string;
  storeCode?: string;
  websiteUri?: string;
}

export interface SyncedReviewDto {
  googleReviewResourceName: string;
  rating: number;
  reviewText?: string;
  reviewerDisplayName?: string;
  reviewerPhotoUrl?: string;
  reviewCreatedAt: Date;
  googleUpdatedAt?: Date;
  ownerReplyText?: string;
  ownerReplyCommittedAt?: Date;
}

export interface PublishReplyResult {
  success: boolean;
  externalReplyResourceName?: string;
  publishedAt: Date;
  rawResponse?: any;
}

export interface IGoogleBusinessProfileClient {
  getAccounts(refreshToken: string): Promise<GoogleAccountDto[]>;
  getLocations(refreshToken: string, accountResourceName: string): Promise<GoogleLocationDto[]>;
  fetchReviews(refreshToken: string, locationResourceName: string): Promise<SyncedReviewDto[]>;
  publishReply(
    refreshToken: string,
    locationResourceName: string,
    reviewResourceName: string,
    replyText: string
  ): Promise<PublishReplyResult>;
}
