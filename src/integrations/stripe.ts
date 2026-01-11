/**
 * Stripe Integration
 */
class StripeIntegration {
  private secretKey = '';

  configure(secretKey: string) { this.secretKey = secretKey; }

  private async request(endpoint: string, method = 'GET', body?: Record<string, any>) {
    const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body ? new URLSearchParams(body as Record<string, string>).toString() : undefined,
    });
    return response.json();
  }

  async createPaymentIntent(amount: number, currency = 'brl') {
    return this.request('/payment_intents', 'POST', { amount: String(amount), currency });
  }

  async createCustomer(email: string, name?: string) {
    return this.request('/customers', 'POST', { email, name });
  }

  async listPayments(limit = 10) {
    return this.request(`/payment_intents?limit=${limit}`);
  }
}

export const stripe = new StripeIntegration();
export default stripe;
