import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Página pública de documentação da API REST v1.
 * Renderiza o OpenAPI 3.1 spec via Swagger UI carregado sob demanda (CDN).
 * Origem: Onda 43 do plano consolidado.
 */
export default function ApiDocsPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Carrega Swagger UI via CDN para não pesar o bundle principal.
    const cssId = 'swagger-ui-css';
    const jsId = 'swagger-ui-bundle';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
      script.onload = () => setReady(true);
      document.body.appendChild(script);
    } else {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const globalWithSwagger = window as unknown as {
      SwaggerUIBundle?: (config: Record<string, unknown>) => unknown;
    };
    if (globalWithSwagger.SwaggerUIBundle) {
      globalWithSwagger.SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
      });
    }
  }, [ready]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>VISÃO — API REST v1</title>
        <meta
          name="description"
          content="Documentação interativa da API REST pública do VISÃO (v1)."
        />
      </Helmet>
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">VISÃO API v1</h1>
        <p className="text-sm text-muted-foreground">
          API REST pública read-only. Autenticação via Bearer JWT.
        </p>
      </header>
      <div id="swagger-ui" className="p-4" />
      {!ready && <p className="p-6 text-center text-muted-foreground">Carregando documentação…</p>}
    </div>
  );
}
