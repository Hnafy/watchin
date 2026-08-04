import { Request, Response, NextFunction } from 'express';
import { SiteSetting, AdEvent } from '../db/models.js';
import { AD_ZONES, AD_GROUP } from '../config/ads.js';
import crypto from 'crypto';

export const adsController = {
  /**
   * Public — returns every ad zone with its enabled state so the client can
   * mount AdSlots without admin credentials.
   */
  async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SiteSetting.find({ group: AD_GROUP });
      const overrides: Record<string, boolean> = {};
      for (const s of settings) {
        const key = s.key;
        if (key?.startsWith('ad_zone.')) {
          overrides[key.replace('ad_zone.', '')] = s.value === true;
        }
      }

      const zones = AD_ZONES.map((zone) => ({
        ...zone,
        enabled: overrides[zone.id] ?? zone.defaultEnabled,
      }));

      res.json({ status: 'success', data: zones });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Public — lightweight fire-and-forget analytics beacon for ad impressions
   * and clicks. Never blocks the ad render; failures are swallowed.
   */
  async track(req: Request, res: Response, next: NextFunction) {
    try {
      const { zone, type, page } = req.body ?? {};
      const validZone = AD_ZONES.some((z) => z.id === zone);
      const validType = type === 'IMPRESSION' || type === 'CLICK';
      if (!validZone || !validType) {
        return res.status(400).json({ status: 'error', message: 'Invalid ad event' });
      }

      const ipHash = req.ip
        ? crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 16)
        : null;

      await AdEvent.create({
        zone,
        type,
        userId: (req as any).user?.id ?? null,
        ipHash,
        page: typeof page === 'string' ? page.slice(0, 200) : null,
      });

      res.json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  },
};
