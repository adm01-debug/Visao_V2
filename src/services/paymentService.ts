/**
 * Payment Service
 * Payment processing abstraction
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'pix' | 'boleto';
  last4?: string;
  brand?: string;
}

class PaymentService {
  private provider: 'stripe' | 'mercadopago' = 'stripe';
  private apiKey = '';

  configure(options: { provider?: 'stripe' | 'mercadopago'; apiKey: string }) {
    if (options.provider) this.provider = options.provider;
    this.apiKey = options.apiKey;
  }

  async createPaymentIntent(amount: number, currency = 'brl'): Promise<PaymentIntent> {
    // Abstracted - implement with actual provider
    return { id: `pi_${Date.now()}`, amount, currency, status: 'pending' };
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    return { id: paymentIntentId, amount: 0, currency: 'brl', status: 'succeeded' };
  }

  async createPixPayment(amount: number): Promise<{ qrCode: string; expiresAt: Date }> {
    return { qrCode: 'mock_qr_code', expiresAt: new Date(Date.now() + 3600000) };
  }

  async createBoleto(amount: number, dueDate: Date): Promise<{ barcode: string; url: string }> {
    return { barcode: '00000.00000 00000.000000 00000.000000 0 00000000000000', url: '#' };
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentIntent['status']> {
    return 'succeeded';
  }
}

export const paymentService = new PaymentService();
export default paymentService;
