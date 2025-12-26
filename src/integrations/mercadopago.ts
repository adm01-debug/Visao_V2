/**
 * MercadoPago Integration
 */
class MercadoPagoIntegration {
  private accessToken = '';

  configure(accessToken: string) { this.accessToken = accessToken; }

  private async request(endpoint: string, method = 'GET', body?: any) {
    const response = await fetch(`https://api.mercadopago.com${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async createPayment(data: { transaction_amount: number; description: string; payment_method_id: string; payer: { email: string } }) {
    return this.request('/v1/payments', 'POST', data);
  }

  async createPixPayment(amount: number, email: string, description: string) {
    return this.createPayment({
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      payer: { email },
    });
  }

  async getPayment(id: string) { return this.request(`/v1/payments/${id}`); }
}

export const mercadopago = new MercadoPagoIntegration();
export default mercadopago;
