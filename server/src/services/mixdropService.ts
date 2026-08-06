import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

export interface MixdropUploadResult {
  fileref: string;
  url: string;
  embedurl: string;
}

export interface MixdropUploadResponse {
  success: boolean;
  result?: MixdropUploadResult;
  msg?: string;
}

export const mixdropService = {
  /** Forwards a raw video file (Buffer) to Mixdrop and returns the upload result. */
  async uploadFile(fileBuffer: Buffer, filename: string): Promise<MixdropUploadResult> {
    if (!config.mixdrop.email || !config.mixdrop.key) {
      throw AppError.badRequest('Mixdrop API credentials are not configured');
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      throw AppError.badRequest('No file received');
    }

    const form = new FormData();
    form.append('email', config.mixdrop.email);
    form.append('key', config.mixdrop.key);
    form.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), filename);

    let res: Response;
    try {
      res = await fetch(config.mixdrop.uploadUrl, { method: 'POST', body: form });
    } catch {
      throw AppError.badGateway('Failed to reach Mixdrop upload service');
    }

    let data: MixdropUploadResponse;
    try {
      data = (await res.json()) as MixdropUploadResponse;
    } catch {
      throw AppError.badGateway(`Mixdrop returned an invalid response (${res.status})`);
    }

    if (!data.success || !data.result) {
      throw AppError.badGateway(data.msg || 'Mixdrop upload failed');
    }

    return data.result;
  },
};
