import { SiteSetting } from '../db/models.js';
import { config } from '../config/index.js';

export interface CommentSettings {
  enabled: boolean;
  aiModeration: boolean;
  profanityFilter: boolean;
  requireVerifiedEmail: boolean;
  reportThreshold: number;
  maxLength: number;
}

const GROUP = 'comments';

function defaults(): CommentSettings {
  return {
    enabled: config.comments.defaultEnabled,
    aiModeration: config.comments.defaultAiModeration,
    profanityFilter: config.comments.defaultProfanityFilter,
    requireVerifiedEmail: config.comments.defaultRequireVerifiedEmail,
    reportThreshold: config.comments.defaultReportThreshold,
    maxLength: config.comments.defaultMaxLength,
  };
}

export const commentSettingsService = {
  /** Reads persisted settings, falling back to defaults for anything unset. */
  async get(): Promise<CommentSettings> {
    const rows = await SiteSetting.find({ group: GROUP }).lean();
    const out = defaults();
    for (const row of rows) {
      const key = row.key.split('.').pop();
      if (key && key in out) {
        (out as any)[key] = row.value;
      }
    }
    return out;
  },

  async update(key: string, value: any): Promise<CommentSettings> {
    const allowed = Object.keys(defaults());
    if (!allowed.includes(key)) throw new Error('Invalid comment setting key');

    let finalValue: any = value;
    if (key === 'reportThreshold' || key === 'maxLength') {
      finalValue = Math.max(1, parseInt(String(value), 10) || 1);
    } else {
      finalValue = Boolean(value);
    }

    await SiteSetting.findOneAndUpdate(
      { key: `comments.${key}`, group: GROUP },
      { $set: { value: finalValue, label: key }, $setOnInsert: { key: `comments.${key}`, group: GROUP } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return this.get();
  },

  /** Public subset shared with the client (no admin-only flags). */
  async getPublicConfig() {
    const settings = await this.get();
    return {
      enabled: settings.enabled,
      maxLength: settings.maxLength,
      requireVerifiedEmail: settings.requireVerifiedEmail,
    };
  },
};
