import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

// Stats & Analytics
router.get('/stats', adminController.getDashboardStats);
router.get('/analytics/views', adminController.getViewsChart);
router.get('/ads/stats', adminController.getAdsStats);

// All Media Management
router.get('/media/all', adminController.getAllMedia);
router.get('/media/:id/analytics', adminController.getMediaAnalytics);
router.delete('/media/:id', adminController.deleteMedia);

// Direct Media Edit (for editing actual Media records)
router.get('/media-edit/:id', adminController.getMediaForEdit);
router.put('/media-edit/:id', adminController.updateMediaRecord);

// Pending Media
router.get('/media/pending', adminController.getPendingMedia);
router.get('/media/:id', adminController.getMediaDetail);
router.post('/media', adminController.createMedia);
router.patch('/media/:id', adminController.updateMedia);
router.post('/media/:id/approve', adminController.approveMedia);
router.post('/media/:id/reject', adminController.rejectMedia);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Series Management (direct creation with seasons/episodes)
router.post('/series', adminController.createSeries);

// Site Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSetting);

export default router;
