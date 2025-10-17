import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

export function SEO({
  title = 'fxns - shortcuts that work',
  description = 'Simplify everyday tasks with powerful micro-tools. From calculations to conversions, find the shortcut you need in seconds.',
  canonicalUrl = 'https://www.fxns.ca/',
  ogImage = 'https://www.fxns.ca/og-image.jpg',
  ogType = 'website',
  noIndex = false,
}: SEOProps) {
  const fullTitle = title.includes('fxns') ? title : `${title} | fxns`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
