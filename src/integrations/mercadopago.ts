// MercadoPago Integration - Projeto VISÃO
// Integração com MercadoPago com tipagem forte

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey?: string;
  sandbox?: boolean;
}

export type PaymentStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'account_money';

export interface PaymentItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
}

export interface Payer {
  email: string;
  firstName?: string;
  lastName?: string;
  identification?: {
    type: 'CPF' | 'CNPJ';
    number: string;
  };
  phone?: {
    areaCode: string;
    number: string;
  };
  address?: {
    zipCode: string;
    streetName: string;
    streetNumber: number;
  };
}

export interface CreatePaymentParams {
  items: PaymentItem[];
  payer: Payer;
  paymentMethod?: PaymentMethod;
  installments?: number;
  externalReference?: string;
  notificationUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
  paymentTypeId: string;
  installments: number;
  externalReference?: string;
  dateCreated: string;
  dateApproved?: string;
  payer: Payer;
}

export interface CreatePreferenceParams {
  items: PaymentItem[];
  payer?: Partial<Payer>;
  backUrls?: {
    success: string;
    failure: string;
    pending: string;
  };
  autoReturn?: 'approved' | 'all';
  externalReference?: string;
  notificationUrl?: string;
  expires?: boolean;
  expirationDateFrom?: string;
  expirationDateTo?: string;
}

export interface Preference {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
  items: PaymentItem[];
  payer?: Payer;
  externalReference?: string;
  dateCreated: string;
}

export interface MercadoPagoClient {
  createPayment: (params: CreatePaymentParams) => Promise<Payment>;
  getPayment: (paymentId: string) => Promise<Payment>;
  createPreference: (params: CreatePreferenceParams) => Promise<Preference>;
  cancelPayment: (paymentId: string) => Promise<Payment>;
  refundPayment: (paymentId: string, amount?: number) => Promise<Payment>;
}

export const createMercadoPagoClient = (config: MercadoPagoConfig): MercadoPagoClient => {
  const baseUrl = config.sandbox
    ? 'https://api.mercadopago.com/sandbox'
    : 'https://api.mercadopago.com';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.accessToken}`,
  };

  return {
    createPayment: async (params) => {
      const response = await fetch(`${baseUrl}/v1/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_amount: params.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
          payment_method_id: params.paymentMethod,
          installments: params.installments || 1,
          payer: { email: params.payer.email },
          external_reference: params.externalReference,
          notification_url: params.notificationUrl,
          metadata: params.metadata,
        }),
      });
      return response.json();
    },

    getPayment: async (paymentId) => {
      const response = await fetch(`${baseUrl}/v1/payments/${paymentId}`, { headers });
      return response.json();
    },

    createPreference: async (params) => {
      const response = await fetch(`${baseUrl}/checkout/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: params.items.map(i => ({
            id: i.id,
            title: i.title,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            currency_id: i.currencyId || 'BRL',
          })),
          payer: params.payer,
          back_urls: params.backUrls,
          auto_return: params.autoReturn,
          external_reference: params.externalReference,
          notification_url: params.notificationUrl,
        }),
      });
      return response.json();
    },

    cancelPayment: async (paymentId) => {
      const response = await fetch(`${baseUrl}/v1/payments/${paymentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'cancelled' }),
      });
      return response.json();
    },

    refundPayment: async (paymentId, amount) => {
      const body = amount ? { amount } : {};
      const response = await fetch(`${baseUrl}/v1/payments/${paymentId}/refunds`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      return response.json();
    },
  };
};

export default createMercadoPagoClient;
