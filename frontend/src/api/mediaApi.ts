import { api } from './client';
import { Media, MediaStats, Company, CompressionMethod } from '../types';

interface PaginatedResponse {
  success: boolean;
  data: Media[];
  total: number;
  page: number;
  totalPages: number;
}

export const mediaApi = {
  getAll: async (params?: {
    companyId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse> => {
    const { data } = await api.get('/media', { params });
    return data;
  },

  getById: async (id: number): Promise<Media> => {
    const { data } = await api.get(`/media/${id}`);
    return data.data;
  },

  getStats: async (companyId?: number): Promise<MediaStats> => {
    const { data } = await api.get('/media/stats', { params: { companyId } });
    return data.data;
  },

  
  getCompanies: async (): Promise<Company[]> => {
    const { data } = await api.get('/media/companies');
    return data.data;
  },

  upload: async (
    files: File[],
    companyName: string,
    compressionEnabled: boolean,
    compressionMethod: CompressionMethod,
    fileCompressionMethods: Record<string, CompressionMethod>,
    onProgress?: (progress: number) => void
  ): Promise<Media[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('companyName', companyName);
    formData.append('compressionEnabled', String(compressionEnabled));
    formData.append('compressionMethod', compressionMethod);
    formData.append('fileCompressionMethods', JSON.stringify(fileCompressionMethods));

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/media/${id}`);
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    await api.post('/media/bulk-delete', { ids });
  },

  editImage: async (
    id: number,
    operations: {
      crop?: { left: number; top: number; width: number; height: number };
      rotate?: number;
      flip?: boolean;
      flop?: boolean;
      resize?: { width: number; height: number };
    }
  ): Promise<Media> => {
    const { data } = await api.put(`/media/${id}/edit`, operations);
    return data.data;
  },

  recompress: async (id: number, method: CompressionMethod): Promise<void> => {
    await api.put(`/media/${id}/recompress`, { compressionMethod: method });
  },

  useOriginal: async (id: number): Promise<void> => {
    await api.put(`/media/${id}/use-original`);
  },

  retry: async (id: number): Promise<void> => {
    await api.post(`/upload/${id}/retry`);
  },

  updateFileName: async (id: number, fileName: string): Promise<Media> => {
    const { data } = await api.put(`/media/${id}/filename`, { fileName });
    return data.data;
  },
};
