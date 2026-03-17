export interface Company {
  id: number;
  company_name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

export interface Media {
  id: number;
  company_id: number;
  file_name: string;
  original_name: string;
  file_type: string;
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
  compression_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string;
  company_slug?: string;
}

export interface UploadSession {
  id: number;
  company_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_files: number;
  processed_files: number;
  created_at: Date;
  updated_at: Date;
}

export type CompressionMethod = 'sharp' | 'imagemin' | 'squoosh' | 'imagemagick';

export interface UploadRequest {
  companyName: string;
  compressionEnabled: boolean;
  compressionMethod: CompressionMethod;
  fileCompressionMethods?: Record<string, CompressionMethod>;
}

export interface MediaStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
