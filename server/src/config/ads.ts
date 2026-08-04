export interface AdZone {
  id: string;
  name: string;
  description: string;
  sizes: string;
  defaultEnabled: boolean;
}

/**
 * Every ad location on the platform. Admins can enable/disable each one
 * individually. The client renders an AdSlot per zone; enabled zones receive
 * an injected ad container (AdSense / direct / affiliate).
 */
export const AD_ZONES: AdZone[] = [
  { id: 'hero', name: 'Homepage Hero', description: 'Under the hero banner on the home page', sizes: '970x250 · 728x90', defaultEnabled: false },
  { id: 'homepage_below_hero', name: 'Home Below Hero', description: 'Inline banner after the hero section', sizes: '970x250 · 728x90', defaultEnabled: false },
  { id: 'homepage_row', name: 'Home Rows Interstitial', description: 'Between recommendation rows', sizes: '728x90 · 468x60', defaultEnabled: false },
  { id: 'detail_top', name: 'Movie Detail Top', description: 'Above the movie info card', sizes: '970x250 · 728x90', defaultEnabled: false },
  { id: 'detail_sidebar', name: 'Movie Detail Sidebar', description: 'Right rail on detail pages', sizes: '300x250 · 336x280', defaultEnabled: false },
  { id: 'search_top', name: 'Search Top', description: 'Above search results', sizes: '970x250 · 728x90', defaultEnabled: false },
  { id: 'search_sidebar', name: 'Search Sidebar', description: 'Beside the filter panel', sizes: '300x250', defaultEnabled: false },
  { id: 'watch_preroll', name: 'Video Pre-roll', description: 'Before playback starts', sizes: 'Overlay 16:9', defaultEnabled: false },
  { id: 'watch_midroll', name: 'Video Mid-roll', description: 'During playback', sizes: 'Overlay 16:9', defaultEnabled: false },
  { id: 'footer', name: 'Footer Banner', description: 'Above the site footer', sizes: '728x90 · 468x60', defaultEnabled: false },
  { id: 'sticky', name: 'Sticky Bottom', description: 'Floating banner pinned to the bottom', sizes: '468x60 · 320x50', defaultEnabled: false },
  { id: 'sponsored', name: 'Sponsored Movies', description: 'Featured badge on sponsored titles', sizes: 'Card badge', defaultEnabled: false },
  { id: 'native', name: 'Native In-feed', description: 'Sponsored cards in content rows', sizes: 'Card 16:9', defaultEnabled: false },
];

export const AD_ZONE_KEYS = AD_ZONES.map((z) => `ad_zone.${z.id}`);
export const AD_GROUP = 'ads';
