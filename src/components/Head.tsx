import { Helmet } from 'react-helmet-async';
import { ReactNode } from 'react';

interface HeadProps {
  children?: ReactNode;
}

export const Head = ({ children }: HeadProps) => {
  return (
    <Helmet>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {/* eslint-disable-next-line visao/no-hardcoded-colors -- meta theme-color exige hex literal */}
      <meta name="theme-color" content="#1a1a2e" />
      <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      {children}
    </Helmet>
  );
};
