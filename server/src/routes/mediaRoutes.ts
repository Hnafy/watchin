import { Router } from 'express';
import { mediaController } from '../controllers/mediaController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, mediaController.getMediaList);
router.get('/browse', mediaController.searchAndFilter);
router.get('/latest', mediaController.getLatestMedia);
router.get('/upcoming', mediaController.getUpcoming);
router.get('/popular', mediaController.getPopular);
router.get('/genre/:genreSlug', mediaController.getByGenre);
router.get('/recommended', optionalAuth, mediaController.getRecommended);
router.get('/recently-watched', optionalAuth, mediaController.getRecentlyWatched);
router.get('/trending', mediaController.getTrending);
router.get('/top-rated', mediaController.getTopRated);
router.get('/genres', mediaController.getGenres);
router.get('/countries', mediaController.getCountries);
router.get('/languages', mediaController.getLanguages);
router.get('/keywords', mediaController.getKeywords);
router.get('/search', mediaController.searchMedia);
router.get('/suggest', mediaController.suggest);
router.get('/trending-searches', mediaController.trendingSearches);
router.post('/search/track', mediaController.trackSearch);
router.get('/people/search', mediaController.searchPeople);
router.get('/slug/:slug', optionalAuth, mediaController.getMediaBySlug);
router.get('/:id', optionalAuth, mediaController.getMediaById);
router.post('/:id/view', mediaController.incrementViewCount);

router.use(authenticate);
router.post('/', authorize('ADMIN', 'MODERATOR'), mediaController.createMedia);
router.patch('/:id', authorize('ADMIN', 'MODERATOR'), mediaController.updateMedia);
router.delete('/:id', authorize('ADMIN'), mediaController.deleteMedia);

export default router;
