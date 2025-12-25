import { Helmet } from 'react-helmet-async';

interface TwitterCardProps {
  title: string;
  description: string;
  image?: string;
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
}

export const TwitterCard = ({ title, description, image, card = 'summary_large_image', site, creator }: TwitterCardProps) => {
  return (
    <Helmet>
      <meta name="twitter:card" content={card} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {site && <meta name="twitter:site" content={site} />}
      {creator && <meta name="twitter:creator" content={creator} />}
    </Helmet>
  );
};
