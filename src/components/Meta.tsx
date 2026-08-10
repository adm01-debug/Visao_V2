import { Helmet } from 'react-helmet-async';

interface MetaProps {
  name?: string;
  property?: string;
  content: string;
  httpEquiv?: string;
}

export const Meta = ({ name, property, content, httpEquiv }: MetaProps) => {
  return (
    <Helmet>
      {name && <meta name={name} content={content} />}
      {property && <meta property={property} content={content} />}
      {httpEquiv && <meta httpEquiv={httpEquiv} content={content} />}
    </Helmet>
  );
};
