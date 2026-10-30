const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiClient {
  public static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('replyspark_token');
  }

  public static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('replyspark_token', token);
    }
  }

  public static getSelectedOrgId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('replyspark_org_id');
  }

  public static setSelectedOrgId(orgId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('replyspark_org_id', orgId);
    }
  }

  public static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const orgId = this.getSelectedOrgId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'API request failed');
    }

    return res.json();
  }

  // Auth methods
  public static async login(email: string, password: string) {
    const data = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) this.setToken(data.token);
    if (data.organization?.id) this.setSelectedOrgId(data.organization.id);
    return data;
  }

  public static async register(email: string, password: string, displayName: string, organizationName: string) {
    const data = await this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, organizationName })
    });
    if (data.token) this.setToken(data.token);
    if (data.organization?.id) this.setSelectedOrgId(data.organization.id);
    return data;
  }

  public static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('replyspark_token');
      localStorage.removeItem('replyspark_org_id');
    }
  }

  public static async getMe() {
    return this.request('/api/v1/auth/me');
  }

  public static async getGoogleLoginUrl() {
    return this.request<{ url: string }>('/api/v1/auth/google/url');
  }

  // Reviews
  public static async getReviews(params: {
    status?: string;
    locationId?: string;
    rating?: number;
    search?: string;
    page?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.locationId && params.locationId !== 'ALL') query.set('locationId', params.locationId);
    if (params.rating) query.set('rating', params.rating.toString());
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());

    return this.request(`/api/v1/reviews?${query.toString()}`);
  }

  public static async generateDraft(reviewId: string) {
    return this.request(`/api/v1/reviews/${reviewId}/generate`, { method: 'POST', body: JSON.stringify({}) });
  }

  public static async regenerateDraft(reviewId: string) {
    return this.request(`/api/v1/reviews/${reviewId}/regenerate`, { method: 'POST', body: JSON.stringify({}) });
  }

  public static async updateDraft(draftId: string, replyText: string) {
    return this.request(`/api/v1/reply-drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ replyText })
    });
  }

  public static async approveDraft(draftId: string, replyText: string) {
    return this.request(`/api/v1/reply-drafts/${draftId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ replyText, autoPublish: true })
    });
  }

  public static async rejectDraft(draftId: string, reason?: string) {
    return this.request(`/api/v1/reply-drafts/${draftId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  public static async submitFeedback(data: {
    draftId: string;
    category: string;
    feedbackText?: string;
    correctedText?: string;
    scope?: string;
    teachAI?: boolean;
  }) {
    return this.request(`/api/v1/reviews/feedback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Google & Locations
  public static async getGoogleStatus() {
    return this.request('/api/v1/google/status');
  }

  public static async getGoogleOAuthUrl() {
    return this.request<{ url: string }>('/api/v1/google/oauth/url');
  }

  // Organizations
  public static async getOrganizations() {
    return this.request<{ organizations: Array<{ id: string; name: string; role: string; locationsCount: number; reviewsCount: number; isCurrent: boolean }> }>('/api/v1/organizations');
  }

  public static async createOrganization(name: string) {
    return this.request<{ organization: { id: string; name: string; role: string } }>('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  // Locations & Google
  public static async getLocations() {
    return this.request('/api/v1/organizations/locations');
  }

  public static async getDiscoverableLocations() {
    return this.request('/api/v1/google/locations');
  }

  public static async connectLocations(googleConnectionId: string, locations: any[]) {
    return this.request('/api/v1/google/connect-locations', {
      method: 'POST',
      body: JSON.stringify({ googleConnectionId, locations })
    });
  }

  public static async syncReviews(locationId?: string) {
    return this.request('/api/v1/sync', {
      method: 'POST',
      body: JSON.stringify({ locationId })
    });
  }

  // Preferences
  public static async getPreferences() {
    return this.request('/api/v1/preferences');
  }

  public static async approvePreference(id: string) {
    return this.request(`/api/v1/preferences/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
  }

  public static async disablePreference(id: string) {
    return this.request(`/api/v1/preferences/${id}/disable`, { method: 'POST', body: JSON.stringify({}) });
  }

  public static async createPreference(ruleText: string, ruleCategory = 'TONE_STYLE') {
    return this.request('/api/v1/preferences', {
      method: 'POST',
      body: JSON.stringify({ ruleText, ruleCategory })
    });
  }

  // Audit Logs
  public static async getAuditLogs() {
    return this.request('/api/v1/audit-logs');
  }
}
