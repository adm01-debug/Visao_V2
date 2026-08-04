import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * Onda 51 — Página pública de preços.
 * SEO otimizado: title/description, JSON-LD Product, canonical, semantic H1.
 * CLS < 0.1: alturas fixas nos cards de preço.
 */
interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para começar a testar visão computacional',
    features: [
      'Até 2 câmeras',
      'Análise IA básica (Gemini)',
      '7 dias de retenção',
      'Alertas por email',
    ],
    cta: 'Começar grátis',
    href: '/auth',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 149',
    period: '/mês',
    description: 'Operações profissionais com IA avançada',
    features: [
      'Até 20 câmeras',
      'IA avançada (Gemini Pro + reconhecimento facial)',
      '90 dias de retenção',
      'Alertas Email + SMS + Telegram + Webhook',
      'ALPR (leitura de placas)',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    href: '/auth?plan=pro',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    description: 'Escala corporativa com SLA garantido',
    features: [
      'Câmeras ilimitadas',
      'SSO SAML + multi-tenant',
      'Retenção customizável',
      'API REST v1 + SDK TypeScript',
      'SLA 99.9% + suporte dedicado',
      'On-premise disponível',
    ],
    cta: 'Falar com vendas',
    href: 'mailto:vendas@visao.app',
  },
];

const FAQ = [
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim, upgrade/downgrade a qualquer momento com cobrança proporcional.',
  },
  {
    q: 'Preciso de cartão para o plano Free?',
    a: 'Não. Cadastro por email e comece imediatamente.',
  },
  {
    q: 'As gravações ficam onde?',
    a: 'Storage criptografado com signed URLs (TTL configurável até 7 dias).',
  },
  {
    q: 'Vocês são LGPD compliant?',
    a: 'Sim. Dados isolados por RLS, audit logs imutáveis, direito ao esquecimento via /perfil.',
  },
];

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'VISÃO — Vigilância com IA',
    description: 'SaaS de vigilância inteligente com IA Gemini. 3 planos: Free, Pro, Enterprise.',
    offers: TIERS.map((t) => ({
      '@type': 'Offer',
      name: t.name,
      price: t.price.replace(/\D/g, '') || '0',
      priceCurrency: 'BRL',
      description: t.description,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Preços VISÃO — Vigilância IA a partir de R$ 0/mês</title>
        <meta
          name="description"
          content="Planos VISÃO: Free (2 câmeras), Pro (R$ 149/mês, 20 câmeras + ALPR), Enterprise (ilimitado, SSO, SLA 99.9%). Sem cartão no Free."
        />
        <link rel="canonical" href="/precos" />
        <meta property="og:title" content="Preços VISÃO — Vigilância IA" />
        <meta property="og:description" content="3 planos flexíveis. Comece grátis." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-foreground">
            VISÃO
          </Link>
          <Link to="/auth" className="text-sm text-primary hover:underline">
            Entrar
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
            Preços simples e transparentes
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Escolha o plano ideal. Sem taxas ocultas. Cancele quando quiser.
          </p>
        </section>

        <section aria-label="Planos" className="mb-20 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={`flex min-h-[520px] flex-col ${tier.featured ? 'border-primary shadow-lg' : ''}`}
            >
              <CardHeader>
                {tier.featured && (
                  <div className="mb-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </div>
                )}
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="ml-1 text-muted-foreground">{tier.period}</span>
                </div>
                <CardDescription className="mt-2">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between">
                <ul className="mb-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant={tier.featured ? 'default' : 'outline'} className="w-full">
                  <a href={tier.href}>{tier.cta}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="mb-8 text-center text-3xl font-bold text-foreground">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer font-semibold text-foreground">{item.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-border bg-card py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VISÃO.{' '}
        <Link to="/docs/api" className="hover:underline">
          API
        </Link>
      </footer>
    </div>
  );
}
