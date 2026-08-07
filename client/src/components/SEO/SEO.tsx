import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: object;
  breadcrumbItems?: Array<{ name: string; url: string }>;
}

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://watchin.app';
const SITE_NAME = 'Watchin';
const DEFAULT_TITLE = 'Watchin — Premium Streaming for Movies, TV Shows & Anime';
const DEFAULT_DESCRIPTION = 'Stream movies, TV shows, and anime in 4K HDR. Personalized recommendations, watchlists, and seamless playback across devices.';

export function SEOPage({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = `${SITE_URL}/og-image.jpg`,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterSite = '@watchin',
  twitterCreator = '@watchin',
  noindex = false,
  nofollow = false,
  structuredData,
  breadcrumbItems,
}: SEOProps) {
  const location = useLocation();
  const pageUrl = canonical || `${SITE_URL}${location.pathname}${location.search}`;
  const fullOgTitle = ogTitle || title;
  const fullOgDescription = ogDescription || description;

  const robotsContent = `${noindex ? 'noindex' : 'index'}, ${nofollow ? 'nofollow' : 'follow'}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`;

  const breadcrumbSchema = breadcrumbItems ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  } : null;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="color-scheme" content="dark" />
        <meta name="robots" content={robotsContent} />
        <meta name="googlebot" content={robotsContent} />
        <link rel="canonical" href={pageUrl} />
        <link rel="alternate" hrefLang="en" href={pageUrl} />
        <link rel="alternate" hrefLang="x-default" href={pageUrl} />

        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={fullOgTitle} />
        <meta property="og:description" content={fullOgDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={fullOgTitle} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:site" content={twitterSite} />
        <meta name="twitter:creator" content={twitterCreator} />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={fullOgTitle} />
        <meta name="twitter:description" content={fullOgDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={fullOgTitle} />

        {structuredData && (
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        )}
        {breadcrumbSchema && (
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        )}
      </Helmet>
    </>
  );
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      'https://twitter.com/watchin',
      'https://github.com/watchin',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-WATCHIN',
      contactType: 'customer service',
      availableLanguage: 'English',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function MovieSchema(movie: {
  id: string;
  title: string;
  description?: string;
  image?: string;
  trailer?: string;
  datePublished?: string;
  duration?: string;
  director?: Array<{ name: string }>;
  actor?: Array<{ name: string }>;
  genre?: string[];
  rating?: { ratingValue: number; bestRating: number; worstRating: number; reviewCount?: number };
  contentRating?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    '@id': `${SITE_URL}/movie/${movie.id}#movie`,
    name: movie.title,
    description: movie.description,
    image: movie.image,
    trailer: movie.trailer ? { '@type': 'VideoObject', contentUrl: movie.trailer } : undefined,
    datePublished: movie.datePublished,
    duration: movie.duration,
    director: movie.director?.map(d => ({ '@type': 'Person', name: d.name })),
    actor: movie.actor?.map(a => ({ '@type': 'Person', name: a.name })),
    genre: movie.genre,
    aggregateRating: movie.rating,
    contentRating: movie.contentRating,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema, (_, v) => v === undefined ? undefined : v)}</script>
    </Helmet>
  );
}

export function TVSeriesSchema(series: {
  id: string;
  title: string;
  description?: string;
  image?: string;
  trailer?: string;
  datePublished?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  director?: Array<{ name: string }>;
  actor?: Array<{ name: string }>;
  genre?: string[];
  rating?: { ratingValue: number; bestRating: number; worstRating: number; reviewCount?: number };
  contentRating?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    '@id': `${SITE_URL}/tv/${series.id}#series`,
    name: series.title,
    description: series.description,
    image: series.image,
    trailer: series.trailer ? { '@type': 'VideoObject', contentUrl: series.trailer } : undefined,
    datePublished: series.datePublished,
    numberOfSeasons: series.numberOfSeasons,
    numberOfEpisodes: series.numberOfEpisodes,
    director: series.director?.map(d => ({ '@type': 'Person', name: d.name })),
    actor: series.actor?.map(a => ({ '@type': 'Person', name: a.name })),
    genre: series.genre,
    aggregateRating: series.rating,
    contentRating: series.contentRating,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema, (_, v) => v === undefined ? undefined : v)}</script>
    </Helmet>
  );
}

export function ItemListSchema(items: Array<{
  '@type': string;
  position: number;
  item: {
    '@type': string;
    name: string;
    url: string;
    image?: string;
  };
}>) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}