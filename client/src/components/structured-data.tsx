import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  type: 'Organization';
}

interface WebSiteSchemaProps {
  type: 'WebSite';
  searchUrl?: string;
}

interface SoftwareApplicationSchemaProps {
  type: 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  category: string;
  ratingValue?: number;
  ratingCount?: number;
}

type StructuredDataProps = OrganizationSchemaProps | WebSiteSchemaProps | SoftwareApplicationSchemaProps;

export function StructuredData(props: StructuredDataProps) {
  const getSchema = () => {
    switch (props.type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'fxns',
          url: 'https://www.fxns.ca',
          logo: 'https://www.fxns.ca/icon-512.png',
          description: 'The Life Shortcuts Platform - Simplify everyday tasks with powerful micro-tools',
          sameAs: []
        };

      case 'WebSite':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'fxns',
          url: 'https://www.fxns.ca',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: props.searchUrl || 'https://www.fxns.ca/explore?q={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
          }
        };

      case 'SoftwareApplication':
        const appSchema: any = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: props.name,
          description: props.description,
          url: props.url,
          applicationCategory: props.category,
          operatingSystem: 'Web Browser',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          }
        };

        if (props.ratingValue && props.ratingCount) {
          appSchema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: props.ratingValue,
            ratingCount: props.ratingCount
          };
        }

        return appSchema;

      default:
        return null;
    }
  };

  const schema = getSchema();
  if (!schema) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
