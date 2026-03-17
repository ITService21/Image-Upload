export interface Company {
  id: number;
  company_name: string;
  slug: string;
  created_at: string;
}

export interface Media {
  id: number;
  company_id: number;
  file_name: string;
  original_name: string;
  file_type: 'image' | 'video';
  mime_type: string;
  file_size: number;
  compressed_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_path: string;
  compressed_path: string | null;
  thumbnail_path: string | null;
  public_url: string;
  is_compressed: boolean;
  compression_ratio: number | null;
  compression_method: CompressionMethod;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
  company_slug?: string;
}

export type CompressionMethod = 'sharp' | 'imagemin' | 'squoosh' | 'imagemagick';

export interface MediaStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface UploadFileItem {
  file: File;
  id: string;
  preview: string;
  fileName: string;
  compressionMethod: CompressionMethod;
  compressionEnabled: boolean;
}

export type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';
