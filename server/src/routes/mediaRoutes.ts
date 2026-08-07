import { Router } from 'express';
import { mediaController } from '../controllers/mediaController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public list endpoints return the same payload for guests and signed-in users
// (real video URLs are stripped), so they can be cached by the browser/proxies.
function publicCache(_req: any, res: any, next: any) {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=120');
  next();
}

router.get('/', publicCache, optionalAuth, mediaController.getMediaList);
router.get('/browse', publicCache, mediaController.searchAndFilter);
router.get('/latest', publicCache, mediaController.getLatestMedia);
router.get('/upcoming', publicCache, mediaController.getUpcoming);
router.get('/popular', publicCache, mediaController.getPopular);
router.get('/genre/:genreSlug', publicCache, mediaController.getByGenre);
router.get('/recommended', publicCache, optionalAuth, mediaController.getRecommended);
router.get('/recently-watched', optionalAuth, mediaController.getRecentlyWatched);
router.get('/trending', publicCache, mediaController.getTrending);
router.get('/top-rated', publicCache, mediaController.getTopRated);
router.get('/genres', publicCache, mediaController.getGenres);
router.get('/countries', publicCache, mediaController.getCountries);
router.get('/languages', publicCache, mediaController.getLanguages);
router.get('/keywords', publicCache, mediaController.getKeywords);
router.get('/search', publicCache, mediaController.searchMedia);
router.get('/trending-searches', publicCache, mediaController.trendingSearches);
router.post('/search/track', mediaController.trackSearch);
router.get('/slug/:slug', publicCache, optionalAuth, mediaController.getMediaBySlug);
router.get('/:id', publicCache, optionalAuth, mediaController.getMediaById);
router.post('/:id/view', mediaController.incrementViewCount);

router.use(authenticate);
router.get('/source/:id', mediaController.getWatchSource);
router.post('/', authorize('ADMIN', 'MODERATOR'), mediaController.createMedia);
router.patch('/:id', authorize('ADMIN', 'MODERATOR'), mediaController.updateMedia);
router.delete('/:id', authorize('ADMIN'), mediaController.deleteMedia);

export default router;
