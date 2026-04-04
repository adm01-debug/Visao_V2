import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description?: string;
  noIndex?: boolean;
}

/**
 * Reusable SEO component for all pages.
 * Adds <title> and <meta name="description"> via react-helmet-async.
 */
export function PageMeta({ title, description, noIndex }: PageMetaProps) {
  const fullTitle = `${title} | VISÃO - Vigilância Inteligente`;
  const defaultDescription = description || 'Sistema de vigilância inteligente com IA para monitoramento, alertas e análise em tempo real.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={defaultDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:type" content="website" />
    </Helmet>
  );
}
