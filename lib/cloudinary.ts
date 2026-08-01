import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../constants';
import { handleError } from './errorHandler';

export interface CloudinaryUploadOptions {
  folder?: string;
  tags?: string[];
  public_id?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

const getBaseUrl = () => {
  if (!CLOUDINARY_CLOUD_NAME) return null;
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;
};

export const optimizeImageUrl = (
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'auto' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'limit';
  }
): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  try {
    const { width, height, quality = 80, format = 'auto', crop = 'fill' } = options || {};

    let transformations: string[] = [];

    if (width || height) {
      transformations.push(`c_${crop}`);
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
    }

    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);

    const transformStr = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformStr}/`);
  } catch {
    return url;
  }
};

export const getThumbnailUrl = (url: string, size: number = 200): string => {
  return optimizeImageUrl(url, { width: size, height: size, crop: 'fill', quality: 70 });
};

export const cloudinaryService = {
  async uploadImage(imageUri: string, options: CloudinaryUploadOptions = {}): Promise<CloudinaryUploadResult> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      handleError(new Error('Cloudinary cloud name not configured'));
      throw new Error('Cloudinary not configured');
    }

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || `upload_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    if (CLOUDINARY_UPLOAD_PRESET) {
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    }

    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }
    if (options.public_id) {
      formData.append('public_id', options.public_id);
    }

    try {
      const response = await fetch(`${baseUrl}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
        bytes: data.bytes,
      };
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async deleteImage(publicId: string): Promise<void> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      handleError(new Error('Cloudinary cloud name not configured'));
      throw new Error('Cloudinary not configured');
    }

    try {
      await fetch(`${baseUrl}/image/destroy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
        }),
      });
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  async replaceImage(
    oldPublicId: string | undefined,
    newImageUri: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const result = await this.uploadImage(newImageUri, options);

    if (oldPublicId) {
      try {
        await this.deleteImage(oldPublicId);
      } catch (e) {
        console.warn('Failed to delete old image from Cloudinary:', e);
      }
    }

    return result;
  },

  extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      const uploadMatch = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (uploadMatch && uploadMatch[1]) {
        return uploadMatch[1];
      }
      return null;
    } catch {
      return null;
    }
  },

  optimizeImageUrl,
  getThumbnailUrl,
};
