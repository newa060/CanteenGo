import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../constants';
import { handleError, showErrorToast } from './errorHandler';

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
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'your-cloudinary-cloud-name') {
      return {
        secure_url: imageUri,
        public_id: `local_${Date.now()}`,
      };
    }
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return {
        secure_url: imageUri,
        public_id: `local_${Date.now()}`,
      };
    }

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || `upload_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1].toLowerCase().replace('jpg', 'jpeg')}` : 'image/jpeg';

    if (typeof document !== 'undefined') {
      // Running on web
      const fetchResponse = await fetch(imageUri);
      const blob = await fetchResponse.blob();
      const file = new File([blob], filename, { type: mimeType });
      formData.append('file', file);
    } else {
      // Running on native (iOS / Android)
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      } as any);
    }

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

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${baseUrl}/image/upload`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              secure_url: data.secure_url,
              public_id: data.public_id,
              width: data.width,
              height: data.height,
              format: data.format,
              bytes: data.bytes,
            });
          } catch (err) {
            showErrorToast('Failed to parse Cloudinary upload response');
            reject(err);
          }
        } else {
          let errMsg = `Cloudinary upload failed (HTTP ${xhr.status})`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            if (errorData.error?.message) {
              errMsg = errorData.error.message;
            }
          } catch (e) {}
          console.error('Cloudinary upload error response:', xhr.responseText);
          showErrorToast(errMsg);
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = (e) => {
        console.error('Cloudinary upload XHR exception:', e);
        const errMsg = 'Network error while uploading image to Cloudinary';
        showErrorToast(errMsg);
        reject(new Error(errMsg));
      };

      xhr.send(formData);
    });
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
