import {
  GoogleAccountDto,
  GoogleLocationDto,
  IGoogleBusinessProfileClient,
  PublishReplyResult,
  SyncedReviewDto
} from './google.types.js';

export class MockGoogleBusinessProfileClient implements IGoogleBusinessProfileClient {
  async getAccounts(_refreshToken: string): Promise<GoogleAccountDto[]> {
    return [
      {
        name: 'accounts/acc-spark-group-001',
        accountName: 'Spark Hospitality Group (US)',
        type: 'ORGANIZATION',
        role: 'OWNER'
      },
      {
        name: 'accounts/acc-spark-personal-002',
        accountName: 'Advait Ventures Test Profile',
        type: 'PERSONAL',
        role: 'PRIMARY_OWNER'
      }
    ];
  }

  async getLocations(_refreshToken: string, accountResourceName: string): Promise<GoogleLocationDto[]> {
    if (accountResourceName.includes('acc-spark-personal')) {
      return [
        {
          name: 'locations/loc-advait-hq-03',
          locationName: 'locations/loc-advait-hq-03',
          title: 'Advait Labs Tech Hub',
          address: '200 E 6th St, Austin, TX 78701',
          websiteUri: 'https://advaitlabs.com'
        }
      ];
    }

    return [
      {
        name: 'locations/loc-downtown-bistro-01',
        locationName: 'locations/loc-downtown-bistro-01',
        title: 'Spark Downtown Bistro',
        address: '400 Congress Ave, Austin, TX 78701',
        websiteUri: 'https://sparkbistro.com'
      },
      {
        name: 'locations/loc-waterfront-grill-02',
        locationName: 'locations/loc-waterfront-grill-02',
        title: 'Spark Waterfront Grill',
        address: '1000 Lady Bird Lake Way, Austin, TX 78704',
        websiteUri: 'https://sparkgrill.com'
      },
      {
        name: 'locations/loc-north-patio-04',
        locationName: 'locations/loc-north-patio-04',
        title: 'Spark North Domain Rooftop',
        address: '11501 Rock Rose Ave, Austin, TX 78758',
        websiteUri: 'https://sparkdomain.com'
      }
    ];
  }

  async fetchReviews(_refreshToken: string, locationResourceName: string): Promise<SyncedReviewDto[]> {
    // Generate simulated incoming reviews on sync
    const now = new Date();
    return [
      {
        googleReviewResourceName: `reviews/rev-sync-${Date.now()}-01`,
        rating: 5,
        reviewText: 'Tried their seasonal tasting menu yesterday. Every dish was extraordinary and beautifully plated! Kudos to the chef.',
        reviewerDisplayName: 'Rachel Green',
        reviewerPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop',
        reviewCreatedAt: new Date(now.getTime() - 1000 * 60 * 45) // 45 mins ago
      },
      {
        googleReviewResourceName: `reviews/rev-sync-${Date.now()}-02`,
        rating: 2,
        reviewText: 'The ambiance is lovely, but our reservation was delayed by 35 minutes and nobody apologized. Expected better service.',
        reviewerDisplayName: 'Thomas Wright',
        reviewerPhotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop',
        reviewCreatedAt: new Date(now.getTime() - 1000 * 60 * 120) // 2 hours ago
      }
    ];
  }

  async publishReply(
    _refreshToken: string,
    locationResourceName: string,
    reviewResourceName: string,
    replyText: string
  ): Promise<PublishReplyResult> {
    console.log(`[MockGBP] Publishing reply to ${reviewResourceName} at ${locationResourceName}: "${replyText}"`);
    // Simulate slight API latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      externalReplyResourceName: `${reviewResourceName}/reply`,
      publishedAt: new Date(),
      rawResponse: {
        updateTime: new Date().toISOString(),
        comment: replyText
      }
    };
  }
}
