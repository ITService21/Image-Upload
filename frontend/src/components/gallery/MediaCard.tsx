import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LuTrash2, LuPencil, LuCopy, LuCheck, LuLoaderCircle, LuCircleX, LuRotateCw, LuCircleCheck } from 'react-icons/lu';
import { Media } from '../../types';
import { RootState } from '../../store';
import { toggleSelect } from '../../store/mediaSlice';
import { formatFileSize, formatDate, getMediaUrl, isImage } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';
import ConfirmModal from '../common/ConfirmModal';
import { useDeleteMedia, useRetry } from '../../hooks/useMedia';
import toast from 'react-hot-toast';

interface Props {
  media: Media;
  onEdit: (media: Media) => void;
}

export default function MediaCard({ media, onEdit }: Props) {
  const dispatch = useDispatch();
  const selectedIds = useSelector((state: RootState) => state.media.selectedIds);
  const isSelected = selectedIds.includes(media.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const deleteMutation = useDeleteMedia();
  const retryMutation = useRetry();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(media.public_url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(media.id);
    setConfirmDelete(false);
  };

  const thumbnailSrc = media.thumbnail_path
    ? getMediaUrl(media.id, 'thumbnail')
    : media.status === 'completed' && isImage(media.mime_type)
    ? getMediaUrl(media.id, 'compressed')
    : '';

  return (
    <>
      <div className={`card group relative overflow-hidden transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
        {/* Checkbox */}
        <div className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => dispatch(toggleSelect(media.id))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Thumbnail */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {media.status === 'pending' || media.status === 'processing' ? (
            <div className="flex h-full items-center justify-center">
              <LuLoaderCircle className="h-10 w-10 animate-spin text-indigo-400" />
            </div>
          ) : media.status === 'failed' ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <LuCircleX className="h-10 w-10 text-red-400" />
              <button
                onClick={() => retryMutation.mutate(media.id)}
                className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <LuRotateCw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : thumbnailSrc && !imgError ? (
            <img
              src={thumbnailSrc + '?t=' + Date.now()}
              alt={media.original_name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : !isImage(media.mime_type) ? (
            <div className="flex h-full items-center justify-center bg-purple-50">
              <span className="text-2xl font-bold text-purple-300">
                {media.mime_type.split('/')[1]?.toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-gray-400">No preview</span>
            </div>
          )}

          {/* Status overlay */}
          {media.status === 'completed' && (
            <div className="absolute right-2 top-2">
              <LuCircleCheck className="h-5 w-5 text-emerald-500 drop-shadow" />
            </div>
          )}

          {/* Action buttons on hover */}
          <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-2 opacity-0 transition-opacity group-hover:opacity-100">
            {isImage(media.mime_type) && media.status === 'completed' && (
              <button
                onClick={() => onEdit(media)}
                className="rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:bg-white"
                title="Edit"
              >
                <LuPencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm hover:bg-white"
              title="Copy Link"
            >
              {copied ? <LuCheck className="h-3.5 w-3.5 text-green-600" /> : <LuCopy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm hover:bg-white"
              title="Delete"
            >
              <LuTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="truncate text-sm font-medium text-gray-900" title={media.original_name}>
            {media.original_name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{media.company_name}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">{formatFileSize(media.file_size)}</span>
            {media.is_compressed && media.compression_ratio != null && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                -{media.compression_ratio.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <StatusBadge status={media.status} onRetry={media.status === 'failed' ? () => retryMutation.mutate(media.id) : undefined} />
            <span className="text-xs text-gray-400">{formatDate(media.created_at)}</span>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Media"
        message={`Are you sure you want to permanently delete "${media.original_name}"? This will remove the file from storage and database. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        danger
      />
    </>
  );
}
