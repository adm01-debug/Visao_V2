import { JsonLd, createOrganizationSchema, createWebsiteSchema } from './JsonLd';

interface StructuredDataProps {
  type: 'organization' | 'website' | 'product' | 'article';
  data: Record<string, string>;
}

export const StructuredData = ({ type, data }: StructuredDataProps) => {
  let schema: Record<string, unknown> = {};
  
  switch (type) {
    case 'organization':
      schema = createOrganizationSchema(data.name, data.url, data.logo);
      break;
    case 'website':
      schema = createWebsiteSchema(data.name, data.url);
      break;
    default:
      schema = { '@context': 'https://schema.org', '@type': type, ...data };
  }
  
  return <JsonLd data={schema} />;
};
