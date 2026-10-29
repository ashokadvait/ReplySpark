import { ENV } from '../../config/env.js';
import {
  GoogleAccountDto,
  GoogleLocationDto,
  IGoogleBusinessProfileClient,
  PublishReplyResult,
  SyncedReviewDto
} from './google.types.js';

export class LiveGoogleBusinessProfileClient implements IGoogleBusinessProfileClient {
  private baseAccountUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1';
  private baseBusinessInfoUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1';
  private baseReviewsUrl = 'https://mybusiness.googleapis.com/v4';

  private async getAccessToken(refreshToken: string): Promise<string> {
    const clientId = ENV.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = ENV.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to refresh Google access token: ${err}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private parseGoogleError(status: number, errText: string): string {
    try {
      const json = JSON.parse(errText);
      if (json.error?.code === 429 && errText.includes('DefaultRequestsPerMinutePerProject')) {
        return 'Google Business Profile API quota is 0. Google sets newly enabled GBP APIs to 0 quota until the project is approved via the Google Business Profile API Access Request form. Please submit the access request in Google Cloud.';
      }
      if (json.error?.message) {
        return json.error.message;
      }
    } catch {}
    return errText;
  }

  async getAccounts(refreshToken: string): Promise<GoogleAccountDto[]> {
    const accessToken = await this.getAccessToken(refreshToken);
    const res = await fetch(`${this.baseAccountUrl}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google GBP Accounts error: ${this.parseGoogleError(res.status, errText)}`);
    }

    const data = await res.json();
    return (data.accounts || []).map((acc: any) => ({
      name: acc.name,
      accountName: acc.accountName,
      type: acc.type,
      role: acc.role
    }));
  }

  async getLocations(refreshToken: string, accountResourceName: string): Promise<GoogleLocationDto[]> {
    const accessToken = await this.getAccessToken(refreshToken);
    const readMask = 'name,title,storefrontAddress,websiteUri';
    const res = await fetch(
      `${this.baseBusinessInfoUrl}/${accountResourceName}/locations?readMask=${readMask}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google GBP Locations error: ${this.parseGoogleError(res.status, errText)}`);
    }

    const data = await res.json();
    return (data.locations || []).map((loc: any) => ({
      name: loc.name,
      locationName: loc.name,
      title: loc.title,
      address: loc.storefrontAddress?.addressLines?.join(', '),
      websiteUri: loc.websiteUri
    }));
  }

  async fetchReviews(refreshToken: string, locationResourceName: string): Promise<SyncedReviewDto[]> {
    const accessToken = await this.getAccessToken(refreshToken);
    const res = await fetch(`${this.baseReviewsUrl}/${locationResourceName}/reviews`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Google GBP Reviews error: ${await res.text()}`);
    }

    const data = await res.json();
    return (data.reviews || []).map((rev: any) => ({
      googleReviewResourceName: rev.name,
      rating: this.mapGoogleRating(rev.starRating),
      reviewText: rev.comment,
      reviewerDisplayName: rev.reviewer?.displayName,
      reviewerPhotoUrl: rev.reviewer?.profilePhotoUrl,
      reviewCreatedAt: new Date(rev.createTime),
      googleUpdatedAt: rev.updateTime ? new Date(rev.updateTime) : undefined,
      ownerReplyText: rev.reviewReply?.comment,
      ownerReplyCommittedAt: rev.reviewReply?.updateTime ? new Date(rev.reviewReply.updateTime) : undefined
    }));
  }

  async publishReply(
    refreshToken: string,
    locationResourceName: string,
    reviewResourceName: string,
    replyText: string
  ): Promise<PublishReplyResult> {
    const accessToken = await this.getAccessToken(refreshToken);
    const res = await fetch(
      `${this.baseReviewsUrl}/${reviewResourceName}/reply`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: replyText })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google GBP Reply publication error: ${err}`);
    }

    const data = await res.json();
    return {
      success: true,
      externalReplyResourceName: `${reviewResourceName}/reply`,
      publishedAt: new Date(data.updateTime || Date.now()),
      rawResponse: data
    };
  }

  private mapGoogleRating(ratingStr: string): number {
    switch (ratingStr) {
      case 'ONE': return 1;
      case 'TWO': return 2;
      case 'THREE': return 3;
      case 'FOUR': return 4;
      case 'FIVE': return 5;
      default: return 5;
    }
  }
}
