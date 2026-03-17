import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { LuCloudUpload, LuImage, LuVideo } from 'react-icons/lu';

const ACCEPTED = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
};

interface Props {
  onFilesSelected: (files: File[]) => void;
}

export default function DropZone({ onFilesSelected }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onFilesSelected(accepted);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 100 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all ${
        isDragActive
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
        <LuCloudUpload className="h-8 w-8 text-indigo-600" />
      </div>
      <p className="text-lg font-semibold text-gray-700">
        {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
      </p>
      <p className="mt-1 text-sm text-gray-500">or click to browse files</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          <LuImage className="h-3 w-3" /> PNG, JPG, JPEG, WebP, HEIC, GIF
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
          <LuVideo className="h-3 w-3" /> MP4, MOV
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-400">Max 100MB per file</p>
    </div>
  );
}
