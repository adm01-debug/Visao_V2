import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface PageMetaProps {
  title: string;
  description?: string;
  noIndex?: boolean;
}

const APP_NAME = 'VISÃO - Vigilância Inteligente';
const DEFAULT_DESCRIPTION = 'Sistema de vigilância inteligente com IA para monitoramento, alertas e análise em tempo real.';

/**
 * Reusable SEO component for all pages.
 * Adds title, meta description, canonical URL, Open Graph and JSON-LD structured data.
 */
export function PageMeta({ title, description, noIndex }: PageMetaProps) {
  const location = useLocation();
  const fullTitle = `${title} | ${APP_NAME}`;
  const desc = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = `${window.location.origin}${location.pathname}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: APP_NAME,
    description: desc,
    url: canonicalUrl,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
    },
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
