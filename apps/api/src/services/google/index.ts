import { ENV } from '../../config/env.js';
import { IGoogleBusinessProfileClient } from './google.types.js';
import { LiveGoogleBusinessProfileClient } from './live.google.client.js';
import { MockGoogleBusinessProfileClient } from './mock.google.client.js';

export * from './google.types.js';

export function getGoogleBusinessProfileClient(): IGoogleBusinessProfileClient {
  if (ENV.GOOGLE_PROVIDER_MODE === 'live' && ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET) {
    return new LiveGoogleBusinessProfileClient();
  }
  return new MockGoogleBusinessProfileClient();
}
